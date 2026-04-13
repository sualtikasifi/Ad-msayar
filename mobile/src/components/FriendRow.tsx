import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';

interface FriendRowProps {
  id: string;
  username: string;
  avatarUrl: string | null;
  todaySteps?: number;
  rightAction?: React.ReactNode;
  onPress?: () => void;
}

export function FriendRow({ username, avatarUrl, todaySteps, rightAction, onPress }: FriendRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Avatar username={username} avatarUrl={avatarUrl} size={44} />
      <View style={styles.info}>
        <Text style={styles.username}>{username}</Text>
        {todaySteps !== undefined && (
          <Text style={styles.steps}>{todaySteps.toLocaleString()} adım bugün</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  steps: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  action: {
    marginLeft: 8,
  },
});
