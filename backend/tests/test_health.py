"""Unit tests for the health Lambda handler."""
import importlib
import importlib.util
import json
import os
import sys


def _load_handler():
    """Load the health handler freshly, avoiding sys.modules name collision."""
    handler_path = os.path.join(os.path.dirname(__file__), "..", "health", "handler.py")
    spec = importlib.util.spec_from_file_location("health_handler", handler_path)
    module = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


def test_health_returns_200(lambda_context):
    h = _load_handler()
    event = {"requestContext": {"http": {"method": "GET"}}}
    response = h.lambda_handler(event, lambda_context)
    assert response["statusCode"] == 200


def test_health_body_status_ok(lambda_context):
    h = _load_handler()
    response = h.lambda_handler({}, lambda_context)
    body = json.loads(response["body"])
    assert body["status"] == "ok"


def test_health_body_service_name(lambda_context):
    h = _load_handler()
    response = h.lambda_handler({}, lambda_context)
    body = json.loads(response["body"])
    assert body["service"] == "platform-resume-api"


def test_health_body_has_timestamp(lambda_context):
    h = _load_handler()
    response = h.lambda_handler({}, lambda_context)
    body = json.loads(response["body"])
    assert "timestamp" in body
    assert body["timestamp"]


def test_health_body_environment(lambda_context, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "staging")
    h = _load_handler()
    response = h.lambda_handler({}, lambda_context)
    body = json.loads(response["body"])
    assert body["environment"] == "staging"


def test_health_cors_header(lambda_context, monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGIN", "https://manuel-anda.com")
    h = _load_handler()
    response = h.lambda_handler({}, lambda_context)
    assert response["headers"]["Access-Control-Allow-Origin"] == "https://manuel-anda.com"


def test_health_content_type(lambda_context):
    h = _load_handler()
    response = h.lambda_handler({}, lambda_context)
    assert response["headers"]["Content-Type"] == "application/json"


def test_health_body_is_valid_json(lambda_context):
    h = _load_handler()
    response = h.lambda_handler({}, lambda_context)
    body = json.loads(response["body"])
    assert isinstance(body, dict)
