import { ForecastReviewItem } from '../services/mlService';

export interface ReviewFilterOptions {
  reviewTab: 'queue' | 'resolved';
  storeFilter: string;
  actionFilter: string;
  sortBy: 'score_desc' | 'score_asc' | 'bias_desc' | 'bias_asc';
}

export function getDisplayedReviewItems(
  items: ForecastReviewItem[],
  options: ReviewFilterOptions
): ForecastReviewItem[] {
  const { reviewTab, storeFilter, actionFilter, sortBy } = options;

  const baseItems = items.filter((item) =>
    reviewTab === 'queue' ? !item.latest_decision_status : !!item.latest_decision_status
  );

  const filtered = baseItems.filter((item) => {
    if (storeFilter && item.store_id !== storeFilter) return false;
    if (actionFilter) {
      const actionToCompare =
        reviewTab === 'queue' ? item.recommended_action : item.latest_decision_status || '';
      if (actionToCompare !== actionFilter) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    const scoreA = Number(a.anomaly_score);
    const scoreB = Number(b.anomaly_score);
    const biasA = Math.abs(Number(a.bias_pct));
    const biasB = Math.abs(Number(b.bias_pct));

    if (sortBy === 'score_asc') return scoreA - scoreB;
    if (sortBy === 'bias_desc') return biasB - biasA;
    if (sortBy === 'bias_asc') return biasA - biasB;
    return scoreB - scoreA;
  });
}
