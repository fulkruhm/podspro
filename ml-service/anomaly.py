import numpy as np
from schemas import AnomalyResult, InventoryDatapoint
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


class AnomalyDetector:
    """Hybrid anomaly detection: Rule-based + Isolation Forest"""

    def __init__(self, contamination: float = 0.05):
        self.model = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )
        self.scaler = StandardScaler()

    def detect(self, datapoints: list[InventoryDatapoint]) -> list[AnomalyResult]:
        """Detect anomalies in inventory data using hybrid approach"""
        if not datapoints:
            return []

        grouped = {}
        for dp in datapoints:
            key = (dp.product_id, dp.store_id)
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(dp)

        results = []

        for (product_id, store_id), group in grouped.items():
            latest_dp = group[-1]

            rule_anomaly, rule_score, rule_reason, rule_action = self._detect_rule_based(
                latest_dp,
                group
            )

            if rule_anomaly:
                results.append(AnomalyResult(
                    product_id=product_id,
                    store_id=store_id,
                    is_anomaly=True,
                    anomaly_score=float(rule_score),
                    reason=rule_reason,
                    recommended_action=rule_action
                ))
                continue

            if len(group) >= 3:
                stocks = np.array([dp.current_stock for dp in group]).reshape(-1, 1)
                demands = np.array([dp.avg_daily_demand for dp in group]).reshape(-1, 1)
                features = np.concatenate([stocks, demands], axis=1)

                try:
                    features_scaled = self.scaler.fit_transform(features)
                    predictions = self.model.fit_predict(features_scaled)
                    scores = self.model.score_samples(features_scaled)

                    latest_idx = len(group) - 1
                    is_anomaly = predictions[latest_idx] == -1
                    anomaly_score = 1 / (1 + np.exp(-scores[latest_idx]))

                    reason, action = self._explain_anomaly(
                        latest_dp,
                        group,
                        is_anomaly,
                        anomaly_score
                    )

                    if is_anomaly:
                        results.append(AnomalyResult(
                            product_id=product_id,
                            store_id=store_id,
                            is_anomaly=is_anomaly,
                            anomaly_score=float(anomaly_score),
                            reason=reason,
                            recommended_action=action
                        ))
                except Exception:
                    pass

        return results

    def _detect_rule_based(
        self,
        current: InventoryDatapoint,
        history: list[InventoryDatapoint]
    ) -> tuple:
        """Rule-based anomaly detection for immediate issues"""

        if len(history) < 2:
            return False, 0.0, "", ""

        recent_history = history[-7:]
        avg_stock = np.mean([dp.current_stock for dp in recent_history])
        avg_demand = np.mean([dp.avg_daily_demand for dp in recent_history])

        if avg_stock > 0 and current.current_stock < avg_stock * 0.2:
            return (
                True,
                0.95,
                f"🚨 CRITICAL: Stock level ({current.current_stock}) critically low (avg: {avg_stock:.0f})",
                f"⚠️ EMERGENCY REORDER REQUIRED - Stock at only {(current.current_stock / avg_stock * 100) if avg_stock > 0 else 0:.0f}% of average"
            )

        if avg_stock > 0 and current.current_stock > avg_stock * 2.5:
            return (
                True,
                0.80,
                f"⚠️ WARNING: Stock level ({current.current_stock}) unusually high (avg: {avg_stock:.0f})",
                "📦 Consider promotional campaign or warehouse redistribution"
            )

        if avg_demand > 0 and current.avg_daily_demand > avg_demand * 2.0:
            return (
                True,
                0.85,
                f"📈 DEMAND SURGE: Demand ({current.avg_daily_demand:.1f}) extreme (avg: {avg_demand:.1f})",
                "🚀 Immediately increase replenishment - possible market surge detected"
            )

        if avg_stock > 0 and current.current_stock < avg_stock * 0.4 and current.current_stock >= avg_stock * 0.2:
            return (
                True,
                0.70,
                f"⚠️ Low stock: Level ({current.current_stock}) below average (avg: {avg_stock:.0f})",
                "📦 Plan reorder within 24 hours"
            )

        if avg_demand > 0 and current.avg_daily_demand > avg_demand * 1.5 and current.avg_daily_demand <= avg_demand * 2.0:
            return (
                True,
                0.60,
                f"📈 Demand rise: Level ({current.avg_daily_demand:.1f}) above average (avg: {avg_demand:.1f})",
                "🚀 Increase replenishment frequency"
            )

        return False, 0.0, "", ""

    def _explain_anomaly(
        self,
        current: InventoryDatapoint,
        history: list[InventoryDatapoint],
        is_anomaly: bool,
        score: float
    ) -> tuple:
        """Generate human-readable explanations"""

        if not is_anomaly:
            return "Normal inventory levels", "Continue monitoring"

        stocks = [dp.current_stock for dp in history[-7:]]
        demands = [dp.avg_daily_demand for dp in history[-7:]]

        avg_stock = np.mean(stocks)
        avg_demand = np.mean(demands)

        if current.current_stock < avg_stock * 0.5:
            reason = f"Stock level ({current.current_stock}) critically low (avg: {avg_stock:.0f})"
            action = "⚠️ Trigger emergency reorder"
        elif current.current_stock > avg_stock * 2.0:
            reason = f"Stock level ({current.current_stock}) unusually high (avg: {avg_stock:.0f})"
            action = "📦 Consider promotional campaign or redistribution"
        elif current.avg_daily_demand > avg_demand * 1.5:
            reason = f"Demand surge detected ({current.avg_daily_demand:.1f} vs avg {avg_demand:.1f})"
            action = "🚀 Increase replenishment frequency"
        else:
            reason = f"Unexpected pattern detected (anomaly score: {score:.2%})"
            action = "🔍 Review logistics and demand patterns"

        return reason, action
