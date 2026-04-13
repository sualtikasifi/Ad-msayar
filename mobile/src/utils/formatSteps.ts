export function formatSteps(steps: number): string {
  if (steps >= 1000) {
    return `${(steps / 1000).toFixed(1)}B`;
  }
  return steps.toString();
}

export function formatStepsFull(steps: number): string {
  return steps.toLocaleString('tr-TR');
}

export function stepProgressPercent(steps: number, goal = 10000): number {
  return Math.min(Math.round((steps / goal) * 100), 100);
}
