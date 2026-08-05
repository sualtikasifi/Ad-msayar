import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export const AVATAR_COUNT = 10;
export const DEFAULT_AVATAR_ID = 1;

export function isValidAvatarId(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= AVATAR_COUNT;
}

interface AvatarDef {
  bg: string;
  face: (size: number) => React.ReactNode;
}

// 10 simple, distinct preset avatars — flat color background + a face/icon
// built from primitive shapes, so no image assets or uploads are needed.
const AVATARS: Record<number, AvatarDef> = {
  1: {
    bg: '#6C63FF',
    face: (s) => (
      <>
        <Circle cx={s * 0.36} cy={s * 0.44} r={s * 0.07} fill="#fff" />
        <Circle cx={s * 0.64} cy={s * 0.44} r={s * 0.07} fill="#fff" />
        <Path d={`M ${s * 0.34} ${s * 0.62} Q ${s * 0.5} ${s * 0.74} ${s * 0.66} ${s * 0.62}`} stroke="#fff" strokeWidth={s * 0.045} fill="none" strokeLinecap="round" />
      </>
    ),
  },
  2: {
    bg: '#10B981',
    face: (s) => (
      <>
        <Circle cx={s * 0.36} cy={s * 0.44} r={s * 0.06} fill="#fff" />
        <Circle cx={s * 0.64} cy={s * 0.44} r={s * 0.06} fill="#fff" />
        <Path d={`M ${s * 0.34} ${s * 0.66} L ${s * 0.66} ${s * 0.66}`} stroke="#fff" strokeWidth={s * 0.045} strokeLinecap="round" />
        <Path d={`M ${s * 0.22} ${s * 0.26} L ${s * 0.36} ${s * 0.34} M ${s * 0.78} ${s * 0.26} L ${s * 0.64} ${s * 0.34}`} stroke="#fff" strokeWidth={s * 0.05} strokeLinecap="round" />
      </>
    ),
  },
  3: {
    bg: '#F59E0B',
    face: (s) => (
      <>
        <Circle cx={s * 0.36} cy={s * 0.46} r={s * 0.1} fill="#fff" />
        <Circle cx={s * 0.64} cy={s * 0.46} r={s * 0.1} fill="#fff" />
        <Circle cx={s * 0.36} cy={s * 0.46} r={s * 0.04} fill="#1A1A2E" />
        <Circle cx={s * 0.64} cy={s * 0.46} r={s * 0.04} fill="#1A1A2E" />
        <Path d={`M ${s * 0.4} ${s * 0.68} Q ${s * 0.5} ${s * 0.76} ${s * 0.6} ${s * 0.68}`} stroke="#fff" strokeWidth={s * 0.045} fill="none" strokeLinecap="round" />
      </>
    ),
  },
  4: {
    bg: '#EF4444',
    face: (s) => (
      <>
        <Path d={`M ${s * 0.26} ${s * 0.42} L ${s * 0.46} ${s * 0.42}`} stroke="#fff" strokeWidth={s * 0.06} strokeLinecap="round" />
        <Path d={`M ${s * 0.54} ${s * 0.42} L ${s * 0.74} ${s * 0.42}`} stroke="#fff" strokeWidth={s * 0.06} strokeLinecap="round" />
        <Circle cx={s * 0.5} cy={s * 0.64} r={s * 0.05} fill="#fff" />
      </>
    ),
  },
  5: {
    bg: '#3B82F6',
    face: (s) => (
      <>
        <Circle cx={s * 0.36} cy={s * 0.45} r={s * 0.13} stroke="#fff" strokeWidth={s * 0.035} fill="none" />
        <Circle cx={s * 0.64} cy={s * 0.45} r={s * 0.13} stroke="#fff" strokeWidth={s * 0.035} fill="none" />
        <Path d={`M ${s * 0.49} ${s * 0.45} L ${s * 0.51} ${s * 0.45}`} stroke="#fff" strokeWidth={s * 0.035} />
        <Path d={`M ${s * 0.38} ${s * 0.68} Q ${s * 0.5} ${s * 0.75} ${s * 0.62} ${s * 0.68}`} stroke="#fff" strokeWidth={s * 0.04} fill="none" strokeLinecap="round" />
      </>
    ),
  },
  6: {
    bg: '#EC4899',
    face: (s) => (
      <>
        <Circle cx={s * 0.36} cy={s * 0.44} r={s * 0.06} fill="#fff" />
        <Circle cx={s * 0.64} cy={s * 0.44} r={s * 0.06} fill="#fff" />
        <Path d={`M ${s * 0.4} ${s * 0.66} Q ${s * 0.5} ${s * 0.6} ${s * 0.6} ${s * 0.66}`} stroke="#fff" strokeWidth={s * 0.04} fill="none" strokeLinecap="round" />
        <Path d={`M ${s * 0.5} ${s * 0.14} L ${s * 0.42} ${s * 0.26} L ${s * 0.58} ${s * 0.26} Z`} fill="#fff" />
      </>
    ),
  },
  7: {
    bg: '#14B8A6',
    face: (s) => (
      <>
        <Circle cx={s * 0.36} cy={s * 0.46} r={s * 0.055} fill="#fff" />
        <Circle cx={s * 0.64} cy={s * 0.46} r={s * 0.055} fill="#fff" />
        <Path d={`M ${s * 0.36} ${s * 0.66} L ${s * 0.64} ${s * 0.66}`} stroke="#fff" strokeWidth={s * 0.045} strokeLinecap="round" />
        <Circle cx={s * 0.22} cy={s * 0.5} r={s * 0.06} fill="none" stroke="#fff" strokeWidth={s * 0.03} />
        <Circle cx={s * 0.78} cy={s * 0.5} r={s * 0.06} fill="none" stroke="#fff" strokeWidth={s * 0.03} />
      </>
    ),
  },
  8: {
    bg: '#8B5CF6',
    face: (s) => (
      <>
        <Path d={`M ${s * 0.28} ${s * 0.46} L ${s * 0.44} ${s * 0.46}`} stroke="#fff" strokeWidth={s * 0.045} strokeLinecap="round" />
        <Path d={`M ${s * 0.56} ${s * 0.46} L ${s * 0.72} ${s * 0.46}`} stroke="#fff" strokeWidth={s * 0.045} strokeLinecap="round" />
        <Path d={`M ${s * 0.38} ${s * 0.68} Q ${s * 0.5} ${s * 0.74} ${s * 0.62} ${s * 0.68}`} stroke="#fff" strokeWidth={s * 0.04} fill="none" strokeLinecap="round" />
        <Path d={`M ${s * 0.18} ${s * 0.3} Q ${s * 0.3} ${s * 0.12} ${s * 0.44} ${s * 0.24}`} stroke="#fff" strokeWidth={s * 0.045} fill="none" strokeLinecap="round" />
        <Path d={`M ${s * 0.82} ${s * 0.3} Q ${s * 0.7} ${s * 0.12} ${s * 0.56} ${s * 0.24}`} stroke="#fff" strokeWidth={s * 0.045} fill="none" strokeLinecap="round" />
      </>
    ),
  },
  9: {
    bg: '#F97316',
    face: (s) => (
      <>
        <Circle cx={s * 0.36} cy={s * 0.44} r={s * 0.06} fill="#fff" />
        <Circle cx={s * 0.64} cy={s * 0.44} r={s * 0.06} fill="#fff" />
        <Path d={`M ${s * 0.36} ${s * 0.64} Q ${s * 0.5} ${s * 0.72} ${s * 0.64} ${s * 0.64}`} stroke="#fff" strokeWidth={s * 0.045} fill="none" strokeLinecap="round" />
        <Path d={`M ${s * 0.5} ${s * 0.44} L ${s * 0.5} ${s * 0.56}`} stroke="#fff" strokeWidth={s * 0.03} strokeLinecap="round" />
      </>
    ),
  },
  10: {
    bg: '#0EA5E9',
    face: (s) => (
      <>
        <Path d={`M ${s * 0.24} ${s * 0.5} L ${s * 0.4} ${s * 0.4} L ${s * 0.4} ${s * 0.6} Z`} fill="#fff" />
        <Path d={`M ${s * 0.76} ${s * 0.5} L ${s * 0.6} ${s * 0.4} L ${s * 0.6} ${s * 0.6} Z`} fill="#fff" />
        <Circle cx={s * 0.5} cy={s * 0.5} r={s * 0.04} fill="#fff" />
      </>
    ),
  },
};

interface PresetAvatarProps {
  avatarId: number;
  size?: number;
}

export function PresetAvatar({ avatarId, size = 40 }: PresetAvatarProps) {
  const def = AVATARS[avatarId] ?? AVATARS[DEFAULT_AVATAR_ID];
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={def.bg} />
      {def.face(size)}
    </Svg>
  );
}

export const AVATAR_IDS = Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1);
