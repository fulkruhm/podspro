from forecast import DemandForecaster


def test_forecast_includes_feature_explainability_signals():
    historical = [12, 13, 12, 14, 15, 16, 15, 17, 18, 17, 19, 20, 19, 21]
    historical_features = [
        {
            "promo_flag": i % 4 == 0,
            "holiday_flag": i % 7 == 0,
            "weather_index": 1.0 + ((i % 3) - 1) * 0.05,
            "feature_date": f"2026-02-{(i + 1):02d}",
        }
        for i in range(len(historical))
    ]
    future_features = [
        {"promo_flag": True, "holiday_flag": False, "weather_index": 1.15, "feature_date": "2026-03-01"},
        {"promo_flag": False, "holiday_flag": True, "weather_index": 0.90, "feature_date": "2026-03-02"},
        {"promo_flag": False, "holiday_flag": False, "weather_index": 1.05, "feature_date": "2026-03-03"},
    ]

    forecast, confidence, trend, explainability = DemandForecaster.forecast(
        historical_demand=historical,
        historical_features=historical_features,
        future_features=future_features,
        forecast_days=3,
    )

    assert len(forecast) == 3
    assert len(confidence) == 2
    assert len(confidence[0]) == 3
    assert len(confidence[1]) == 3
    assert len(explainability) == 3
    assert trend in {"📈 Increasing", "📉 Decreasing", "➡️ Stable"}
    assert "promo effect" in explainability[0]
    assert "holiday lift" in explainability[1]
    assert "calendar dow" in explainability[0]


def test_forecast_requires_minimum_history():
    try:
        DemandForecaster.forecast(historical_demand=[1, 2], forecast_days=3)
        assert False, "Expected ValueError for insufficient historical data"
    except ValueError as error:
        assert "at least 3 historical" in str(error)
