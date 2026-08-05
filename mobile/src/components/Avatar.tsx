import React from 'react';
import { PresetAvatar } from '@/constants/avatars';

interface AvatarProps {
  avatarId: number;
  size?: number;
}

export function Avatar({ avatarId, size = 40 }: AvatarProps) {
  return <PresetAvatar avatarId={avatarId} size={size} />;
}
