from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app


def client():
    get_settings.cache_clear()
    return TestClient(app)


def test_health_public():
    r = client().get("/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_protected_requires_token(monkeypatch):
    monkeypatch.setenv("PROCESSING_SERVICE_TOKEN", "t0ken")
    c = client()
    assert c.post("/v1/text/analyze", json={"text": "hi"}).status_code == 401
    r = c.post("/v1/text/analyze", json={"text": "Sawubona. Unjani?"}, headers={"Authorization": "Bearer t0ken"})
    assert r.status_code == 200
    assert r.json()["sentences"] == ["Sawubona.", "Unjani?"]


def test_fail_closed_without_configured_token(monkeypatch):
    monkeypatch.setenv("PROCESSING_SERVICE_TOKEN", "")
    assert client().post("/v1/jobs/kick", headers={"Authorization": "Bearer "}).status_code == 401
