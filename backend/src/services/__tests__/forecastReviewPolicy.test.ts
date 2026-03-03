import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BIAS_APPROVAL_THRESHOLD_PCT,
  getForecastReviewAction,
  shouldAutoAcceptByBias,
} from '../forecastReviewPolicy.js';

describe('forecast review policy', () => {
  it('auto-accepts at or below threshold', () => {
    expect(getForecastReviewAction(0)).toBe('accept_model');
    expect(getForecastReviewAction(DEFAULT_BIAS_APPROVAL_THRESHOLD_PCT)).toBe('accept_model');
    expect(getForecastReviewAction(-DEFAULT_BIAS_APPROVAL_THRESHOLD_PCT)).toBe('accept_model');
    expect(shouldAutoAcceptByBias(7.5)).toBe(true);
  });

  it('requires approval above threshold', () => {
    expect(getForecastReviewAction(10.01)).toBe('adjust_baseline');
    expect(getForecastReviewAction(-12.5)).toBe('adjust_baseline');
    expect(shouldAutoAcceptByBias(12.5)).toBe(false);
  });

  it('supports custom thresholds', () => {
    expect(getForecastReviewAction(15, 20)).toBe('accept_model');
    expect(getForecastReviewAction(21, 20)).toBe('adjust_baseline');
  });
});
