"""Unit tests for the metrics Lambda handler — focuses on DynamoDB fallback behavior."""
import importlib.util
import json
import os
from unittest.mock import MagicMock


def _load_metrics_handler():
    """Load metrics handler freshly to avoid sys.modules name collision."""
    path = os.path.join(os.path.dirname(__file__), "..", "metrics", "handler.py")
    spec = importlib.util.spec_from_file_location("metrics_handler_mod", path)
    module = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


# Load once at module level so monkeypatch.setattr can reference it
metrics_handler = _load_metrics_handler()


# ---------------------------------------------------------------------------
# Fallback tests — DynamoDB unavailable
# ---------------------------------------------------------------------------

def test_metrics_fallback_when_dynamodb_raises(lambda_context, monkeypatch):
    """When DynamoDB raises, handler should return estimated metrics with 200."""
    def _bad_client(*args, **kwargs):
        raise RuntimeError("DynamoDB unreachable")

    monkeypatch.setattr(metrics_handler, "_get_dynamodb_client", _bad_client)

    event = {"requestContext": {"http": {"method": "GET"}}}
    response = metrics_handler.lambda_handler(event, lambda_context)

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert "uptime_percentage" in body
    assert body.get("uptime_is_estimated") is True


def test_metrics_fallback_no_table_name(lambda_context, monkeypatch):
    """When EVENTS_TABLE_NAME is empty, return estimated metrics."""
    monkeypatch.setenv("EVENTS_TABLE_NAME", "")
    event = {}
    response = metrics_handler.lambda_handler(event, lambda_context)
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body.get("data_source") == "estimated"


def test_metrics_fallback_does_not_expose_internals(lambda_context, monkeypatch):
    """Fallback response must not contain ARNs, account IDs, or stack traces."""
    def _bad_client(*args, **kwargs):
        raise RuntimeError("arn:aws:dynamodb:us-east-1:123456789012:table/secret")

    monkeypatch.setattr(metrics_handler, "_get_dynamodb_client", _bad_client)
    monkeypatch.setenv("EVENTS_TABLE_NAME", "platform_resume_events_test")

    event = {}
    response = metrics_handler.lambda_handler(event, lambda_context)

    body_str = response["body"]
    assert "123456789012" not in body_str
    assert "arn:aws" not in body_str
    assert response["statusCode"] == 200


# ---------------------------------------------------------------------------
# Live DynamoDB path — mocked responses
# ---------------------------------------------------------------------------

def _make_dynamodb_client_mock(deployment_items=None, check_items=None):
    """Build a mock boto3 DynamoDB client that returns given items."""
    mock_client = MagicMock()

    def _query_side_effect(**kwargs):
        pk_val = kwargs["ExpressionAttributeValues"][":pk"]["S"]
        if pk_val == "DEPLOYMENT":
            return {"Items": deployment_items or []}
        elif pk_val == "SYNTHETIC_CHECK":
            return {"Items": check_items or []}
        return {"Items": []}

    mock_client.query.side_effect = _query_side_effect
    return mock_client


def test_metrics_live_path_uptime_100(lambda_context, monkeypatch):
    """All successful checks should yield 100% uptime."""
    checks = [
        {
            "entity_type": {"S": "SYNTHETIC_CHECK"},
            "timestamp_id": {"S": f"16000000{i}#uuid"},
            "status": {"S": "success"},
            "target": {"S": "https://manuel-anda.com/health"},
            "latency_ms": {"N": "120"},
            "region": {"S": "us-east-1"},
            "timestamp": {"S": "2024-01-01T00:00:00+00:00"},
        }
        for i in range(5)
    ]
    mock_client = _make_dynamodb_client_mock(check_items=checks)
    monkeypatch.setattr(metrics_handler, "_get_dynamodb_client", lambda: mock_client)
    monkeypatch.setenv("EVENTS_TABLE_NAME", "platform_resume_events_test")

    event = {}
    response = metrics_handler.lambda_handler(event, lambda_context)
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["uptime_percentage"] == 100.0
    assert body["data_source"] == "live"


def test_metrics_live_path_partial_uptime(lambda_context, monkeypatch):
    """50% successful checks should yield 50% uptime."""
    checks = [
        {"entity_type": {"S": "SYNTHETIC_CHECK"}, "timestamp_id": {"S": f"160000000{i}#x"},
         "status": {"S": "success" if i % 2 == 0 else "failure"},
         "target": {"S": "https://manuel-anda.com"}, "latency_ms": {"N": "100"},
         "region": {"S": "us-east-1"}, "timestamp": {"S": "2024-01-01T00:00:00+00:00"}}
        for i in range(4)
    ]
    mock_client = _make_dynamodb_client_mock(check_items=checks)
    monkeypatch.setattr(metrics_handler, "_get_dynamodb_client", lambda: mock_client)
    monkeypatch.setenv("EVENTS_TABLE_NAME", "platform_resume_events_test")

    event = {}
    response = metrics_handler.lambda_handler(event, lambda_context)
    body = json.loads(response["body"])
    assert body["uptime_percentage"] == 50.0


def test_metrics_no_cors_headers(lambda_context, monkeypatch):
    """CORS is handled by API Gateway — Lambda must NOT return Access-Control-* headers."""
    monkeypatch.setenv("EVENTS_TABLE_NAME", "")
    event = {}
    response = metrics_handler.lambda_handler(event, lambda_context)
    assert "Access-Control-Allow-Origin" not in response["headers"]


def test_metrics_last_deployment_sanitized(lambda_context, monkeypatch):
    """commit_sha must be truncated to 8 chars; no internal ARNs."""
    deployments = [{
        "entity_type": {"S": "DEPLOYMENT"},
        "timestamp_id": {"S": "1700000000#uuid"},
        "record_id": {"S": "some-uuid"},
        "status": {"S": "success"},
        "summary": {"S": "Deploy v1.2.3"},
        "commit_sha": {"S": "abcdef1234567890"},
        "branch": {"S": "main"},
        "created_at": {"S": "2024-01-01T00:00:00+00:00"},
    }]
    mock_client = _make_dynamodb_client_mock(deployment_items=deployments)
    monkeypatch.setattr(metrics_handler, "_get_dynamodb_client", lambda: mock_client)
    monkeypatch.setenv("EVENTS_TABLE_NAME", "platform_resume_events_test")

    event = {}
    response = metrics_handler.lambda_handler(event, lambda_context)
    body = json.loads(response["body"])
    deployment = body.get("last_deployment")
    assert deployment is not None
    assert len(deployment["commit_sha"]) == 8
    assert deployment["commit_sha"] == "abcdef12"
