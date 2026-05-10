"""Metrics Lambda handler — returns public-safe operational metrics."""
import json
import os
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Static fallback estimates (labeled as such)
FALLBACK_METRICS = {
    "uptime_percentage": 99.9,
    "uptime_is_estimated": True,
    "deployments_count": 0,
    "last_deployment": None,
    "last_deployment_status": None,
    "checks_performed": 0,
    "data_source": "estimated",
}


def _get_dynamodb_client():
    import boto3
    region = os.environ.get("AWS_REGION", "us-east-1")
    return boto3.client("dynamodb", region_name=region)


def _query_last_deployment(client, table_name: str) -> dict | None:
    """Query the most recent DEPLOYMENT record."""
    try:
        response = client.query(
            TableName=table_name,
            KeyConditionExpression="entity_type = :pk",
            ExpressionAttributeValues={":pk": {"S": "DEPLOYMENT"}},
            ScanIndexForward=False,
            Limit=1,
        )
        items = response.get("Items", [])
        if not items:
            return None
        item = items[0]
        return {
            "status": item.get("status", {}).get("S"),
            "summary": item.get("summary", {}).get("S"),
            "commit_sha": (item.get("commit_sha", {}).get("S") or "")[:8],
            "branch": item.get("branch", {}).get("S"),
            "created_at": item.get("created_at", {}).get("S"),
        }
    except Exception as exc:
        logger.warning("Failed to query last deployment: %s", exc)
        return None


def _query_synthetic_checks(client, table_name: str, limit: int = 10) -> list[dict]:
    """Query the most recent SYNTHETIC_CHECK records."""
    try:
        response = client.query(
            TableName=table_name,
            KeyConditionExpression="entity_type = :pk",
            ExpressionAttributeValues={":pk": {"S": "SYNTHETIC_CHECK"}},
            ScanIndexForward=False,
            Limit=limit,
        )
        items = response.get("Items", [])
        results = []
        for item in items:
            results.append({
                "status": item.get("status", {}).get("S"),
                "target": item.get("target", {}).get("S"),
                "latency_ms": int(item.get("latency_ms", {}).get("N", 0)),
                "region": item.get("region", {}).get("S"),
                "timestamp": item.get("timestamp", {}).get("S"),
            })
        return results
    except Exception as exc:
        logger.warning("Failed to query synthetic checks: %s", exc)
        return []


def _compute_uptime(checks: list[dict]) -> float:
    """Compute uptime percentage from check results."""
    if not checks:
        return 99.9  # fallback estimate
    successful = sum(1 for c in checks if c.get("status") == "success")
    return round((successful / len(checks)) * 100, 2)


def _build_response(status_code: int, body: dict, allowed_origin: str) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": allowed_origin,
            "Access-Control-Allow-Methods": "GET,OPTIONS",
            "Cache-Control": "public, max-age=60",
        },
        "body": json.dumps(body),
    }


def lambda_handler(event: dict, context) -> dict:
    allowed_origin = os.environ.get("ALLOWED_ORIGIN", "https://manuel-anda.com")
    table_name = os.environ.get("EVENTS_TABLE_NAME", "")

    # Handle OPTIONS preflight
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return _build_response(204, {}, allowed_origin)

    if not table_name:
        logger.warning("EVENTS_TABLE_NAME not set — returning estimated metrics")
        return _build_response(200, FALLBACK_METRICS, allowed_origin)

    try:
        client = _get_dynamodb_client()
        last_deployment = _query_last_deployment(client, table_name)
        checks = _query_synthetic_checks(client, table_name, limit=10)
        uptime = _compute_uptime(checks)
        is_estimated = len(checks) == 0

        metrics = {
            "uptime_percentage": uptime,
            "uptime_is_estimated": is_estimated,
            "deployments_count": 1 if last_deployment else 0,
            "last_deployment": last_deployment,
            "last_deployment_status": last_deployment.get("status") if last_deployment else None,
            "checks_performed": len(checks),
            "recent_checks": checks[:5],  # only return last 5 publicly
            "data_source": "live" if not is_estimated else "estimated",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
        return _build_response(200, metrics, allowed_origin)

    except Exception as exc:
        logger.error("Unhandled error in metrics handler: %s", exc)
        # Never expose internal details — return estimated values
        return _build_response(200, {**FALLBACK_METRICS, "generated_at": datetime.now(timezone.utc).isoformat()}, allowed_origin)
