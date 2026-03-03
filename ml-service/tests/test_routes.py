from fastapi.testclient import TestClient

from app_factory import create_app


client = TestClient(create_app())


def test_health_endpoint():
    response = client.get('/health')
    assert response.status_code == 200
    payload = response.json()
    assert payload['status'] == 'healthy'
    assert payload['service'] == 'PODS ML Service'


def test_info_endpoint():
    response = client.get('/api/ml/info')
    assert response.status_code == 200
    payload = response.json()
    assert payload['service'] == 'PODS ML Service'
    assert 'Anomaly Detection (Isolation Forest)' in payload['capabilities']


def test_forecast_endpoint():
    response = client.post(
        '/api/ml/forecast',
        json={
            'product_id': 'p1',
            'store_id': 's1',
            'historical_demand': [10, 11, 12, 13, 14, 15, 16],
            'forecast_days': 5,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload['product_id'] == 'p1'
    assert payload['store_id'] == 's1'
    assert len(payload['forecast']) == 5
    assert len(payload['explainability']) == 5
