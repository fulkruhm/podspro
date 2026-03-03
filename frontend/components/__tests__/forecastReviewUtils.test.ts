import { describe, expect, it } from 'vitest';
import { getDisplayedReviewItems } from '../forecastReviewUtils';
import { ForecastReviewItem } from '../../services/mlService';

const item = (overrides: Partial<ForecastReviewItem>): ForecastReviewItem => ({
  product_id: '1',
  product_name: 'Product',
  store_id: 'Main St. Market',
  region: 'North',
  department: 'Dairy',
  history_avg: 10,
  forecast_avg: 11,
  history_std: 1,
  forecast_std: 1.1,
  confidence_spread_avg: 5,
  bias_pct: 5,
  anomaly_score: 10,
  recommended_action: 'accept_model',
  latest_decision_status: null,
  latest_baseline_adjustment_pct: null,
  latest_notes: null,
  latest_decided_by: null,
  latest_decision_at: null,
  ...overrides,
});

describe('getDisplayedReviewItems', () => {
  it('shows only undecided items in queue tab', () => {
    const items = [
      item({ product_id: '1', latest_decision_status: null }),
      item({ product_id: '2', latest_decision_status: 'accept_model' }),
    ];

    const result = getDisplayedReviewItems(items, {
      reviewTab: 'queue',
      storeFilter: '',
      actionFilter: '',
      sortBy: 'score_desc',
    });

    expect(result).toHaveLength(1);
    expect(result[0].product_id).toBe('1');
  });

  it('supports action filtering and bias sorting', () => {
    const items = [
      item({ product_id: '1', recommended_action: 'adjust_baseline', bias_pct: 12 }),
      item({ product_id: '2', recommended_action: 'adjust_baseline', bias_pct: 21 }),
      item({ product_id: '3', recommended_action: 'accept_model', bias_pct: 4 }),
    ];

    const result = getDisplayedReviewItems(items, {
      reviewTab: 'queue',
      storeFilter: '',
      actionFilter: 'adjust_baseline',
      sortBy: 'bias_desc',
    });

    expect(result).toHaveLength(2);
    expect(result[0].product_id).toBe('2');
    expect(result[1].product_id).toBe('1');
  });

  it('shows only decided items in resolved tab and respects store filter', () => {
    const items = [
      item({ product_id: '1', store_id: 'A', latest_decision_status: 'accept_model' }),
      item({ product_id: '2', store_id: 'B', latest_decision_status: 'adjust_baseline' }),
      item({ product_id: '3', store_id: 'A', latest_decision_status: null }),
    ];

    const result = getDisplayedReviewItems(items, {
      reviewTab: 'resolved',
      storeFilter: 'A',
      actionFilter: '',
      sortBy: 'score_desc',
    });

    expect(result).toHaveLength(1);
    expect(result[0].product_id).toBe('1');
  });
});
