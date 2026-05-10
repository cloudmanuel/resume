"""Unit tests for the contact Lambda handler — validation and rate limiting."""
import json
import sys
import os
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "contact"))

import handler as contact_handler


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _post_event(data: dict, source_ip: str = "1.2.3.4") -> dict:
    return {
        "version": "2.0",
        "requestContext": {
            "http": {
                "method": "POST",
                "sourceIp": source_ip,
            }
        },
        "body": json.dumps(data),
        "isBase64Encoded": False,
    }


def _get_event() -> dict:
    return {
        "requestContext": {"http": {"method": "GET"}},
    }


def _options_event() -> dict:
    return {
        "requestContext": {"http": {"method": "OPTIONS"}},
    }


def _mock_dynamodb_no_rate_limit():
    """Return a mock client that always passes rate limit check (returns 0 count)."""
    mock = MagicMock()
    mock.query.return_value = {"Count": 0}
    mock.put_item.return_value = {}
    return mock


# ---------------------------------------------------------------------------
# Validation: missing required fields
# ---------------------------------------------------------------------------

def test_contact_rejects_missing_name(lambda_context, monkeypatch):
    monkeypatch.setattr(contact_handler, "_get_dynamodb_client", _mock_dynamodb_no_rate_limit)
    data = {"email": "test@example.com", "message": "Hello"}
    response = contact_handler.lambda_handler(_post_event(data), lambda_context)
    assert response["statusCode"] == 400
    body = json.loads(response["body"])
    assert "name" in body["error"].lower()


def test_contact_rejects_missing_email(lambda_context, monkeypatch):
    monkeypatch.setattr(contact_handler, "_get_dynamodb_client", _mock_dynamodb_no_rate_limit)
    data = {"name": "Test User", "message": "Hello"}
    response = contact_handler.lambda_handler(_post_event(data), lambda_context)
    assert response["statusCode"] == 400
    body = json.loads(response["body"])
    assert "email" in body["error"].lower()


def test_contact_rejects_missing_message(lambda_context, monkeypatch):
    monkeypatch.setattr(contact_handler, "_get_dynamodb_client", _mock_dynamodb_no_rate_limit)
    data = {"name": "Test User", "email": "test@example.com"}
    response = contact_handler.lambda_handler(_post_event(data), lambda_context)
    assert response["statusCode"] == 400
    body = json.loads(response["body"])
    assert "message" in body["error"].lower()


# ---------------------------------------------------------------------------
# Validation: invalid email format
# ---------------------------------------------------------------------------

def test_contact_rejects_invalid_email_no_at(lambda_context, monkeypatch):
    monkeypatch.setattr(contact_handler, "_get_dynamodb_client", _mock_dynamodb_no_rate_limit)
    data = {"name": "Test User", "email": "notanemail", "message": "Hello"}
    response = contact_handler.lambda_handler(_post_event(data), lambda_context)
    assert response["statusCode"] == 400
    body = json.loads(response["body"])
    assert "email" in body["error"].lower()


def test_contact_rejects_invalid_email_no_domain(lambda_context, monkeypatch):
    monkeypatch.setattr(contact_handler, "_get_dynamodb_client", _mock_dynamodb_no_rate_limit)
    data = {"name": "Test User", "email": "user@", "message": "Hello"}
    response = contact_handler.lambda_handler(_post_event(data), lambda_context)
    assert response["statusCode"] == 400


def test_contact_rejects_invalid_email_spaces(lambda_context, monkeypatch):
    monkeypatch.setattr(contact_handler, "_get_dynamodb_client", _mock_dynamodb_no_rate_limit)
    data = {"name": "Test User", "email": "user @example.com", "message": "Hello"}
    response = contact_handler.lambda_handler(_post_event(data), lambda_context)
    assert response["statusCode"] == 400


# ---------------------------------------------------------------------------
# Validation: field length limits
# ---------------------------------------------------------------------------

def test_contact_rejects_name_too_long(lambda_context, monkeypatch):
    monkeypatch.setattr(contact_handler, "_get_dynamodb_client", _mock_dynamodb_no_rate_limit)
    data = {"name": "A" * 101, "email": "test@example.com", "message": "Hello"}
    response = contact_handler.lambda_handler(_post_event(data), lambda_context)
    assert response["statusCode"] == 400


def test_contact_rejects_message_too_long(lambda_context, monkeypatch):
    monkeypatch.setattr(contact_handler, "_get_dynamodb_client", _mock_dynamodb_no_rate_limit)
    data = {"name": "Test", "email": "test@example.com", "message": "M" * 2001}
    response = contact_handler.lambda_handler(_post_event(data), lambda_context)
    assert response["statusCode"] == 400


# ---------------------------------------------------------------------------
# Valid request
# ---------------------------------------------------------------------------

def test_contact_accepts_valid_request(lambda_context, monkeypatch):
    monkeypatch.setattr(contact_handler, "_get_dynamodb_client", _mock_dynamodb_no_rate_limit)
    data = {
        "name": "Manuel Anda",
        "email": "recruiter@company.com",
        "company": "FAANG Corp",
        "opportunity_type": "Full-time",
        "message": "We have a great opportunity for you!",
    }
    response = contact_handler.lambda_handler(_post_event(data), lambda_context)
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body.get("success") is True


def test_contact_accepts_minimal_valid_request(lambda_context, monkeypatch):
    monkeypatch.setattr(contact_handler, "_get_dynamodb_client", _mock_dynamodb_no_rate_limit)
    data = {"name": "Test", "email": "t@e.com", "message": "Hi"}
    response = contact_handler.lambda_handler(_post_event(data), lambda_context)
    assert response["statusCode"] == 200


# ---------------------------------------------------------------------------
# HTTP method handling
# ---------------------------------------------------------------------------

def test_contact_options_returns_204(lambda_context, monkeypatch):
    response = contact_handler.lambda_handler(_options_event(), lambda_context)
    assert response["statusCode"] == 204


def test_contact_get_returns_405(lambda_context, monkeypatch):
    response = contact_handler.lambda_handler(_get_event(), lambda_context)
    assert response["statusCode"] == 405


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------

def test_contact_rate_limit_exceeded(lambda_context, monkeypatch):
    mock = MagicMock()
    mock.query.return_value = {"Count": 5}  # at limit
    monkeypatch.setattr(contact_handler, "_get_dynamodb_client", lambda: mock)
    data = {"name": "Test", "email": "t@e.com", "message": "Hi"}
    response = contact_handler.lambda_handler(_post_event(data), lambda_context)
    assert response["statusCode"] == 429


# ---------------------------------------------------------------------------
# No internal details exposed on error
# ---------------------------------------------------------------------------

def test_contact_no_internals_on_dynamodb_failure(lambda_context, monkeypatch):
    """DynamoDB write failure must NOT expose table names or ARNs."""
    mock = MagicMock()
    mock.query.return_value = {"Count": 0}
    mock.put_item.side_effect = RuntimeError("arn:aws:dynamodb:us-east-1:123456789012:table/secret")
    monkeypatch.setattr(contact_handler, "_get_dynamodb_client", lambda: mock)
    data = {"name": "Test", "email": "t@e.com", "message": "Hi"}
    response = contact_handler.lambda_handler(_post_event(data), lambda_context)
    body_str = response["body"]
    assert "123456789012" not in body_str
    assert "arn:aws" not in body_str
    assert response["statusCode"] in (200, 503)


# ---------------------------------------------------------------------------
# Invalid JSON body
# ---------------------------------------------------------------------------

def test_contact_rejects_invalid_json(lambda_context, monkeypatch):
    event = {
        "requestContext": {"http": {"method": "POST", "sourceIp": "1.2.3.4"}},
        "body": "not-json{{{",
        "isBase64Encoded": False,
    }
    response = contact_handler.lambda_handler(event, lambda_context)
    assert response["statusCode"] == 400


def test_contact_handles_empty_body(lambda_context, monkeypatch):
    monkeypatch.setattr(contact_handler, "_get_dynamodb_client", _mock_dynamodb_no_rate_limit)
    event = {
        "requestContext": {"http": {"method": "POST", "sourceIp": "1.2.3.4"}},
        "body": None,
        "isBase64Encoded": False,
    }
    response = contact_handler.lambda_handler(event, lambda_context)
    assert response["statusCode"] == 400
