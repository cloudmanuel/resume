"""Healthcheck Lambda handler — scheduled synthetic monitor writing results to DynamoDB."""
import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

DEFAULT_TIMEOUT_SECONDS = 10


def _get_dynamodb_client():
    import boto3
    region = os.environ.get("AWS_REGION", "us-east-1")
    return boto3.client("dynamodb", region_name=region)


def _http_check(url: str, timeout: int = DEFAULT_TIMEOUT_SECONDS) -> dict:
    """Perform an HTTP GET check and return result dict."""
    start_ms = time.monotonic() * 1000
    try:
        req = Request(url, headers={"User-Agent": "platform-resume-healthcheck/1.0"})
        with urlopen(req, timeout=timeout) as resp:
            status_code = resp.status
        elapsed_ms = int(time.monotonic() * 1000 - start_ms)
        success = 200 <= status_code < 400
        return {
            "status": "success" if success else "failure",
            "http_status_code": status_code,
            "latency_ms": elapsed_ms,
            "error": None,
        }
    except HTTPError as exc:
        elapsed_ms = int(time.monotonic() * 1000 - start_ms)
        return {
            "status": "failure",
            "http_status_code": exc.code,
            "latency_ms": elapsed_ms,
            "error": f"HTTP {exc.code}",
        }
    except URLError as exc:
        elapsed_ms = int(time.monotonic() * 1000 - start_ms)
        return {
            "status": "failure",
            "http_status_code": None,
            "latency_ms": elapsed_ms,
            "error": "Connection error",  # never expose exc.reason — may contain internal details
        }
    except Exception:
        elapsed_ms = int(time.monotonic() * 1000 - start_ms)
        return {
            "status": "failure",
            "http_status_code": None,
            "latency_ms": elapsed_ms,
            "error": "Unexpected error",
        }


def _write_check_result(
    client,
    table_name: str,
    target: str,
    check_result: dict,
    region: str,
    now: datetime,
) -> None:
    """Write a SYNTHETIC_CHECK record to DynamoDB."""
    now_ts = int(now.timestamp())
    record_id = str(uuid.uuid4())
    sk = f"{now_ts}#{record_id}"
    # TTL: 30 days
    ttl = now_ts + (30 * 24 * 3600)

    item = {
        "entity_type": {"S": "SYNTHETIC_CHECK"},
        "timestamp_id": {"S": sk},
        "record_id": {"S": record_id},
        "status": {"S": check_result["status"]},
        "target": {"S": target},
        "latency_ms": {"N": str(check_result["latency_ms"])},
        "region": {"S": region},
        "timestamp": {"S": now.isoformat()},
        "ttl": {"N": str(ttl)},
    }

    if check_result.get("http_status_code") is not None:
        item["http_status_code"] = {"N": str(check_result["http_status_code"])}

    client.put_item(TableName=table_name, Item=item)
    logger.info(
        "Wrote SYNTHETIC_CHECK: target=%s status=%s latency_ms=%d",
        target,
        check_result["status"],
        check_result["latency_ms"],
    )


def lambda_handler(event: dict, context) -> dict:
    table_name = os.environ.get("EVENTS_TABLE_NAME", "")
    site_url = os.environ.get("SITE_URL", "").rstrip("/")
    region = os.environ.get("AWS_REGION", "us-east-1")

    if not site_url:
        logger.error("SITE_URL not configured — cannot run healthcheck")
        return {"statusCode": 500, "body": json.dumps({"error": "configuration error"})}

    if not table_name:
        logger.error("EVENTS_TABLE_NAME not configured — cannot persist results")
        return {"statusCode": 500, "body": json.dumps({"error": "configuration error"})}

    targets = [
        f"{site_url}/health",
        site_url,
    ]

    now = datetime.now(timezone.utc)
    results = []

    try:
        client = _get_dynamodb_client()
    except Exception as exc:
        logger.error("Failed to create DynamoDB client: %s", exc)
        return {"statusCode": 500, "body": json.dumps({"error": "internal error"})}

    for target in targets:
        logger.info("Checking target: %s", target)
        check_result = _http_check(target)
        results.append({"target": target, **check_result})

        try:
            _write_check_result(client, table_name, target, check_result, region, now)
        except Exception as exc:
            logger.error("Failed to write check result for %s: %s", target, exc)

    all_ok = all(r["status"] == "success" for r in results)
    logger.info("Healthcheck complete: %d/%d targets healthy", sum(1 for r in results if r["status"] == "success"), len(results))

    return {
        "statusCode": 200,
        "body": json.dumps({
            "checks_run": len(results),
            "all_healthy": all_ok,
            "region": region,
        }),
    }
