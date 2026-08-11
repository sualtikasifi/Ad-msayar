import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { useTheme } from '@/context/ThemeContext';

interface FriendRowProps {
  id: string;
  username: string;
  avatarId: number;
  todaySteps?: number;
  rightAction?: React.ReactNode;
  onPress?: () => void;
}

export function FriendRow({ username, avatarId, todaySteps, rightAction, onPress }: FriendRowProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Avatar avatarId={avatarId} size={44} />
      <View style={styles.info}>
        <Text style={[styles.username, { color: colors.text }]}>{username}</Text>
        {todaySteps !== undefined && (
          <Text style={[styles.steps, { color: colors.textMuted }]}>{todaySteps.toLocaleString('tr-TR')} adım bugün</Text>
        )}
      </View>
      {rightAction && <View style={styles.action}>{rightAction}</View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
  },
  steps: {
    fontSize: 13,
    marginTop: 2,
  },
  action: {
    marginLeft: 8,
  },
});
