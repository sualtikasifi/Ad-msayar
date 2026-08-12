import { Tabs } from 'expo-router';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
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
      >
        {label}
      </Text>
    </View>
  );
}

// A full-width pressable per tab (React Navigation's default tabBarIcon slot
// can be narrower than the tab item itself, which was forcing longer labels
// like "Arkadaşlar"/"İstatistik" to wrap onto a second line no matter how
// small the font). This guarantees the label always has the full tab column
// to lay out in.
function TabButton({ children, style, onPress, onLongPress, accessibilityState, accessibilityLabel, testID }: BottomTabBarButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress ?? undefined}
      onLongPress={onLongPress ?? undefined}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[style as object, styles.tabButton]}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
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
        tabBarButton: (props) => <TabButton {...props} />,
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
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
});
