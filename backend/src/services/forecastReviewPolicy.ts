export const DEFAULT_BIAS_APPROVAL_THRESHOLD_PCT = 10;

export type ForecastReviewAction = 'accept_model' | 'adjust_baseline';

export function getForecastReviewAction(
  biasPct: number,
  thresholdPct: number = DEFAULT_BIAS_APPROVAL_THRESHOLD_PCT
): ForecastReviewAction {
  return Math.abs(biasPct) > thresholdPct ? 'adjust_baseline' : 'accept_model';
}

export function shouldAutoAcceptByBias(
  biasPct: number,
  thresholdPct: number = DEFAULT_BIAS_APPROVAL_THRESHOLD_PCT
): boolean {
  return Math.abs(biasPct) <= thresholdPct;
}
