from datetime import datetime
from typing import List, Optional

import numpy as np


class DemandForecaster:
    """Simple exponential smoothing + trend analysis forecaster"""

    @staticmethod
    def _parse_feature_vector(feature: Optional[dict]) -> dict:
        if not isinstance(feature, dict):
            return {
                "promo_flag": False,
                "holiday_flag": False,
                "weather_index": 1.0,
            }

        weather_index = feature.get("weather_index", 1.0)
        try:
            parsed_weather = float(weather_index)
        except (TypeError, ValueError):
            parsed_weather = 1.0

        return {
            "promo_flag": bool(feature.get("promo_flag", False)),
            "holiday_flag": bool(feature.get("holiday_flag", False)),
            "weather_index": max(0.6, min(1.6, parsed_weather)),
            "feature_date": feature.get("feature_date"),
        }

    @staticmethod
    def _parse_feature_date(date_value: Optional[str]) -> Optional[datetime]:
        if not isinstance(date_value, str) or not date_value.strip():
            return None
        try:
            return datetime.fromisoformat(date_value.replace("Z", "+00:00"))
        except ValueError:
            return None

    @staticmethod
    def _estimate_calendar_effects(data: np.ndarray, parsed_features: List[dict]) -> dict:
        if len(parsed_features) != len(data):
            return {
                "dow": {},
                "dom": {},
                "woy": {},
            }

        baseline_mean = float(np.mean(data)) if len(data) else 0.0
        if baseline_mean <= 0:
            return {"dow": {}, "dom": {}, "woy": {}}

        dow_bins = {idx: [] for idx in range(7)}
        dom_bins: dict[int, list[float]] = {}
        woy_bins: dict[int, list[float]] = {}

        for idx, point in enumerate(parsed_features):
            feature_date = DemandForecaster._parse_feature_date(point.get("feature_date"))
            if feature_date is None:
                continue

            point_value = float(data[idx])
            dow_bins[feature_date.weekday()].append(point_value)
            dom_bins.setdefault(feature_date.day, []).append(point_value)
            woy_bins.setdefault(feature_date.isocalendar().week, []).append(point_value)

        def to_effect_map(source: dict[int, list[float]], min_points: int = 2) -> dict[int, float]:
            effect_map: dict[int, float] = {}
            for key, values in source.items():
                if len(values) >= min_points:
                    ratio = float(np.mean(values) / baseline_mean)
                    effect_map[key] = max(0.75, min(1.25, ratio))
            return effect_map

        dow_effects = to_effect_map(dow_bins)
        dom_effects = to_effect_map(dom_bins)
        woy_effects = to_effect_map(woy_bins, min_points=1)

        return {
            "dow": dow_effects,
            "dom": dom_effects,
            "woy": woy_effects,
        }

    @staticmethod
    def _estimate_feature_effects(data: np.ndarray, historical_features: List[dict]) -> dict:
        if len(historical_features) != len(data):
            return {
                "promo_uplift": 0.12,
                "holiday_uplift": 0.18,
                "weather_beta": 0.20,
            }

        parsed = [DemandForecaster._parse_feature_vector(item) for item in historical_features]

        demand_values = np.array(data, dtype=float)
        promo_mask = np.array([item["promo_flag"] for item in parsed], dtype=bool)
        holiday_mask = np.array([item["holiday_flag"] for item in parsed], dtype=bool)
        weather_values = np.array([item["weather_index"] for item in parsed], dtype=float)

        non_promo = demand_values[~promo_mask]
        promo = demand_values[promo_mask]

        non_holiday = demand_values[~holiday_mask]
        holiday = demand_values[holiday_mask]

        promo_uplift = 0.12
        holiday_uplift = 0.18
        weather_beta = 0.20

        if len(non_promo) > 0 and len(promo) > 0 and np.mean(non_promo) > 0:
            promo_uplift = float(np.mean(promo) / np.mean(non_promo) - 1.0)

        if len(non_holiday) > 0 and len(holiday) > 0 and np.mean(non_holiday) > 0:
            holiday_uplift = float(np.mean(holiday) / np.mean(non_holiday) - 1.0)

        weather_variance = float(np.var(weather_values))
        if weather_variance > 1e-6 and np.mean(demand_values) > 0:
            covariance = float(np.cov(weather_values, demand_values, bias=True)[0][1])
            weather_beta = float(covariance / weather_variance / np.mean(demand_values))

        return {
            "promo_uplift": max(-0.30, min(1.20, promo_uplift)),
            "holiday_uplift": max(-0.30, min(1.50, holiday_uplift)),
            "weather_beta": max(-0.80, min(0.80, weather_beta)),
        }

    @staticmethod
    def forecast(
        historical_demand: List[float],
        historical_features: Optional[List[dict]] = None,
        future_features: Optional[List[dict]] = None,
        forecast_days: int = 7,
        alpha: float = 0.3
    ) -> tuple:
        """
        Forecast future demand using exponential smoothing
        Returns: (forecast, confidence_interval, trend)
        """
        if len(historical_demand) < 3:
            raise ValueError("Need at least 3 historical data points")

        data = np.array(historical_demand, dtype=float)

        forecast = [data[0]]
        for i in range(1, len(data)):
            smoothed = alpha * data[i] + (1 - alpha) * forecast[-1]
            forecast.append(smoothed)

        x = np.arange(len(data))
        z = np.polyfit(x, data, 1)
        trend_slope = z[0]

        last_value = forecast[-1]
        future_forecast = []
        for i in range(forecast_days):
            next_val = last_value + (trend_slope * (i + 1))
            future_forecast.append(max(0, next_val))
            last_value = next_val

        parsed_future_features = [
            DemandForecaster._parse_feature_vector(item)
            for item in (future_features or [])[:forecast_days]
        ]
        while len(parsed_future_features) < forecast_days:
            parsed_future_features.append(DemandForecaster._parse_feature_vector(None))

        feature_effects = DemandForecaster._estimate_feature_effects(data, historical_features or [])
        parsed_historical_features = [
            DemandForecaster._parse_feature_vector(item)
            for item in (historical_features or [])[:len(data)]
        ]
        calendar_effects = DemandForecaster._estimate_calendar_effects(data, parsed_historical_features)

        feature_adjusted_forecast: List[float] = []
        for idx, base_value in enumerate(future_forecast):
            day_feature = parsed_future_features[idx]
            multiplier = 1.0
            if day_feature["promo_flag"]:
                multiplier += feature_effects["promo_uplift"]
            if day_feature["holiday_flag"]:
                multiplier += feature_effects["holiday_uplift"]
            multiplier += feature_effects["weather_beta"] * (day_feature["weather_index"] - 1.0)

            feature_date = DemandForecaster._parse_feature_date(day_feature.get("feature_date"))
            if feature_date is not None:
                dow_multiplier = calendar_effects["dow"].get(feature_date.weekday(), 1.0)
                dom_multiplier = calendar_effects["dom"].get(feature_date.day, 1.0)
                woy_multiplier = calendar_effects["woy"].get(feature_date.isocalendar().week, 1.0)
                calendar_multiplier = (dow_multiplier * 0.5) + (dom_multiplier * 0.25) + (woy_multiplier * 0.25)
                multiplier *= max(0.80, min(1.20, calendar_multiplier))

            adjusted_value = max(0.0, base_value * max(0.40, min(2.50, multiplier)))
            feature_adjusted_forecast.append(adjusted_value)

        future_forecast = feature_adjusted_forecast

        std_dev = np.std(data)
        confidence_lower: List[float] = []
        confidence_upper: List[float] = []
        for idx, forecast_value in enumerate(future_forecast):
            day_feature = parsed_future_features[idx]
            uncertainty_multiplier = 1.0
            if day_feature["promo_flag"]:
                uncertainty_multiplier += 0.12
            if day_feature["holiday_flag"]:
                uncertainty_multiplier += 0.15
            uncertainty_multiplier += abs(day_feature["weather_index"] - 1.0) * 0.40

            day_std = max(0.5, std_dev * uncertainty_multiplier)
            confidence_lower.append(max(0.0, forecast_value - 1.96 * day_std))
            confidence_upper.append(forecast_value + 1.96 * day_std)

        confidence = [confidence_lower, confidence_upper]

        if trend_slope > 0.5:
            trend = "📈 Increasing"
        elif trend_slope < -0.5:
            trend = "📉 Decreasing"
        else:
            trend = "➡️ Stable"

        baseline_window = data[-7:] if len(data) >= 7 else data
        baseline_avg = float(np.mean(baseline_window)) if len(baseline_window) > 0 else 0.0

        explainability: List[str] = []
        for idx, forecast_value in enumerate(future_forecast):
            variance_pct = 0.0
            if baseline_avg > 0:
                variance_pct = ((forecast_value - baseline_avg) / baseline_avg) * 100

            day_feature = parsed_future_features[idx]
            lower_bound = confidence[0][idx]
            upper_bound = confidence[1][idx]
            feature_signals: List[str] = []
            if day_feature["promo_flag"]:
                feature_signals.append(f"promo effect {feature_effects['promo_uplift'] * 100:+.0f}%")
            if day_feature["holiday_flag"]:
                feature_signals.append(f"holiday lift {feature_effects['holiday_uplift'] * 100:+.0f}%")
            weather_delta = (day_feature["weather_index"] - 1.0) * 100
            if abs(weather_delta) >= 2:
                feature_signals.append(f"weather index {day_feature['weather_index']:.2f} ({weather_delta:+.0f}%)")

            feature_date = DemandForecaster._parse_feature_date(day_feature.get("feature_date"))
            if feature_date is not None:
                dow_multiplier = calendar_effects["dow"].get(feature_date.weekday(), 1.0)
                dom_multiplier = calendar_effects["dom"].get(feature_date.day, 1.0)
                woy_multiplier = calendar_effects["woy"].get(feature_date.isocalendar().week, 1.0)

                dow_delta = (dow_multiplier - 1.0) * 100
                dom_delta = (dom_multiplier - 1.0) * 100
                woy_delta = (woy_multiplier - 1.0) * 100

                feature_signals.append(
                    f"calendar dow {dow_delta:+.0f}%, "
                    f"dom {dom_delta:+.0f}%, "
                    f"woy {woy_delta:+.0f}%"
                )

            signal_summary = f", features: {', '.join(feature_signals)}" if feature_signals else ""
            explainability.append(
                f"D+{idx + 1}: {trend.replace('📈 ', '').replace('📉 ', '').replace('➡️ ', '').lower()} trend, "
                f"{variance_pct:+.0f}% vs last-7-day baseline, "
                f"confidence {lower_bound:.0f}-{upper_bound:.0f}{signal_summary}."
            )

        return future_forecast, confidence, trend, explainability

