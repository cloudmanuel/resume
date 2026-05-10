"""pytest fixtures for backend Lambda tests."""
import os
import pytest


# ---------------------------------------------------------------------------
# Environment variable defaults (set before importing handlers)
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def aws_env_vars(monkeypatch):
    """Set required AWS/Lambda environment variables for all tests."""
    monkeypatch.setenv("EVENTS_TABLE_NAME", "platform_resume_events_test")
    monkeypatch.setenv("ALLOWED_ORIGIN", "https://manuel-anda.com")
    monkeypatch.setenv("ENVIRONMENT", "test")
    monkeypatch.setenv("AWS_REGION", "us-east-1")
    monkeypatch.setenv("AWS_DEFAULT_REGION", "us-east-1")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_SECURITY_TOKEN", "testing")
    monkeypatch.setenv("AWS_SESSION_TOKEN", "testing")
    monkeypatch.setenv("SITE_URL", "https://manuel-anda.com")


# ---------------------------------------------------------------------------
# Minimal Lambda context stub
# ---------------------------------------------------------------------------

class LambdaContext:
    """Minimal stub that satisfies type checks in handlers."""
    function_name = "test-function"
    function_version = "$LATEST"
    memory_limit_in_mb = 128
    invoked_function_arn = "arn:aws:lambda:us-east-1:123456789012:function:test"
    aws_request_id = "test-request-id"
    log_group_name = "/aws/lambda/test"
    log_stream_name = "2024/01/01/[$LATEST]test"

    def get_remaining_time_in_millis(self):
        return 30000


@pytest.fixture
def lambda_context():
    return LambdaContext()


# ---------------------------------------------------------------------------
# Sample API Gateway HTTP API event builders
# ---------------------------------------------------------------------------

def make_apigw_event(
    method: str = "GET",
    body: str | None = None,
    source_ip: str = "1.2.3.4",
    is_base64_encoded: bool = False,
) -> dict:
    return {
        "version": "2.0",
        "routeKey": f"{method} /contact",
        "rawPath": "/contact",
        "rawQueryString": "",
        "headers": {
            "content-type": "application/json",
        },
        "requestContext": {
            "http": {
                "method": method,
                "path": "/contact",
                "sourceIp": source_ip,
            },
        },
        "body": body,
        "isBase64Encoded": is_base64_encoded,
    }


@pytest.fixture
def apigw_get_event():
    return make_apigw_event("GET")


@pytest.fixture
def apigw_options_event():
    return make_apigw_event("OPTIONS")


@pytest.fixture
def apigw_post_event():
    import json
    body = json.dumps({
        "name": "Test User",
        "email": "test@example.com",
        "message": "Hello, I am interested in working together.",
    })
    return make_apigw_event("POST", body=body)


@pytest.fixture
def make_post_event():
    """Factory fixture for POST events with custom body."""
    import json

    def _make(data: dict, source_ip: str = "1.2.3.4") -> dict:
        return make_apigw_event("POST", body=json.dumps(data), source_ip=source_ip)

    return _make
