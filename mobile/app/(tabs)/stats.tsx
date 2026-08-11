import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as statsApi from '@/api/stats';
import type { DailyPoint, WeeklyPoint, PersonalRecords, HeatmapPoint } from '@/api/stats';
import { AppHeader } from '@/components/AppHeader';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useTheme, ThemeColors } from '@/context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 40;

type ChartPeriod = 'week' | 'month' | '12weeks';

// ─── Kendi basit bar chart bileşenimiz (victory-native olmadan) ────────────

function BarChart({
  data,
  labels,
  colors,
}: {
  data: number[];
  labels: string[];
  colors: ThemeColors;
}) {
  const max = Math.max(...data, 1);
  const barWidth = Math.floor((CHART_WIDTH - 32) / data.length) - 3;

  return (
    <View style={barStyles.container}>
      <View style={barStyles.chartArea}>
        <View style={barStyles.bars}>
          {data.map((val, i) => {
            const heightPct = max > 0 ? (val / max) * 100 : 0;
            const isToday = i === data.length - 1;
            return (
              <View key={i} style={[barStyles.barWrapper, { width: barWidth }]}>
                <View
                  style={[
                    barStyles.bar,
                    {
                      height: `${Math.max(heightPct, 2)}%` as unknown as number,
                      backgroundColor: isToday ? colors.primary : colors.cardAlt,
                      borderRadius: barWidth > 10 ? 4 : 2,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>
      <View style={barStyles.xLabels}>
        {labels.map((label, i) => {
          const showEvery = data.length <= 7 ? 1 : data.length <= 14 ? 2 : 5;
          if (i % showEvery !== 0 && i !== labels.length - 1) {
            return <View key={i} style={{ flex: 1 }} />;
          }
          return (
            <Text key={i} style={[barStyles.xLabel, { width: barWidth + 3, color: colors.textMuted }]} numberOfLines={1}>
              {label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: { width: CHART_WIDTH, height: 160 },
  chartArea: { flex: 1, position: 'relative', paddingHorizontal: 0 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: '100%', gap: 3 },
  barWrapper: { alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%' },
  xLabels: { flexDirection: 'row', marginTop: 8, gap: 3 },
  xLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center', overflow: 'hidden' },
});

// ─── Heatmap ───────────────────────────────────────────────────────────────

const DAY_LABELS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

function getIntensityColors(colors: ThemeColors): string[] {
  return [colors.cardAlt, colors.primaryLight, colors.primary + '88', colors.primary + 'CC', colors.primary];
}

function MonthHeatmap({ points, year, month, colors }: { points: HeatmapPoint[]; year: number; month: number; colors: ThemeColors }) {
  const pointMap = new Map(points.map((p) => [p.date, p]));
  const intensityColors = getIntensityColors(colors);

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: (HeatmapPoint | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push(pointMap.get(dateStr) ?? { date: dateStr, steps: 0, intensity: 0 });
  }

  const cellSize = Math.floor((CHART_WIDTH - 16 - 6 * 4) / 7);

  return (
    <View>
      <View style={heatStyles.row}>
        {DAY_LABELS.map((d) => (
          <Text key={d} style={[heatStyles.dayLabel, { width: cellSize, color: colors.textMuted }]}>{d}</Text>
        ))}
      </View>
      {Array.from({ length: Math.ceil(cells.length / 7) }).map((_, week) => (
        <View key={week} style={heatStyles.row}>
          {cells.slice(week * 7, week * 7 + 7).map((cell, di) => (
            <View
              key={di}
              style={[
                heatStyles.cell,
                {
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: cell ? intensityColors[cell.intensity] : 'transparent',
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const heatStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  dayLabel: { fontSize: 10, textAlign: 'center' },
  cell: { borderRadius: 4 },
});

// ─── Record Card ───────────────────────────────────────────────────────────

function RecordCard({
  icon,
  label,
  value,
  sub,
  iconBg,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  iconBg: string;
  colors: ThemeColors;
}) {
  return (
    <View style={[recStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[recStyles.iconCircle, { backgroundColor: iconBg }]}>
        <Text style={recStyles.iconText}>{icon}</Text>
      </View>
      <Text style={[recStyles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[recStyles.value, { color: colors.text }]}>{value}</Text>
      {sub && <Text style={[recStyles.sub, { color: colors.textMuted }]}>{sub}</Text>}
    </View>
  );
}

const recStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  iconText: { fontSize: 16 },
  value: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 12, marginTop: 2 },
  sub: { fontSize: 10, marginTop: 1 },
});

// ─── Main Stats Screen ─────────────────────────────────────────────────────

const MONTHS_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const PERIOD_LABELS: Record<ChartPeriod, string> = { week: 'Bu Hafta', month: 'Bu Ay', '12weeks': 'Son 12 Hafta' };

function formatShortDate(dateStr: string, period: ChartPeriod): string {
  const d = new Date(dateStr);
  if (period === 'week') return ['Pt','Sa','Ça','Pe','Cu','Ct','Pz'][(d.getDay() + 6) % 7];
  if (period === 'month') return String(d.getDate());
  return `H${Math.ceil((d.getDate() + (new Date(d.getFullYear(), d.getMonth(), 1).getDay() + 6) % 7) / 7)}`;
}

export default function StatsScreen() {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<ChartPeriod>('week');
  const [chartData, setChartData] = useState<DailyPoint[] | WeeklyPoint[]>([]);
  const [records, setRecords] = useState<PersonalRecords | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([]);
  const [heatYear, setHeatYear] = useState(new Date().getFullYear());
  const [heatMonth, setHeatMonth] = useState(new Date().getMonth() + 1);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    const [recs, heat] = await Promise.all([
      statsApi.getPersonalRecords(),
      statsApi.getHeatmap(heatYear, heatMonth),
    ]);
    setRecords(recs);
    setHeatmap(heat);
  }, [heatYear, heatMonth]);

  const loadChartData = useCallback(async () => {
    if (period === 'week') {
      setChartData(await statsApi.getWeeklyStats());
    } else if (period === 'month') {
      setChartData(await statsApi.getMonthlyStats());
    } else {
      setChartData(await statsApi.get12WeeksStats());
    }
  }, [period]);

  useEffect(() => { loadChartData().catch(console.error); }, [loadChartData]);
  useEffect(() => { loadStats().catch(console.error); }, [loadStats]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadChartData(), loadStats()]).catch(console.error);
    setRefreshing(false);
  }

  const isDailyData = period !== '12weeks';
  const values = isDailyData
    ? (chartData as DailyPoint[]).map((d) => d.steps)
    : (chartData as WeeklyPoint[]).map((w) => w.total_steps);
  const labels = isDailyData
    ? (chartData as DailyPoint[]).map((d) => formatShortDate(d.date, period))
    : (chartData as WeeklyPoint[]).map((_, i) => `H${i + 1}`);

  const totalInPeriod = values.reduce((s, v) => s + v, 0);
  const activeDays = values.filter(v => v > 0).length;
  const avgInPeriod = activeDays > 0 ? Math.round(totalInPeriod / activeDays) : 0;

  function prevMonth() {
    if (heatMonth === 1) { setHeatYear(y => y - 1); setHeatMonth(12); }
    else setHeatMonth(m => m - 1);
  }
  function nextMonth() {
    const now = new Date();
    if (heatYear === now.getFullYear() && heatMonth === now.getMonth() + 1) return;
    if (heatMonth === 12) { setHeatYear(y => y + 1); setHeatMonth(1); }
    else setHeatMonth(m => m + 1);
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        <AppHeader />
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <Text style={[styles.title, { color: colors.text }]}>İstatistiklerin</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Performans detayların ve gelişim sürecin.
          </Text>

          {/* ── Kişisel Rekörler ── */}
          {records && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>KİŞİSEL REKORLAR</Text>
              <View style={styles.recordsGrid}>
                <RecordCard
                  icon="🏃" iconBg={colors.primaryLight}
                  label="En Yüksek Gün" value={records.best_day_steps.toLocaleString('tr-TR')}
                  sub={records.best_day_date ?? undefined} colors={colors}
                />
                <RecordCard
                  icon="🔥" iconBg="rgba(239,68,68,0.18)"
                  label="En Uzun Seri" value={`${records.longest_streak} Gün`}
                  colors={colors}
                />
              </View>
              <View style={[styles.recordsGrid, { marginTop: 10 }]}>
                <RecordCard
                  icon="⚡" iconBg="rgba(245,158,11,0.18)"
                  label="Mevcut Seri" value={`${records.current_streak} Gün`}
                  colors={colors}
                />
                <RecordCard
                  icon="📊" iconBg="rgba(16,185,129,0.18)"
                  label="30 Günlük Ort." value={records.avg_daily_steps_30d.toLocaleString('tr-TR')} sub="adım/gün"
                  colors={colors}
                />
              </View>
              <View style={[styles.recordsGrid, { marginTop: 10 }]}>
                <RecordCard
                  icon="👟" iconBg="rgba(139,92,246,0.18)"
                  label="Toplam Adım"
                  value={records.total_steps_all_time >= 1000
                    ? `${(records.total_steps_all_time / 1000).toFixed(1)}B`
                    : String(records.total_steps_all_time)}
                  sub="tüm zamanlar" colors={colors}
                />
                <RecordCard
                  icon="✅" iconBg="rgba(59,130,246,0.18)"
                  label="Aktif Gün" value={String(records.active_days_total)} sub="toplam"
                  colors={colors}
                />
              </View>
            </>
          )}

          {/* ── Adım Grafiği ── */}
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 24 }]}>
            <View style={styles.chartCardHeader}>
              <Text style={[styles.chartCardTitle, { color: colors.text }]}>Haftalık Aktivite</Text>
              <TouchableOpacity
                onPress={() => setPeriod((p) => (p === 'week' ? 'month' : p === 'month' ? '12weeks' : 'week'))}
                style={[styles.periodPill, { backgroundColor: colors.primaryLight }]}
              >
                <Text style={[styles.periodPillText, { color: colors.primary }]}>{PERIOD_LABELS[period]}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.chartMeta}>
              <View>
                <Text style={[styles.chartTotal, { color: colors.primary }]}>{totalInPeriod.toLocaleString('tr-TR')}</Text>
                <Text style={[styles.chartTotalLabel, { color: colors.textMuted }]}>toplam adım</Text>
              </View>
              <View style={styles.chartAvg}>
                <Text style={[styles.chartAvgValue, { color: colors.textSecondary }]}>{avgInPeriod.toLocaleString('tr-TR')}</Text>
                <Text style={[styles.chartAvgLabel, { color: colors.textMuted }]}>günlük ort.</Text>
              </View>
            </View>

            {values.length > 0 ? (
              <BarChart data={values} labels={labels} colors={colors} />
            ) : (
              <View style={styles.noData}>
                <Text style={[styles.noDataText, { color: colors.textMuted }]}>Henüz veri yok</Text>
              </View>
            )}
          </View>

          {/* ── Aylık Heatmap ── */}
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
            <View style={styles.chartCardHeader}>
              <Text style={[styles.chartCardTitle, { color: colors.text }]}>Aktivite Haritası</Text>
              <Text style={[styles.chartCardHint, { color: colors.textMuted }]}>Son 3 Ay</Text>
            </View>

            <View style={styles.heatmapNav}>
              <TouchableOpacity
                onPress={prevMonth}
                style={styles.navBtn}
                accessibilityLabel="Önceki ay"
                accessibilityRole="button"
              >
                <Text style={[styles.navBtnText, { color: colors.primary }]}>‹</Text>
              </TouchableOpacity>
              <Text style={[styles.heatmapMonth, { color: colors.text }]}>
                {MONTHS_TR[heatMonth - 1]} {heatYear}
              </Text>
              <TouchableOpacity
                onPress={nextMonth}
                style={styles.navBtn}
                accessibilityLabel="Sonraki ay"
                accessibilityRole="button"
              >
                <Text style={[styles.navBtnText, { color: colors.primary }]}>›</Text>
              </TouchableOpacity>
            </View>

            <MonthHeatmap points={heatmap} year={heatYear} month={heatMonth} colors={colors} />

            <View style={styles.heatmapLegend}>
              <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Az</Text>
              {getIntensityColors(colors).map((c, i) => (
                <View key={i} style={[styles.heatLegendCell, { backgroundColor: c }]} />
              ))}
              <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Çok</Text>
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  subtitle: {
    fontSize: 13,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  recordsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  chartCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  chartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chartCardTitle: { fontSize: 16, fontWeight: '700' },
  chartCardHint: { fontSize: 12, fontWeight: '600' },
  periodPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  periodPillText: { fontSize: 12, fontWeight: '700' },
  chartMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  chartTotal: { fontSize: 24, fontWeight: '800' },
  chartTotalLabel: { fontSize: 11, marginTop: 2 },
  chartAvg: { alignItems: 'flex-end' },
  chartAvgValue: { fontSize: 17, fontWeight: '700' },
  chartAvgLabel: { fontSize: 11 },
  noData: { height: 140, justifyContent: 'center', alignItems: 'center' },
  noDataText: { fontSize: 14 },
  heatmapNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navBtn: { padding: 6 },
  navBtnText: { fontSize: 22, fontWeight: '700' },
  heatmapMonth: { fontSize: 15, fontWeight: '700' },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  legendLabel: { fontSize: 11 },
  heatLegendCell: { width: 12, height: 12, borderRadius: 2 },
});
