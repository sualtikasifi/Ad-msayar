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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 40;

type ChartPeriod = 'week' | 'month' | '12weeks';

// ─── Kendi basit bar chart bileşenimiz (victory-native olmadan) ────────────

function BarChart({
  data,
  labels,
  color = '#6C63FF',
  goal,
}: {
  data: number[];
  labels: string[];
  color?: string;
  goal?: number;
}) {
  const max = Math.max(...data, goal ?? 0, 1);
  const barWidth = Math.floor((CHART_WIDTH - 32) / data.length) - 3;

  return (
    <View style={barStyles.container}>
      {/* Y-axis labels */}
      <View style={barStyles.chartArea}>
        {/* Goal line */}
        {goal && (
          <View
            style={[
              barStyles.goalLine,
              { bottom: `${(goal / max) * 100}%` as unknown as number },
            ]}
          />
        )}
        {/* Bars */}
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
                      backgroundColor: isToday ? color : color + 'BB',
                      borderRadius: barWidth > 10 ? 4 : 2,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>
      {/* X-axis labels — show every Nth */}
      <View style={barStyles.xLabels}>
        {labels.map((label, i) => {
          const showEvery = data.length <= 7 ? 1 : data.length <= 14 ? 2 : 5;
          if (i % showEvery !== 0 && i !== labels.length - 1) {
            return <View key={i} style={{ flex: 1 }} />;
          }
          return (
            <Text key={i} style={[barStyles.xLabel, { width: barWidth + 3 }]} numberOfLines={1}>
              {label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: { width: CHART_WIDTH, height: 180 },
  chartArea: { flex: 1, position: 'relative', paddingHorizontal: 0 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: '100%', gap: 3 },
  barWrapper: { alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%' },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: '#EF4444',
    zIndex: 10,
  },
  xLabels: { flexDirection: 'row', marginTop: 4, gap: 3 },
  xLabel: { fontSize: 9, color: '#9CA3AF', textAlign: 'center', overflow: 'hidden' },
});

// ─── Heatmap ───────────────────────────────────────────────────────────────

const INTENSITY_COLORS = ['#F3F4F6', '#C4BFFF', '#9D95FF', '#7B72FF', '#6C63FF'];
const DAY_LABELS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

function MonthHeatmap({ points, year, month }: { points: HeatmapPoint[]; year: number; month: number }) {
  const pointMap = new Map(points.map((p) => [p.date, p]));

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  // ISO week: Monday=0
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: (HeatmapPoint | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push(pointMap.get(dateStr) ?? { date: dateStr, steps: 0, intensity: 0 });
  }

  const cellSize = Math.floor((CHART_WIDTH - 16 - 6 * 4) / 7);

  return (
    <View>
      {/* Day headers */}
      <View style={heatStyles.row}>
        {DAY_LABELS.map((d) => (
          <Text key={d} style={[heatStyles.dayLabel, { width: cellSize }]}>{d}</Text>
        ))}
      </View>
      {/* Grid */}
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
                  backgroundColor: cell ? INTENSITY_COLORS[cell.intensity] : 'transparent',
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
  dayLabel: { fontSize: 10, color: '#9CA3AF', textAlign: 'center' },
  cell: { borderRadius: 4 },
});

// ─── Record Card ───────────────────────────────────────────────────────────

function RecordCard({ label, value, sub, color = '#6C63FF' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={[recStyles.card, { borderTopColor: color }]}>
      <Text style={[recStyles.value, { color }]}>{value}</Text>
      <Text style={recStyles.label}>{label}</Text>
      {sub && <Text style={recStyles.sub}>{sub}</Text>}
    </View>
  );
}

const recStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  value: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  sub:   { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
});

// ─── Main Stats Screen ─────────────────────────────────────────────────────

const MONTHS_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

function formatShortDate(dateStr: string, period: ChartPeriod): string {
  const d = new Date(dateStr);
  if (period === 'week') return ['Pt','Sa','Ça','Pe','Cu','Ct','Pz'][(d.getDay() + 6) % 7];
  if (period === 'month') return String(d.getDate());
  return `H${Math.ceil((d.getDate() + (new Date(d.getFullYear(), d.getMonth(), 1).getDay() + 6) % 7) / 7)}`;
}

export default function StatsScreen() {
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

  // Build chart values and labels
  const isDailyData = period !== '12weeks';
  const values = isDailyData
    ? (chartData as DailyPoint[]).map((d) => d.steps)
    : (chartData as WeeklyPoint[]).map((w) => w.total_steps);
  const labels = isDailyData
    ? (chartData as DailyPoint[]).map((d) => formatShortDate(d.date, period))
    : (chartData as WeeklyPoint[]).map((_, i) => `H${i + 1}`);

  const totalInPeriod = values.reduce((s, v) => s + v, 0);
  const avgInPeriod = values.length > 0 ? Math.round(totalInPeriod / values.filter(v => v > 0).length || 1) : 0;

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
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />}
      >
        <Text style={styles.title}>İstatistikler</Text>

        {/* ── Kişisel Rekörler ── */}
        {records && (
          <>
            <Text style={styles.sectionTitle}>🏅 Kişisel Rekörler</Text>
            <View style={styles.recordsGrid}>
              <RecordCard
                label="Günlük Rekör"
                value={records.best_day_steps.toLocaleString()}
                sub={records.best_day_date ?? undefined}
                color="#6C63FF"
              />
              <RecordCard
                label="Mevcut Seri"
                value={`${records.current_streak} gün`}
                color="#EF4444"
              />
            </View>
            <View style={[styles.recordsGrid, { marginTop: 8 }]}>
              <RecordCard
                label="En Uzun Seri"
                value={`${records.longest_streak} gün`}
                color="#F59E0B"
              />
              <RecordCard
                label="30 Günlük Ort."
                value={records.avg_daily_steps_30d.toLocaleString()}
                sub="adım/gün"
                color="#10B981"
              />
            </View>
            <View style={[styles.recordsGrid, { marginTop: 8 }]}>
              <RecordCard
                label="Toplam Adım"
                value={records.total_steps_all_time >= 1000
                  ? `${(records.total_steps_all_time / 1000).toFixed(1)}B`
                  : String(records.total_steps_all_time)}
                sub="tüm zamanlar"
                color="#8B5CF6"
              />
              <RecordCard
                label="Aktif Gün"
                value={String(records.active_days_total)}
                sub="toplam"
                color="#3B82F6"
              />
            </View>
          </>
        )}

        {/* ── Adım Grafiği ── */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>📊 Adım Grafiği</Text>
        <View style={styles.periodToggle}>
          {(['week','month','12weeks'] as ChartPeriod[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.activePeriodBtn]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.activePeriodText]}>
                {p === 'week' ? '7 Gün' : p === 'month' ? '30 Gün' : '12 Hafta'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartMeta}>
            <View>
              <Text style={styles.chartTotal}>{totalInPeriod.toLocaleString()}</Text>
              <Text style={styles.chartTotalLabel}>
                {period === '12weeks' ? 'toplam adım (12 hafta)' : `toplam adım (${period === 'week' ? '7' : '30'} gün)`}
              </Text>
            </View>
            <View style={styles.chartAvg}>
              <Text style={styles.chartAvgValue}>{avgInPeriod.toLocaleString()}</Text>
              <Text style={styles.chartAvgLabel}>günlük ort.</Text>
            </View>
          </View>

          {values.length > 0 ? (
            <BarChart
              data={values}
              labels={labels}
              color="#6C63FF"
              goal={10000}
            />
          ) : (
            <View style={styles.noData}>
              <Text style={styles.noDataText}>Henüz veri yok</Text>
            </View>
          )}

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#6C63FF' }]} />
              <Text style={styles.legendLabel}>Adım</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendLabel}>10.000 hedef</Text>
            </View>
          </View>
        </View>

        {/* ── Aylık Heatmap ── */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>📅 Aktivite Haritası</Text>
        <View style={styles.chartCard}>
          <View style={styles.heatmapNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Text style={styles.navBtnText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.heatmapMonth}>
              {MONTHS_TR[heatMonth - 1]} {heatYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Text style={styles.navBtnText}>›</Text>
            </TouchableOpacity>
          </View>

          <MonthHeatmap points={heatmap} year={heatYear} month={heatMonth} />

          <View style={styles.heatmapLegend}>
            <Text style={styles.legendLabel}>Az</Text>
            {INTENSITY_COLORS.map((c, i) => (
              <View key={i} style={[styles.heatLegendCell, { backgroundColor: c }]} />
            ))}
            <Text style={styles.legendLabel}>Çok</Text>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF' },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  recordsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  periodToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#E8E6FF',
    borderRadius: 12,
    padding: 3,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  activePeriodBtn: { backgroundColor: '#FFFFFF' },
  periodText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  activePeriodText: { color: '#6C63FF' },
  chartCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chartMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  chartTotal: { fontSize: 26, fontWeight: '800', color: '#6C63FF' },
  chartTotalLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  chartAvg: { alignItems: 'flex-end' },
  chartAvgValue: { fontSize: 18, fontWeight: '700', color: '#374151' },
  chartAvgLabel: { fontSize: 11, color: '#9CA3AF' },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: '#9CA3AF' },
  noData: { height: 150, justifyContent: 'center', alignItems: 'center' },
  noDataText: { color: '#9CA3AF', fontSize: 14 },
  heatmapNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navBtn: { padding: 6 },
  navBtnText: { fontSize: 22, color: '#6C63FF', fontWeight: '700' },
  heatmapMonth: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  heatLegendCell: { width: 12, height: 12, borderRadius: 2 },
});
