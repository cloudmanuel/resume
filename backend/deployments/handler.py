"""Deployments Lambda handler — returns sanitized list of recent deployment records."""
import json
import logging
import os
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def _get_dynamodb_client():
    import boto3
    return boto3.client("dynamodb")


def _cors_headers(allowed_origin: str) -> dict:
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Cache-Control": "public, max-age=60",
    }


def _response(status_code: int, body: dict, allowed_origin: str) -> dict:
    return {
        "statusCode": status_code,
        "headers": _cors_headers(allowed_origin),
        "body": json.dumps(body),
    }


def _sanitize_deployment(item: dict) -> dict:
    """Strip internal fields and return only public-safe fields."""
    raw_sha = item.get("commit_sha", {}).get("S") or ""
    return {
        "id": item.get("record_id", {}).get("S") or item.get("timestamp_id", {}).get("S", ""),
        "status": item.get("status", {}).get("S"),
        "summary": item.get("summary", {}).get("S"),
        "commit_sha": raw_sha[:8] if raw_sha else None,
        "branch": item.get("branch", {}).get("S"),
        "created_at": item.get("created_at", {}).get("S"),
    }


def _query_deployments(client, table_name: str, limit: int = 10) -> list[dict]:
    """Query the last N DEPLOYMENT records sorted descending by SK."""
    response = client.query(
        TableName=table_name,
        KeyConditionExpression="entity_type = :pk",
        ExpressionAttributeValues={":pk": {"S": "DEPLOYMENT"}},
        ScanIndexForward=False,
        Limit=limit,
    )
    return response.get("Items", [])


def lambda_handler(event: dict, context) -> dict:
    allowed_origin = os.environ.get("ALLOWED_ORIGIN", "https://manuel-anda.com")
    table_name = os.environ.get("EVENTS_TABLE_NAME", "")

    # Handle OPTIONS preflight
    http_method = (
        event.get("requestContext", {}).get("http", {}).get("method", "")
        or event.get("httpMethod", "")
    )
    if http_method == "OPTIONS":
        return {"statusCode": 204, "headers": _cors_headers(allowed_origin), "body": ""}

    if not table_name:
        logger.error("EVENTS_TABLE_NAME not configured")
        return _response(200, {"deployments": [], "count": 0, "data_source": "unavailable"}, allowed_origin)

    try:
        client = _get_dynamodb_client()
        items = _query_deployments(client, table_name, limit=10)
        deployments = [_sanitize_deployment(item) for item in items]

        return _response(200, {
            "deployments": deployments,
            "count": len(deployments),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "data_source": "live",
        }, allowed_origin)

    except Exception as exc:
        logger.error("Unhandled error in deployments handler: %s", exc)
        return _response(200, {
            "deployments": [],
            "count": 0,
            "data_source": "unavailable",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }, allowed_origin)
