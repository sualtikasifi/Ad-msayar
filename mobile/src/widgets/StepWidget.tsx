import React from 'react';
import {
  FlexWidget,
  TextWidget,
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
  const fillFlex = Math.max(pct, 1);
  const remainFlex = Math.max(100 - pct, 0);

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
          text="Ad Msayar"
          style={{ fontSize: 12, color: '#E0DCFF', fontWeight: 'bold' }}
        />
        <TextWidget
          text={username}
          style={{ fontSize: 11, color: '#C4BFFF' }}
        />
      </FlexWidget>

      {/* Steps */}
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget
          text={steps.toLocaleString('tr-TR')}
          style={{ fontSize: 32, color: '#FFFFFF', fontWeight: 'bold' }}
        />
        <TextWidget
          text="adim"
          style={{ fontSize: 13, color: '#E0DCFF' }}
        />
      </FlexWidget>

      {/* Progress bar + info */}
      <FlexWidget style={{ flexDirection: 'column' }}>
        {/* Track: two flex children simulate progress fill */}
        <FlexWidget
          style={{
            height: 8,
            borderRadius: 4,
            flexDirection: 'row',
            width: 'match_parent',
            overflow: 'hidden',
            backgroundColor: '#9D97E8',
          }}
        >
          <FlexWidget
            style={{
              flex: fillFlex,
              height: 8,
              backgroundColor: isGoalReached ? '#10B981' : '#FFFFFF',
            }}
          />
          {remainFlex > 0 && (
            <FlexWidget style={{ flex: remainFlex, height: 8, backgroundColor: '#9D97E8' }} />
          )}
        </FlexWidget>

        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <TextWidget
            text={isGoalReached ? 'Hedef tamamlandi!' : `${stepsLeft.toLocaleString('tr-TR')} adim kaldi`}
            style={{ fontSize: 11, color: '#E0DCFF' }}
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
