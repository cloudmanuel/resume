"""Unit tests for the deployments Lambda handler — sanitization and fallback."""
import importlib.util
import json
import os
from unittest.mock import MagicMock


def _load_deployments_handler():
    """Load deployments handler freshly to avoid sys.modules name collision."""
    path = os.path.join(os.path.dirname(__file__), "..", "deployments", "handler.py")
    spec = importlib.util.spec_from_file_location("deployments_handler_mod", path)
    module = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


deployments_handler = _load_deployments_handler()


def _item(**overrides) -> dict:
    base = {
        "entity_type": {"S": "DEPLOYMENT"},
        "record_id": {"S": "rec-123"},
        "status": {"S": "success"},
        "summary": {"S": "feat: something"},
        "commit_sha": {"S": "abcdef1234567890"},
        "branch": {"S": "main"},
        "created_at": {"S": "2026-07-28T12:00:00Z"},
        "actor": {"S": "github-actions"},
        "run_id": {"S": "999"},
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# _sanitize_deployment
# ---------------------------------------------------------------------------

def test_sanitize_strips_internal_fields():
    result = deployments_handler._sanitize_deployment(_item())
    assert "actor" not in result
    assert "run_id" not in result
    assert result["commit_sha"] == "abcdef12"  # truncated to 8 chars


def test_sanitize_passes_through_duration():
    result = deployments_handler._sanitize_deployment(_item(duration_s={"N": "94"}))
    assert result["duration_s"] == 94


def test_sanitize_defaults_duration_to_zero_when_missing():
    """Records written before duration tracking have no duration_s attribute."""
    result = deployments_handler._sanitize_deployment(_item())
    assert result["duration_s"] == 0


def test_sanitize_handles_malformed_duration():
    result = deployments_handler._sanitize_deployment(_item(duration_s={"N": "not-a-number"}))
    assert result["duration_s"] == 0


# ---------------------------------------------------------------------------
# lambda_handler fallback behavior
# ---------------------------------------------------------------------------

def test_handler_returns_empty_list_without_table_name(lambda_context, monkeypatch):
    monkeypatch.setenv("EVENTS_TABLE_NAME", "")
    response = deployments_handler.lambda_handler({}, lambda_context)
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["deployments"] == []


def test_handler_returns_sanitized_records(lambda_context, monkeypatch):
    client = MagicMock()
    client.query.return_value = {"Items": [_item(duration_s={"N": "87"})]}
    monkeypatch.setattr(deployments_handler, "_get_dynamodb_client", lambda: client)

    response = deployments_handler.lambda_handler({}, lambda_context)
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["deployments"][0]["duration_s"] == 87
    assert "actor" not in body["deployments"][0]
