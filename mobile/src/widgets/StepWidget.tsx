/**
 * StepWidget — Android Home Screen Widget
 *
 * Uses react-native-android-widget.
 * After adding this file, run:
 *   npx expo prebuild --platform android
 *   npx expo run:android
 */

import React from 'react';
import {
  FlexWidget,
  TextWidget,
  ImageWidget,
} from 'react-native-android-widget';

export interface StepWidgetData {
  steps: number;
  goal: number;
  username: string;
}

export function StepWidget({ steps, goal, username }: StepWidgetData) {
  const pct = Math.min(Math.round((steps / goal) * 100), 100);
  const stepsLeft = Math.max(goal - steps, 0);
  const isGoalReached = steps >= goal;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: '#6C63FF',
        borderRadius: 20,
        padding: 16,
        justifyContent: 'space-between',
      }}
    >
      {/* Header */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget
          text="👟 Ad Msayar"
          style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 'bold' }}
        />
        <TextWidget
          text={`${username}`}
          style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}
        />
      </FlexWidget>

      {/* Steps */}
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget
          text={steps.toLocaleString('tr-TR')}
          style={{ fontSize: 32, color: '#FFFFFF', fontWeight: 'bold' }}
        />
        <TextWidget
          text="adım"
          style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}
        />
      </FlexWidget>

      {/* Progress bar + info */}
      <FlexWidget style={{ flexDirection: 'column', gap: 4 }}>
        {/* Background track */}
        <FlexWidget
          style={{
            height: 8,
            backgroundColor: 'rgba(255,255,255,0.3)',
            borderRadius: 4,
            width: 'match_parent',
          }}
        >
          {/* Fill */}
          <FlexWidget
            style={{
              height: 8,
              backgroundColor: isGoalReached ? '#10B981' : '#FFFFFF',
              borderRadius: 4,
              width: `${pct}%`,
            }}
          />
        </FlexWidget>

        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TextWidget
            text={isGoalReached ? '🎉 Hedef tamamlandı!' : `${stepsLeft.toLocaleString('tr-TR')} adım kaldı`}
            style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)' }}
          />
          <TextWidget
            text={`%${pct}`}
            style={{ fontSize: 11, color: '#FFFFFF', fontWeight: 'bold' }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
