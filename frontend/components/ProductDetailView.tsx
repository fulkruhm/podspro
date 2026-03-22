import React, { useState, useEffect, useMemo } from 'react';
import { Product } from '../types';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import {
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Tag,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface ProductDetailViewProps {
  product: Product;
  onClose: () => void;
  triggerQuery: (query: string) => void;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
  onPrevProduct?: () => void;
  onNextProduct?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  currentPosition?: number;
  totalCount?: number;
}

const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  onClose,
  triggerQuery,
  onUpdateProduct,
  onPrevProduct,
  onNextProduct,
  hasPrev,
  hasNext,
  currentPosition,
  totalCount,
}) => {
  type ConfidenceLevel = 'high' | 'medium' | 'low';
  type HistoricalFitContext = 'strong' | 'moderate' | 'weak';

  interface ForecastTooltipPayloadItem {
    payload?: {
      actualDemand?: number;
      forecast?: number;
      explainability?: string;
      confidenceLower?: number;
      confidenceUpper?: number;
      confidenceSpread?: number;
      confidenceSpreadPct?: number;
      confidenceLevel?: ConfidenceLevel;
      confidenceLabel?: string;
      confidenceDescription?: string;
      confidenceTitle?: string;
      confidenceMethod?: 'historical-fit' | 'interval-width';
      historicalErrorPct?: number;
      historicalWithinBand?: boolean;
      forecastBasis?: string;
      period?: 'history' | 'forecast';
    };
  }

  interface ForecastTooltipProps {
    active?: boolean;
    payload?: ForecastTooltipPayloadItem[];
    label?: string;
  }

  type FeatureDriver = 'promo' | 'holiday' | 'weather';

  const [ropValue, setRopValue] = useState(product.reorderPoint);
  const [safetyStockValue, setSafetyStockValue] = useState(product.safetyStock);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeFeatureDriver, setActiveFeatureDriver] = useState<FeatureDriver | null>(null);

  // Sync local state when product prop changes
  useEffect(() => {
    setRopValue(product.reorderPoint);
    setSafetyStockValue(product.safetyStock);
    setActiveFeatureDriver(null);
  }, [product.id, product.reorderPoint, product.safetyStock]);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  };

  const historyCount = 7;
  const forecastCount = 14;

  const finalHistory = useMemo(() => {
    const rawHistory = [...(product.historicalDemand || [])];
    while (rawHistory.length < historyCount) rawHistory.unshift(product.avgDailyDemand);
    return rawHistory.slice(-historyCount);
  }, [product.historicalDemand, product.avgDailyDemand]);

  const rawForecast = [...(product.forecastedDemand || [])];
  while (rawForecast.length < forecastCount) rawForecast.push(product.avgDailyDemand);
  const finalForecast = rawForecast.slice(0, forecastCount);

  const aiRecommendation = useMemo(() => {
    const leadTimeDays = Math.max(1, Number(product.leadTime) || 1);
    const history =
      finalHistory.length > 0 ? finalHistory : [Math.max(0, product.avgDailyDemand || 0)];
    const historyMean = history.reduce((sum, value) => sum + value, 0) / history.length;
    const variance =
      history.reduce((sum, value) => sum + Math.pow(value - historyMean, 2), 0) / history.length;
    const demandStdDev = Math.sqrt(Math.max(variance, 0));

    const serviceLevelZ =
      product.status === 'critical'
        ? 1.96
        : product.status === 'low'
          ? 1.65
          : product.status === 'optimal'
            ? 1.28
            : 1.04;

    const suggestedSafetyStock = Math.max(
      0,
      Math.round(serviceLevelZ * demandStdDev * Math.sqrt(leadTimeDays))
    );

    let leadTimeDemand = 0;
    for (let i = 0; i < leadTimeDays; i++) {
      leadTimeDemand += finalForecast[i] ?? Math.max(0, product.avgDailyDemand || 0);
    }

    const suggestedROP = Math.max(0, Math.round(leadTimeDemand + suggestedSafetyStock));

    const ropDelta = suggestedROP - product.reorderPoint;
    const safetyDelta = suggestedSafetyStock - product.safetyStock;

    const ropNeedsChange = Math.abs(ropDelta) >= 2;
    const safetyNeedsChange = Math.abs(safetyDelta) >= 2;

    return {
      suggestedROP,
      suggestedSafetyStock,
      ropDelta,
      safetyDelta,
      ropNeedsChange,
      safetyNeedsChange,
    };
  }, [
    finalForecast,
    finalHistory,
    product.avgDailyDemand,
    product.leadTime,
    product.reorderPoint,
    product.safetyStock,
    product.status,
  ]);

  const baselineWindow = finalHistory.slice(-7);
  const baselineAvg = baselineWindow.length
    ? baselineWindow.reduce((sum, value) => sum + value, 0) / baselineWindow.length
    : null;

  const confidenceWindow = finalHistory.slice(-14);
  const confidenceMean = confidenceWindow.length
    ? confidenceWindow.reduce((sum, value) => sum + value, 0) / confidenceWindow.length
    : null;
  const confidenceStdDev =
    confidenceWindow.length > 1 && confidenceMean !== null
      ? Math.sqrt(
          confidenceWindow.reduce((sum, value) => {
            const delta = value - confidenceMean;
            return sum + delta * delta;
          }, 0) /
            (confidenceWindow.length - 1)
        )
      : null;

  const forecastSlope =
    finalForecast.length > 1
      ? (finalForecast[finalForecast.length - 1] - finalForecast[0]) / (finalForecast.length - 1)
      : 0;

  const inferredTrend =
    forecastSlope > 0.5 ? 'increasing' : forecastSlope < -0.5 ? 'decreasing' : 'stable';

  const buildConfidenceInterval = (forecastValue: number, horizonScale: number) => {
    const recentVolatilityPct =
      confidenceStdDev && baselineAvg && baselineAvg > 0
        ? confidenceStdDev / Math.max(1, baselineAvg)
        : 0.12;

    const calibratedVolatilityPct = Math.min(0.28, Math.max(0.08, recentVolatilityPct));
    const horizonMultiplier = 1 + Math.min(0.5, Math.max(0, (horizonScale - 1) * 0.2));

    const intervalHalfWidth = Math.max(
      1,
      Math.round(Math.max(1, forecastValue) * calibratedVolatilityPct * horizonMultiplier)
    );

    const lowerBound = Math.max(0, Math.round(forecastValue - intervalHalfWidth));
    const upperBound = Math.max(lowerBound, Math.round(forecastValue + intervalHalfWidth));

    return {
      lowerBound,
      upperBound,
      spread: upperBound - lowerBound,
    };
  };

  const getConfidenceMeta = (
    spread: number | null,
    forecastValue: number,
    fitContext: HistoricalFitContext = 'weak'
  ) => {
    if (spread === null) {
      return {
        level: null,
        label: null,
        description: null,
        className: 'text-slate-700',
        spreadPct: null,
      };
    }

    const spreadPct = Math.round((spread / Math.max(1, forecastValue)) * 100);
    const highThreshold = fitContext === 'strong' ? 30 : fitContext === 'moderate' ? 25 : 20;
    const mediumThreshold = fitContext === 'strong' ? 60 : fitContext === 'moderate' ? 50 : 40;

    if (spreadPct <= highThreshold) {
      return {
        level: 'high' as ConfidenceLevel,
        label: 'High confidence',
        description: `Range width is within ${highThreshold}% of the point forecast.`,
        className: 'text-emerald-700',
        spreadPct,
      };
    }

    if (spreadPct <= mediumThreshold) {
      return {
        level: 'medium' as ConfidenceLevel,
        label: 'Mixed signal',
        description: `Range width is between ${highThreshold + 1}% and ${mediumThreshold}% of the point forecast.`,
        className: 'text-amber-700',
        spreadPct,
      };
    }

    return {
      level: 'low' as ConfidenceLevel,
      label: 'Low confidence / risk',
        description: `Range width is above ${mediumThreshold}% of the point forecast.`,
      className: 'text-red-700',
      spreadPct,
    };
  };

  const getHistoricalFitMeta = (forecastValue: number, actualValue: number) => {
    const errorPct = Math.round(
      (Math.abs(actualValue - forecastValue) / Math.max(1, actualValue)) * 100
    );

    if (errorPct <= 10) {
      return {
        level: 'high' as ConfidenceLevel,
        label: 'High historical fit',
        description: 'Expected demand stayed within 10% of actual demand for this day.',
        className: 'text-emerald-700',
        errorPct,
      };
    }

    if (errorPct <= 20) {
      return {
        level: 'medium' as ConfidenceLevel,
        label: 'Moderate historical fit',
        description: 'Expected demand stayed within 11-20% of actual demand for this day.',
        className: 'text-amber-700',
        errorPct,
      };
    }

    return {
      level: 'low' as ConfidenceLevel,
      label: 'Low historical fit',
      description: 'Expected demand missed actual demand by more than 20% for this day.',
      className: 'text-red-700',
      errorPct,
    };
  };

  const buildPointConfidence = (
    forecastValue: number,
    explainability?: string,
    horizonScale = 1,
    fitContext: HistoricalFitContext = 'weak'
  ) => {
    const confidenceMatch = explainability?.match(/confidence\s+(\d+)\s*-\s*(\d+)/i);

    const interval = confidenceMatch
      ? {
          lowerBound: Number(confidenceMatch[1]),
          upperBound: Number(confidenceMatch[2]),
          spread: Math.abs(Number(confidenceMatch[2]) - Number(confidenceMatch[1])),
        }
      : buildConfidenceInterval(forecastValue, horizonScale);

    const confidenceMeta = getConfidenceMeta(interval.spread, forecastValue, fitContext);

    return {
      confidenceLower: interval.lowerBound,
      confidenceUpper: interval.upperBound,
      confidenceSpread: interval.spread,
      confidenceSpreadPct: confidenceMeta.spreadPct,
      confidenceLevel: confidenceMeta.level,
      confidenceLabel: confidenceMeta.label,
      confidenceDescription: confidenceMeta.description,
      confidenceTitle: 'Confidence rating',
      confidenceMethod: 'interval-width' as const,
      historicalErrorPct: null,
      confidenceClassName: confidenceMeta.className,
    };
  };

  const buildHistoricalPointConfidence = (forecastValue: number, actualValue: number) => {
    const fitMeta = getHistoricalFitMeta(forecastValue, actualValue);
    const intervalHalfWidth = Math.max(
      1,
      Math.round(
        Math.max(
          Math.abs(actualValue - forecastValue),
          (confidenceStdDev ?? Math.max(1, forecastValue * 0.08)) * 0.75
        )
      )
    );

    const confidenceLower = Math.max(0, forecastValue - intervalHalfWidth);
    const confidenceUpper = Math.max(forecastValue, forecastValue + intervalHalfWidth);
    const historicalWithinBand = actualValue >= confidenceLower && actualValue <= confidenceUpper;

    return {
      confidenceLower,
      confidenceUpper,
      confidenceSpread: intervalHalfWidth * 2,
      confidenceSpreadPct: null,
      confidenceLevel: fitMeta.level,
      confidenceLabel: null,
      confidenceDescription: fitMeta.description,
      confidenceTitle: 'Historical comparison',
      confidenceMethod: 'historical-fit' as const,
      historicalErrorPct: fitMeta.errorPct,
      historicalWithinBand,
      confidenceClassName: fitMeta.className,
    };
  };

  const buildFallbackExplainability = (dayIndex: number, forecastValue: number) => {
    const variancePercent =
      baselineAvg && baselineAvg > 0
        ? Math.round(((forecastValue - baselineAvg) / baselineAvg) * 100)
        : null;

    const horizonScale = Math.sqrt(dayIndex + 1);
    const { lowerBound, upperBound } = buildConfidenceInterval(forecastValue, horizonScale);

    return `D+${dayIndex + 1}: ${inferredTrend} trend${variancePercent === null ? '' : `, ${variancePercent >= 0 ? '+' : ''}${variancePercent}% vs last-7-day baseline`}, confidence ${lowerBound}-${upperBound} (estimated from demand variance).`;
  };

  const finalExplainability = Array.from({ length: forecastCount }, (_, index) => {
    const persisted = product.forecastedExplainability?.[index];
    const isSeedPlaceholder =
      typeof persisted === 'string' && /^seed baseline forecast/i.test(persisted.trim());

    if (typeof persisted === 'string' && persisted.trim().length > 0 && !isSeedPlaceholder) {
      return persisted;
    }

    return buildFallbackExplainability(index, finalForecast[index]);
  });

  const featureDriverSummary = {
    promoDays: finalExplainability.filter((entry) => /promo\s+(?:uplift|effect)/i.test(entry))
      .length,
    holidayDays: finalExplainability.filter((entry) => /holiday\s+lift/i.test(entry)).length,
    weatherDays: finalExplainability.filter((entry) => /weather\s+index/i.test(entry)).length,
    calendarDays: finalExplainability.filter((entry) => /calendar\s+dow/i.test(entry)).length,
  };

  const activeFeatureMatchCount =
    activeFeatureDriver === 'promo'
      ? featureDriverSummary.promoDays
      : activeFeatureDriver === 'holiday'
        ? featureDriverSummary.holidayDays
        : activeFeatureDriver === 'weather'
          ? featureDriverSummary.weatherDays
          : 0;

  const activeFeatureLabel = activeFeatureDriver
    ? `${activeFeatureDriver.charAt(0).toUpperCase()}${activeFeatureDriver.slice(1)}`
    : null;

  const activeFeaturePillClassName =
    activeFeatureDriver === 'promo'
      ? 'bg-violet-50 text-violet-700 border-violet-200'
      : activeFeatureDriver === 'holiday'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : activeFeatureDriver === 'weather'
          ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
          : 'bg-indigo-50 text-indigo-700 border-indigo-200';

  const historicalData = finalHistory.map((demand, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (historyCount - 1 - index));
    const trailingWindow = finalHistory.slice(Math.max(0, index - 3), index);
    const expectedDemand = Math.max(
      0,
      Math.round(
        trailingWindow.length > 0
          ? trailingWindow.reduce((sum, value) => sum + value, 0) / trailingWindow.length
          : baselineAvg ?? product.avgDailyDemand
      )
    );
    const confidence = buildHistoricalPointConfidence(expectedDemand, demand);

    return {
      date: formatDate(date),
      actualDemand: demand,
      forecast: expectedDemand,
      explainability:
        'Historical comparison uses a trailing 3-day baseline as the model expectation for each day.',
      forecastBasis: 'Historical expected demand (trailing 3-day baseline)',
      period: 'history' as const,
      hasPromoDriver: false,
      hasHolidayDriver: false,
      hasWeatherDriver: false,
      ...confidence,
    };
  });

  const historicalFitContext = useMemo<HistoricalFitContext>(() => {
    if (historicalData.length === 0) {
      return 'weak';
    }

    const stats = historicalData.reduce(
      (acc, point) => {
        const actual = point.actualDemand ?? 0;
        const expected = point.forecast ?? 0;
        acc.errorTotal += Math.abs(actual - expected);
        const lower = point.confidenceLower ?? actual;
        const upper = point.confidenceUpper ?? actual;
        if (actual >= lower && actual <= upper) {
          acc.within += 1;
        }
        return acc;
      },
      { errorTotal: 0, within: 0 }
    );

    const avgError = stats.errorTotal / historicalData.length;
    const coveragePct = (stats.within / historicalData.length) * 100;

    if (avgError <= 1 && coveragePct >= 85) {
      return 'strong';
    }

    if (avgError <= 2 && coveragePct >= 70) {
      return 'moderate';
    }

    return 'weak';
  }, [historicalData]);

  const forecastData = finalForecast.map((forecast, index) => {
    const explainability = finalExplainability[index];
    const date = new Date(today);
    date.setDate(today.getDate() + index + 1);
    const confidence = buildPointConfidence(
      forecast,
      explainability,
      Math.sqrt(index + 1),
      historicalFitContext
    );

    return {
      date: formatDate(date),
      forecast,
      explainability,
      forecastBasis: 'Persisted forward forecast',
      period: 'forecast' as const,
      hasPromoDriver: /promo\s+uplift/i.test(explainability),
      hasHolidayDriver: /holiday\s+lift/i.test(explainability),
      hasWeatherDriver: /weather\s+index/i.test(explainability),
      ...confidence,
    };
  });

  const combinedData = [...historicalData, ...forecastData];

  const historicalForecastComparison = useMemo(() => {
    const comparablePoints = historicalData.filter(
      (point) => point.actualDemand !== undefined && point.forecast !== undefined
    );

    if (comparablePoints.length === 0) {
      return {
        meanAbsoluteError: 0,
        meanBiasPct: 0,
        withinRangeCount: 0,
        total: 0,
      };
    }

    const totalAbsoluteError = comparablePoints.reduce(
      (sum, point) => sum + Math.abs((point.actualDemand ?? 0) - (point.forecast ?? 0)),
      0
    );

    const totalBiasPct = comparablePoints.reduce((sum, point) => {
      const actual = point.actualDemand ?? 0;
      const expected = point.forecast ?? 0;
      return sum + ((expected - actual) / Math.max(1, actual)) * 100;
    }, 0);

    const withinRangeCount = comparablePoints.reduce((sum, point) => {
      const actual = point.actualDemand ?? 0;
      const lower = point.confidenceLower ?? actual;
      const upper = point.confidenceUpper ?? actual;
      return sum + (actual >= lower && actual <= upper ? 1 : 0);
    }, 0);

    return {
      meanAbsoluteError: Math.round(totalAbsoluteError / comparablePoints.length),
      meanBiasPct: Math.round(totalBiasPct / comparablePoints.length),
      withinRangeCount,
      total: comparablePoints.length,
    };
  }, [historicalData]);

  const historicalFitSummary = useMemo(() => {
    if (historicalForecastComparison.total === 0) {
      return {
        label: 'Historical fit unavailable',
        description: 'Not enough history to evaluate expected demand versus actual demand.',
        className: 'text-slate-700 bg-slate-50 border-slate-200',
      };
    }

    const coveragePct =
      (historicalForecastComparison.withinRangeCount / historicalForecastComparison.total) * 100;

    if (historicalForecastComparison.meanAbsoluteError <= 1 && coveragePct >= 85) {
      return {
        label: 'Historical fit is strong',
        description: 'Expected demand is tracking actuals closely over the last 7 days.',
        className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      };
    }

    if (historicalForecastComparison.meanAbsoluteError <= 2 && coveragePct >= 70) {
      return {
        label: 'Historical fit is moderate',
        description: 'Expected demand is directionally aligned, with some day-to-day miss.',
        className: 'text-amber-700 bg-amber-50 border-amber-200',
      };
    }

    return {
      label: 'Historical fit is weak',
      description: 'Expected demand is missing actuals often enough to warrant review.',
      className: 'text-red-700 bg-red-50 border-red-200',
    };
  }, [historicalForecastComparison]);

  const futureConfidenceSummary = useMemo(() => {
    const counts = forecastData.reduce(
      (acc, point) => {
        if (point.confidenceLevel === 'high') acc.high += 1;
        if (point.confidenceLevel === 'medium') acc.medium += 1;
        if (point.confidenceLevel === 'low') acc.low += 1;
        if (typeof point.confidenceSpreadPct === 'number') {
          acc.spreadTotal += point.confidenceSpreadPct;
          acc.spreadCount += 1;
        }
        return acc;
      },
      { high: 0, medium: 0, low: 0, spreadTotal: 0, spreadCount: 0 }
    );

    const averageSpreadPct =
      counts.spreadCount > 0 ? Math.round(counts.spreadTotal / counts.spreadCount) : null;

    if (counts.low === 0 && counts.medium <= counts.high) {
      return {
        label: 'Future outlook is mostly high confidence',
        description:
          averageSpreadPct === null
            ? 'Most forecast days have a relatively tight uncertainty band.'
            : `Average future range width is about ${averageSpreadPct}% of forecast.`,
        className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      };
    }

    if (counts.low <= counts.high + counts.medium) {
      return {
        label: 'Future outlook is mixed',
        description:
          averageSpreadPct === null
            ? 'Some future days are tight while others carry more uncertainty.'
            : `Average future range width is about ${averageSpreadPct}% of forecast.`,
        className: 'text-amber-700 bg-amber-50 border-amber-200',
      };
    }

    return {
      label: 'Future outlook has higher uncertainty',
      description:
        averageSpreadPct === null
          ? 'Several future days have wide uncertainty bands.'
          : `Average future range width is about ${averageSpreadPct}% of forecast.`,
      className: 'text-red-700 bg-red-50 border-red-200',
    };
  }, [forecastData]);

  const historyBoundaryLabel = historicalData[historicalData.length - 1]?.date;

  const chartData = useMemo(() => {
    if (!activeFeatureDriver) {
      return combinedData;
    }

    return combinedData.map((point) => {
      const matchesDriver =
        activeFeatureDriver === 'promo'
          ? point.hasPromoDriver
          : activeFeatureDriver === 'holiday'
            ? point.hasHolidayDriver
            : point.hasWeatherDriver;

      if (point.forecast === undefined) {
        return point;
      }

      return {
        ...point,
        forecast: matchesDriver ? point.forecast : undefined,
      };
    });
  }, [combinedData, activeFeatureDriver]);

  const handleAction = (msg: string, updates?: Partial<Product>) => {
    setIsUpdating(true);
    if (updates) {
      onUpdateProduct(product.id, updates);
    }
    setTimeout(() => {
      setIsUpdating(false);
      setActionFeedback(msg);
      setTimeout(() => setActionFeedback(null), 3000);
    }, 800);
  };

  const applyAISuggestion = (type: 'rop' | 'safety') => {
    if (type === 'rop') {
      if (!aiRecommendation.ropNeedsChange) {
        handleAction('No change needed for Reorder Point');
        return;
      }

      const newVal = aiRecommendation.suggestedROP;
      setRopValue(newVal);
      handleAction(`AI optimization applied to Reorder Point`, { reorderPoint: newVal });
    } else {
      if (!aiRecommendation.safetyNeedsChange) {
        handleAction('No change needed for Safety Stock');
        return;
      }

      const newVal = aiRecommendation.suggestedSafetyStock;
      setSafetyStockValue(newVal);
      handleAction(`AI optimization applied to Safety Stock`, { safetyStock: newVal });
    }
  };

  const handleUpdateROP = () => {
    handleAction('Reorder Point updated', { reorderPoint: ropValue });
  };

  const handleUpdateSafetyStock = () => {
    handleAction('Safety Stock updated', { safetyStock: safetyStockValue });
  };

  const forecastTotal7d = finalForecast.reduce((sum, value) => sum + value, 0);
  const daysOfCover =
    product.avgDailyDemand > 0 ? product.currentStock / product.avgDailyDemand : 0;
  const ropGap = product.currentStock - ropValue;
  const riskScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (product.status === 'critical' ? 40 : product.status === 'low' ? 25 : 10) +
          (product.oosDays || 0) * 4 +
          (product.shrinkRate || 0) * 2 +
          (ropGap < 0 ? 20 : 0)
      )
    )
  );

  const getPrimaryAction = () => {
    if (product.status === 'critical' || product.status === 'low') {
      return {
        label: 'Generate Reorder',
        className: 'bg-red-600 hover:bg-red-700 text-white',
        onClick: () => {
          const suggestedQty = Math.max(
            0,
            Math.ceil(forecastTotal7d + safetyStockValue - product.currentStock)
          );
          triggerQuery(
            `Generate a replenishment order recommendation for ${product.name} at ${product.store}. Current stock is ${product.currentStock}, 7-day forecast is ${forecastTotal7d}, safety stock is ${safetyStockValue}. Suggested order quantity estimate is ${suggestedQty}.`
          );
        },
      };
    }

    if (product.status === 'excess') {
      return {
        label: 'Reduce Excess',
        className: 'bg-amber-600 hover:bg-amber-700 text-white',
        onClick: () =>
          triggerQuery(
            `Recommend markdown and transfer actions to reduce excess inventory for ${product.name} at ${product.store}. Current stock ${product.currentStock}, 7-day forecast ${forecastTotal7d}.`
          ),
      };
    }

    return {
      label: 'Monitor',
      className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      onClick: () =>
        triggerQuery(
          `Provide monitoring recommendations for ${product.name} at ${product.store} to maintain optimal stock levels over the next 7 days.`
        ),
    };
  };

  const primaryAction = getPrimaryAction();

  const renderForecastTooltip = ({ active, payload, label }: ForecastTooltipProps) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    const point = payload[0]?.payload || {};
    const explainabilityText: string = point.explainability || '';

    const trendMatch = explainabilityText.match(/\b(increasing|decreasing|stable)\b/i);
    const varianceMatch = explainabilityText.match(/([+-]?\d+)%\s+vs\s+last-7-day\s+baseline/i);
    const confidenceMatch = explainabilityText.match(/confidence\s+(\d+\s*-\s*\d+)/i);

    const trendValue = trendMatch?.[1]?.toLowerCase();
    const trendClassName =
      trendValue === 'increasing'
        ? 'text-emerald-700'
        : trendValue === 'decreasing'
          ? 'text-red-700'
          : 'text-amber-700';

    const varianceValue = varianceMatch?.[1] || null;
    const varianceNumber = varianceValue ? Number(varianceValue.replace('%', '')) : null;
    const varianceClassName =
      varianceNumber === null
        ? 'text-slate-700'
        : varianceNumber >= 0
          ? 'text-emerald-700'
          : 'text-red-700';

    const confidenceRange =
      point.confidenceLower !== undefined && point.confidenceUpper !== undefined
        ? `${point.confidenceLower}-${point.confidenceUpper}`
        : confidenceMatch?.[1] || null;
    const confidenceClassName = point.confidenceLabel
      ? point.confidenceLevel === 'high'
        ? 'text-emerald-700'
        : point.confidenceLevel === 'medium'
          ? 'text-amber-700'
          : 'text-red-700'
      : 'text-slate-700';

    const promoMatch = explainabilityText.match(/promo\s+(?:uplift|effect)\s+([+-]?\d+)%/i);
    const holidayMatch = explainabilityText.match(/holiday\s+lift\s+([+-]?\d+)%/i);
    const weatherMatch = explainabilityText.match(
      /weather\s+index\s+([0-9]*\.?[0-9]+)(?:\s*\(([+-]?\d+)%\))?/i
    );
    const calendarDetailedMatch = explainabilityText.match(
      /calendar\s+dow\s+([+-]?\d+)%\s*,\s*dom\s+([+-]?\d+)%\s*,\s*woy\s+([+-]?\d+)%/i
    );
    const calendarSimpleMatch = explainabilityText.match(
      /calendar\s+dow\s+([a-z]{3}),\s*dom\s+(\d{1,2}),\s*woy\s+(\d{1,2})/i
    );

    const featureDrivers: Array<{ label: string; value: string; className: string }> = [];
    if (promoMatch) {
      featureDrivers.push({
        label: 'Promo',
        value: `${promoMatch[1]}%`,
        className: 'bg-violet-50 text-violet-700 border-violet-200',
      });
    }
    if (holidayMatch) {
      featureDrivers.push({
        label: 'Holiday',
        value: `${holidayMatch[1]}%`,
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      });
    }
    if (weatherMatch) {
      const weatherDelta = weatherMatch[2] ? ` (${weatherMatch[2]}%)` : '';
      featureDrivers.push({
        label: 'Weather',
        value: `${weatherMatch[1]}${weatherDelta}`,
        className: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      });
    }
    if (calendarDetailedMatch) {
      featureDrivers.push({
        label: 'Calendar',
        value: `DOW ${calendarDetailedMatch[1]}% • DOM ${calendarDetailedMatch[2]}% • WOY ${calendarDetailedMatch[3]}%`,
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      });
    } else if (calendarSimpleMatch) {
      featureDrivers.push({
        label: 'Calendar',
        value: `${calendarSimpleMatch[1]} • D${calendarSimpleMatch[2]} • W${calendarSimpleMatch[3]}`,
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      });
    }

    return (
      <div className="rounded-xl bg-white border border-slate-200 shadow-lg p-3 max-w-xs">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        {point.actualDemand !== undefined && (
          <p className="text-xs text-slate-700 mt-1">
            Actual demand: <span className="font-bold">{point.actualDemand}</span>
          </p>
        )}
        {point.forecast !== undefined && (
          <p className="text-xs text-slate-700">
            {point.period === 'history' ? 'Expected demand' : 'Forecast'}:{' '}
            <span className="font-bold">{point.forecast}</span>
          </p>
        )}
        {point.forecastBasis && (
          <p className="text-[11px] text-slate-500 mt-1">{point.forecastBasis}</p>
        )}
        {point.forecast !== undefined && point.explainability && (
          <div className="mt-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
              Model Explainability
            </p>
            {(trendMatch || varianceMatch || confidenceMatch) && (
              <div className="mt-1 space-y-0.5 text-[11px] text-slate-700">
                {trendMatch && (
                  <p className="flex items-center gap-1">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${trendClassName.replace('text-', 'bg-')}`}
                    ></span>
                    <span>
                      Demand Direction:{' '}
                      <span className={`font-black ${trendClassName}`}>
                        {trendMatch[1].toLowerCase()}
                      </span>
                    </span>
                  </p>
                )}
                {varianceMatch && (
                  <p className="flex items-center gap-1">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${varianceClassName.replace('text-', 'bg-')}`}
                    ></span>
                    <span>
                      Demand Signal:{' '}
                      <span className={`font-black ${varianceClassName}`}>
                        {varianceMatch[1]} vs baseline
                      </span>
                    </span>
                  </p>
                )}
                {confidenceMatch && (
                  <p className="flex items-center gap-1">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${confidenceClassName.replace('text-', 'bg-')}`}
                    ></span>
                    <span>
                      Confidence Range:{' '}
                      <span className={`font-black ${confidenceClassName}`}>
                        {confidenceRange}
                      </span>
                    </span>
                  </p>
                )}
              </div>
            )}
            {point.period === 'history' && point.historicalErrorPct !== undefined && (
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-700">
                <p>
                  {point.confidenceTitle || 'Historical comparison'}:{' '}
                  <span className="font-black text-slate-900">{point.historicalErrorPct}% miss vs actual</span>
                </p>
                <p className="mt-0.5">
                  {point.historicalWithinBand
                    ? 'Actual demand landed inside the expected band for this day.'
                    : 'Actual demand landed outside the expected band for this day.'}
                </p>
              </div>
            )}
            {point.period !== 'history' && point.confidenceLabel && (
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-700">
                <p>
                  {point.confidenceTitle || 'Confidence rating'}:{' '}
                  <span className={`font-black ${confidenceClassName}`}>{point.confidenceLabel}</span>
                  {point.historicalErrorPct !== undefined && point.historicalErrorPct !== null
                    ? ` (${point.historicalErrorPct}% miss vs actual)`
                    : point.confidenceSpreadPct !== undefined && point.confidenceSpreadPct !== null
                    ? ` (${point.confidenceSpreadPct}% width vs point forecast)`
                    : ''}
                </p>
                {point.confidenceDescription && <p className="mt-0.5">{point.confidenceDescription}</p>}
              </div>
            )}
            {featureDrivers.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Drivers
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {featureDrivers.map((driver) => (
                    <span
                      key={driver.label}
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${driver.className}`}
                    >
                      <span>{driver.label}</span>
                      <span>{driver.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              {point.explainability}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-10"
    >
      <header className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowRight className="h-6 w-6 text-slate-500 rotate-180" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{product.name}</h2>
            <p className="text-sm text-slate-500">
              {product.store} • {product.department} • {product.category}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {typeof currentPosition === 'number' && typeof totalCount === 'number' && (
            <div className="hidden md:flex items-center px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest">
              SKU {currentPosition}/{totalCount}
            </div>
          )}
          {onPrevProduct && (
            <button
              onClick={onPrevProduct}
              disabled={!hasPrev}
              className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg font-bold text-xs hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
          )}
          {onNextProduct && (
            <button
              onClick={onNextProduct}
              disabled={!hasNext}
              className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg font-bold text-xs hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          )}
          <button
            onClick={() =>
              triggerQuery(
                `Analyze the performance and stock levels for ${product.name} at ${product.store}`
              )
            }
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition shadow-sm text-sm flex items-center"
          >
            <Zap className="w-4 h-4 mr-2" />
            AI Deep Dive
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Days of Cover
          </p>
          <p className="text-xl font-black text-slate-900 mt-1">{daysOfCover.toFixed(1)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ROP Gap</p>
          <p
            className={`text-xl font-black mt-1 ${ropGap < 0 ? 'text-red-600' : 'text-emerald-600'}`}
          >
            {ropGap}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Risk Score
          </p>
          <p
            className={`text-xl font-black mt-1 ${riskScore >= 70 ? 'text-red-600' : riskScore >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}
          >
            {riskScore}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            7D Forecast
          </p>
          <p className="text-xl font-black text-slate-900 mt-1">{forecastTotal7d}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Analyst Action Center */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Recommended Action
            </p>
            <button
              onClick={primaryAction.onClick}
              className={`w-full py-3 rounded-xl font-bold text-sm transition shadow-sm ${primaryAction.className}`}
            >
              {primaryAction.label}
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-slate-900 flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2 text-indigo-600" />
                Analyst Action Center
              </h3>
              <AnimatePresence>
                {actionFeedback && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {actionFeedback}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Manual Reorder */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Replenishment
              </p>
              <button
                onClick={() => handleAction('Replenishment order triggered successfully')}
                disabled={isUpdating}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center hover:bg-slate-800 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
                Trigger Manual Reorder
              </button>
            </div>

            {/* Reorder Point Update */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Reorder Point (ROP)
                </p>
                <button
                  onClick={() => applyAISuggestion('rop')}
                  disabled={!aiRecommendation.ropNeedsChange}
                  className={`text-[10px] font-bold flex items-center ${
                    aiRecommendation.ropNeedsChange
                      ? 'text-indigo-600 hover:underline'
                      : 'text-emerald-700 cursor-default'
                  }`}
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {aiRecommendation.ropNeedsChange
                    ? `AI Suggest: ${aiRecommendation.suggestedROP}`
                    : 'AI Suggest: No change needed'}
                </button>
              </div>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={ropValue}
                  onChange={(e) => setRopValue(parseInt(e.target.value))}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleUpdateROP}
                  className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition"
                >
                  Update
                </button>
              </div>
            </div>

            {/* Safety Stock Update */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Safety Stock
                </p>
                <button
                  onClick={() => applyAISuggestion('safety')}
                  disabled={!aiRecommendation.safetyNeedsChange}
                  className={`text-[10px] font-bold flex items-center ${
                    aiRecommendation.safetyNeedsChange
                      ? 'text-indigo-600 hover:underline'
                      : 'text-emerald-700 cursor-default'
                  }`}
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {aiRecommendation.safetyNeedsChange
                    ? `AI Suggest: ${aiRecommendation.suggestedSafetyStock}`
                    : 'AI Suggest: No change needed'}
                </button>
              </div>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={safetyStockValue}
                  onChange={(e) => setSafetyStockValue(parseInt(e.target.value))}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleUpdateSafetyStock}
                  className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition"
                >
                  Update
                </button>
              </div>
            </div>

            {/* Markdown Trigger */}
            <div className="pt-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Inventory Optimization
              </p>
              <button
                onClick={() => handleAction('Markdown strategy initiated')}
                className="w-full border border-amber-200 bg-amber-50 text-amber-700 py-3 rounded-xl font-bold text-sm flex items-center justify-center hover:bg-amber-100 transition"
              >
                <Tag className="w-4 h-4 mr-2" />
                Trigger Markdown/Promotion
              </button>
              <p className="text-[9px] text-slate-400 mt-2 text-center italic">
                Recommended for slow-moving stock with high shrink risk
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 border-b pb-2">Inventory Snapshot</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Current Stock
                </p>
                <p className="text-xl font-bold text-slate-900">{product.currentStock}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Status
                </p>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${
                    product.status === 'optimal'
                      ? 'bg-green-100 text-green-700'
                      : product.status === 'low'
                        ? 'bg-amber-100 text-amber-700'
                        : product.status === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {product.status}
                </span>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Last Restock
              </p>
              <p className="text-sm font-medium text-slate-600">
                {product.lastRestockDate || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Middle & Right Column: Charts and Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sales & Forecast Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900">Demand History & Forecast</h3>
              <div className="flex space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      Actual Demand
                    </span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                      Forecast / Expected Demand
                  </span>
                </div>
              </div>
            </div>
            <div className="h-64">
              {activeFeatureDriver && activeFeatureLabel && (
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Filtered by
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${activeFeaturePillClassName}`}
                  >
                    <span>{activeFeatureLabel}</span>
                    <span>{activeFeatureMatchCount}d</span>
                  </span>
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    fontSize={10}
                    tick={{ fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    minTickGap={0}
                  />
                  <YAxis
                    fontSize={10}
                    tick={{ fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={renderForecastTooltip} />
                  {historyBoundaryLabel && (
                    <ReferenceLine
                      x={historyBoundaryLabel}
                      stroke="#cbd5e1"
                      strokeDasharray="4 4"
                      label={{
                        value: 'History | Future',
                        position: 'top',
                        fill: '#64748b',
                        fontSize: 10,
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="actualDemand"
                    name="Actual Demand"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    connectNulls
                    dot={{ r: 3, strokeWidth: 0, fill: '#3b82f6' }}
                    activeDot={{ r: 5, strokeWidth: 0, fill: '#1d4ed8' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    name="Forecasted Demand"
                    stroke="#10b981"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    connectNulls
                    dot={{ r: 3, strokeWidth: 0, fill: '#10b981' }}
                    activeDot={{ r: 5, strokeWidth: 0, fill: '#047857' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 px-1">
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Past 7d Avg Miss
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {historicalForecastComparison.meanAbsoluteError} units/day
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Average absolute gap between expected demand and actual demand.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Forecast Bias
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {historicalForecastComparison.meanBiasPct >= 0 ? '+' : ''}
                    {historicalForecastComparison.meanBiasPct}%
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Positive means forecast ran high; negative means it ran low vs actuals.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    In Confidence Band
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {historicalForecastComparison.withinRangeCount}/{historicalForecastComparison.total} days
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Historical actuals that landed inside the model's expected range.
                  </p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className={`rounded-xl border px-3 py-2 ${historicalFitSummary.className}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                    Historical Fit
                  </p>
                  <p className="mt-1 text-sm font-black">{historicalFitSummary.label}</p>
                  <p className="text-[11px] leading-relaxed">{historicalFitSummary.description}</p>
                </div>
                <div className={`rounded-xl border px-3 py-2 ${futureConfidenceSummary.className}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                    Future Outlook Confidence
                  </p>
                  <p className="mt-1 text-sm font-black">{futureConfidenceSummary.label}</p>
                  <p className="text-[11px] leading-relaxed">{futureConfidenceSummary.description}</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                Example: a confidence range of 90-110 means the model expects demand to land inside
                that band. The rating is based on how wide that band is relative to the point
                forecast, not just the raw numbers.
              </p>
              <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                Historical points use fit quality instead: how closely expected demand matched the
                actual day, shown in the tooltip as a miss percentage.
              </p>
              <div className="mt-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Feature Drivers in Horizon
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <button
                    onClick={() =>
                      featureDriverSummary.promoDays > 0 &&
                      setActiveFeatureDriver((prev) => (prev === 'promo' ? null : 'promo'))
                    }
                    disabled={featureDriverSummary.promoDays === 0}
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition ${
                      featureDriverSummary.promoDays === 0
                        ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                        : activeFeatureDriver === 'promo'
                          ? 'bg-violet-700 text-white border-violet-700'
                          : 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100'
                    }`}
                  >
                    <span>Promo</span>
                    <span>{featureDriverSummary.promoDays}d</span>
                  </button>
                  <button
                    onClick={() =>
                      featureDriverSummary.holidayDays > 0 &&
                      setActiveFeatureDriver((prev) => (prev === 'holiday' ? null : 'holiday'))
                    }
                    disabled={featureDriverSummary.holidayDays === 0}
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition ${
                      featureDriverSummary.holidayDays === 0
                        ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                        : activeFeatureDriver === 'holiday'
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <span>Holiday</span>
                    <span>{featureDriverSummary.holidayDays}d</span>
                  </button>
                  <button
                    onClick={() =>
                      featureDriverSummary.weatherDays > 0 &&
                      setActiveFeatureDriver((prev) => (prev === 'weather' ? null : 'weather'))
                    }
                    disabled={featureDriverSummary.weatherDays === 0}
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition ${
                      featureDriverSummary.weatherDays === 0
                        ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                        : activeFeatureDriver === 'weather'
                          ? 'bg-cyan-700 text-white border-cyan-700'
                          : 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100'
                    }`}
                  >
                    <span>Weather</span>
                    <span>{featureDriverSummary.weatherDays}d</span>
                  </button>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      featureDriverSummary.calendarDays === 0
                        ? 'bg-slate-50 text-slate-400 border-slate-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}
                  >
                    <span>Calendar</span>
                    <span>{featureDriverSummary.calendarDays}d</span>
                  </span>
                  {activeFeatureDriver && (
                    <button
                      onClick={() => setActiveFeatureDriver(null)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
                {featureDriverSummary.promoDays === 0 &&
                  featureDriverSummary.holidayDays === 0 &&
                  featureDriverSummary.weatherDays === 0 &&
                  featureDriverSummary.calendarDays === 0 && (
                    <p className="mt-1 text-[10px] text-slate-500">
                      No feature signals found in current persisted forecast. Run a fresh forecast
                      batch to populate Promo/Holiday/Weather drivers.
                    </p>
                  )}
              </div>
            </div>
          </div>

          {/* Analyst Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Loss & Efficiency</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Shrink Rate</span>
                  <span className="text-sm font-bold text-red-600">{product.shrinkRate || 0}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-red-500 h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, (product.shrinkRate || 0) * 10)}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Markdown Rate</span>
                  <span className="text-sm font-bold text-amber-600">
                    {product.markdownRate || 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-amber-500 h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, (product.markdownRate || 0) * 5)}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">OOS Days (Last 30)</span>
                  <span className="text-sm font-bold text-slate-900">
                    {product.oosDays || 0} Days
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Performance Attributes</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Turnover
                  </p>
                  <p className="text-lg font-bold text-slate-900">
                    {product.turnoverRate || 'N/A'}x
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Avg Demand
                  </p>
                  <p className="text-lg font-bold text-slate-900">{product.avgDailyDemand}/day</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Lead Time
                  </p>
                  <p className="text-lg font-bold text-slate-900">{product.leadTime} Days</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Unit Price
                  </p>
                  <p className="text-lg font-bold text-slate-900">${product.price.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Glossary */}
          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-indigo-600" />
              Why This Recommendation
            </h3>
            <div className="space-y-2 text-xs text-slate-600">
              <p>
                <span className="font-black text-slate-700">Formula:</span> ROP = (Avg Daily Demand
                × Lead Time) + Safety Stock
              </p>
              <p>
                <span className="font-black text-slate-700">Current ROP:</span> (
                {product.avgDailyDemand} × {product.leadTime}) + {safetyStockValue} ={' '}
                <span className="font-bold">
                  {product.avgDailyDemand * product.leadTime + safetyStockValue}
                </span>
              </p>
              <p>
                <span className="font-black text-slate-700">Current Stock vs ROP:</span>{' '}
                {product.currentStock} vs{' '}
                {product.avgDailyDemand * product.leadTime + safetyStockValue}
              </p>
              <p>
                <span className="font-black text-slate-700">Interpretation:</span>{' '}
                {ropGap < 0
                  ? 'Stock is below the reorder threshold; replenishment should be prioritized.'
                  : 'Stock remains above reorder threshold; monitor demand shifts and lead-time variability.'}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-indigo-600" />
              Analyst Metric Glossary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">
                  Shrink Rate
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Percentage of inventory lost due to theft, damage, spoilage, or administrative
                  errors. High rates in Produce/Dairy often indicate cold chain issues.
                </p>
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">
                  Markdown Rate
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  The percentage of stock sold at a discount. High markdown rates suggest
                  over-ordering or poor demand forecasting for perishable goods.
                </p>
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">
                  OOS Days
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  "Out of Stock" days in the last 30-day window. Directly correlates to lost revenue
                  and potential customer churn to competitors.
                </p>
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">
                  Turnover Rate
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Calculated as (Cost of Goods Sold / Average Inventory). Measures how efficiently
                  stock is moving through the node.
                </p>
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">
                  Lead Time
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  The duration between placing a replenishment order and the stock becoming
                  available for sale. Critical for ROP calculations.
                </p>
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">
                  Safety Stock
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  The "buffer" inventory held to protect against demand spikes or supply delays.
                  Optimized based on service level targets (e.g., 98%).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductDetailView;
