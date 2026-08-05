/**
 * Widget task — runs when Android requests a widget update.
 * Registered in the app entry point (app/_layout.tsx).
 */

import { registerWidgetTaskHandler } from 'react-native-android-widget';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import React from 'react';
import * as SecureStore from 'expo-secure-store';
import { StepWidget } from './StepWidget';
import { today as todayLocalDate } from '../utils/dateHelpers';

async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetAction, renderWidget } = props;

  if (widgetAction === 'WIDGET_ADDED' || widgetAction === 'WIDGET_UPDATE') {
    // Read latest steps and goal from SecureStore (written by backgroundSteps.ts)
    const stepsRaw = await SecureStore.getItemAsync('lastKnownSteps').catch(() => null);
    const userRaw = await SecureStore.getItemAsync('user').catch(() => null);

    let steps = 0;
    let goal = 10000;
    let username = 'Kullanıcı';

    if (stepsRaw) {
      try {
        const parsed = JSON.parse(stepsRaw) as { date: string; count: number };
        if (parsed.date === todayLocalDate()) steps = parsed.count;
      } catch {}
    }

    if (userRaw) {
      try {
        const user = JSON.parse(userRaw) as { username?: string; daily_step_goal?: number };
        if (user.username) username = user.username;
        if (user.daily_step_goal) goal = user.daily_step_goal;
      } catch {}
    }

    renderWidget(
      React.createElement(StepWidget, { steps, goal, username })
    );
  }
}

registerWidgetTaskHandler(widgetTaskHandler);
