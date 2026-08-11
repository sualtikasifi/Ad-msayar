import { Tabs } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

function TabIcon({ emoji, focused, label }: { emoji: string; focused: boolean; label: string }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: colors.primaryLight }]}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
      <Text
        style={[
          styles.label,
          { color: focused ? colors.primary : colors.textMuted, opacity: focused || !isDark ? 1 : 0.8 },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: isDark ? 0 : 1,
          borderTopColor: colors.border,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👟" focused={focused} label="Ev" />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Arkadaşlar',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} label="Arkadaşlar" />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Sıralama',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} label="Sıralama" />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'İstatistik',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📈" focused={focused} label="İstatistik" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 2,
    width: '100%',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});
