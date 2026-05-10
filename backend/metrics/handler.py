"""Metrics Lambda handler — returns public-safe operational metrics."""
import json
import os
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

FALLBACK_METRICS = {
    "uptime_percentage": 99.9,
    "uptime_is_estimated": True,
    "p95_latency_ms": None,
    "monthly_cost_usd": None,
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


def _query_synthetic_checks(client, table_name: str, limit: int = 100) -> list[dict]:
    """Query the most recent SYNTHETIC_CHECK records. Uses a higher limit so
    p95 is computed over a meaningful sample (≥20 checks = ~10 healthcheck runs)."""
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
        return 99.9
    successful = sum(1 for c in checks if c.get("status") == "success")
    return round((successful / len(checks)) * 100, 2)


def _compute_p95_latency_ms(checks: list[dict]) -> int | None:
    """Compute the p95 latency from check results.
    Returns None when the sample is too small to be meaningful (< 5 checks)."""
    latencies = [c["latency_ms"] for c in checks if c.get("latency_ms") is not None]
    if len(latencies) < 5:
        return None
    latencies.sort()
    idx = max(0, int(len(latencies) * 0.95) - 1)
    return latencies[idx]


def _get_monthly_cost_usd() -> float | None:
    """Query AWS Cost Explorer for this project's current-month unblended cost.

    Scoped to the 'Project' cost-allocation tag so only resources belonging to
    this deployment are counted — not the entire AWS account.

    Prerequisites (one-time AWS console setup):
      Billing → Cost allocation tags → activate the 'Project' tag.
    Without activation, CE ignores the filter and would return account-wide cost.

    Cost Explorer data lags ~24 h, so we query up to yesterday. Returns None on
    any error so the caller falls back gracefully without exposing internals.
    """
    project_name = os.environ.get("PROJECT_NAME", "platform-resume")

    try:
        import boto3
        # Cost Explorer is a global service — endpoint is always us-east-1
        ce = boto3.client("ce", region_name="us-east-1")
        now = datetime.now(timezone.utc)
        start = now.strftime("%Y-%m-01")
        end = now.strftime("%Y-%m-%d")
        if start == end:
            # First day of the month — no data yet
            logger.info("First day of month, no Cost Explorer data available yet")
            return None
        response = ce.get_cost_and_usage(
            TimePeriod={"Start": start, "End": end},
            Granularity="MONTHLY",
            Metrics=["UnblendedCost"],
            # Filter to this project's tagged resources only.
            # 'Project' must be activated as a cost-allocation tag in AWS Billing.
            Filter={
                "Tags": {
                    "Key": "Project",
                    "Values": [project_name],
                }
            },
        )
        results = response.get("ResultsByTime", [])
        if not results:
            return None
        amount = results[0]["Total"]["UnblendedCost"]["Amount"]
        return round(float(amount), 2)
    except Exception as exc:
        logger.warning("Failed to get monthly cost from Cost Explorer: %s", exc)
        return None


def _build_response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60",
        },
        "body": json.dumps(body),
    }


def lambda_handler(event: dict, context) -> dict:
    table_name = os.environ.get("EVENTS_TABLE_NAME", "")

    if not table_name:
        logger.warning("EVENTS_TABLE_NAME not set — returning estimated metrics")
        return _build_response(200, {
            **FALLBACK_METRICS,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        })

    try:
        client = _get_dynamodb_client()
        last_deployment = _query_last_deployment(client, table_name)
        checks = _query_synthetic_checks(client, table_name, limit=100)
        uptime = _compute_uptime(checks)
        p95 = _compute_p95_latency_ms(checks)
        is_estimated = len(checks) == 0

        monthly_cost = _get_monthly_cost_usd()

        metrics = {
            "uptime_percentage": uptime,
            "uptime_is_estimated": is_estimated,
            "p95_latency_ms": p95,
            "monthly_cost_usd": monthly_cost,
            "deployments_count": 1 if last_deployment else 0,
            "last_deployment": last_deployment,
            "last_deployment_status": last_deployment.get("status") if last_deployment else None,
            "checks_performed": len(checks),
            # Return only the 5 most recent checks publicly (for the health panel)
            "recent_checks": checks[:5],
            "data_source": "live" if not is_estimated else "estimated",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
        return _build_response(200, metrics)

    except Exception as exc:
        logger.error("Unhandled error in metrics handler: %s", exc)
        return _build_response(200, {
            **FALLBACK_METRICS,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        })
