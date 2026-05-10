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


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60",
        },
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
    table_name = os.environ.get("EVENTS_TABLE_NAME", "")

    if not table_name:
        logger.error("EVENTS_TABLE_NAME not configured")
        return _response(200, {"deployments": [], "count": 0, "data_source": "unavailable"})

    try:
        client = _get_dynamodb_client()
        items = _query_deployments(client, table_name, limit=10)
        deployments = [_sanitize_deployment(item) for item in items]

        return _response(200, {
            "deployments": deployments,
            "count": len(deployments),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "data_source": "live",
        })

    except Exception as exc:
        logger.error("Unhandled error in deployments handler: %s", exc)
        return _response(200, {
            "deployments": [],
            "count": 0,
            "data_source": "unavailable",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        })
