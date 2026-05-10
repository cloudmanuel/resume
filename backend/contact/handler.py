"""Contact form Lambda handler — validates, rate-limits, and persists contact requests."""
import hashlib
import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

# Rate limiting: max 5 requests per IP per hour
RATE_LIMIT_MAX = 5
RATE_LIMIT_WINDOW_SECONDS = 3600

# Field length limits
FIELD_LIMITS = {
    "name": 100,
    "email": 200,
    "company": 200,
    "opportunity_type": 200,
    "message": 2000,
}

# TTL: 90 days in seconds
TTL_SECONDS = 90 * 24 * 3600


def _get_dynamodb_client():
    import boto3
    return boto3.client("dynamodb")


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def _error(status_code: int, message: str) -> dict:
    return _response(status_code, {"error": message})


def _hash_ip(ip: str) -> str:
    return hashlib.sha256(ip.encode()).hexdigest()


def _validate_fields(data: dict) -> str | None:
    """Returns an error string if validation fails, else None."""
    # Required fields
    for field in ("name", "email", "message"):
        if not data.get(field):
            return f"'{field}' is required."
        val = str(data[field]).strip()
        if not val:
            return f"'{field}' cannot be blank."
        limit = FIELD_LIMITS[field]
        if len(val) > limit:
            return f"'{field}' exceeds maximum length of {limit} characters."

    # Email format
    if not EMAIL_RE.match(str(data["email"]).strip()):
        return "Invalid email address format."

    # Optional fields — only validate length if present
    for field in ("company", "opportunity_type"):
        val = data.get(field)
        if val is not None:
            if len(str(val).strip()) > FIELD_LIMITS[field]:
                return f"'{field}' exceeds maximum length of {FIELD_LIMITS[field]} characters."

    return None


def _check_rate_limit(client, table_name: str, ip_hash: str, now_ts: int) -> bool:
    """Returns True if rate limit exceeded."""
    try:
        window_start = now_ts - RATE_LIMIT_WINDOW_SECONDS
        window_start_sk = str(window_start)

        response = client.query(
            TableName=table_name,
            KeyConditionExpression=(
                "entity_type = :pk AND #sk >= :window_start"
            ),
            FilterExpression="source_ip_hash = :ip_hash",
            ExpressionAttributeNames={"#sk": "timestamp_id"},
            ExpressionAttributeValues={
                ":pk": {"S": "CONTACT_REQUEST"},
                ":window_start": {"S": window_start_sk},
                ":ip_hash": {"S": ip_hash},
            },
            Select="COUNT",
        )
        count = response.get("Count", 0)
        return count >= RATE_LIMIT_MAX
    except Exception as exc:
        logger.warning("Rate limit check failed — allowing request: %s", exc)
        return False  # fail open to avoid blocking legitimate requests


def _store_contact(client, table_name: str, data: dict, ip_hash: str, now: datetime) -> None:
    """Store the contact request in DynamoDB."""
    now_ts = int(now.timestamp())
    record_id = str(uuid.uuid4())
    sk = f"{now_ts}#{record_id}"
    ttl = now_ts + TTL_SECONDS
    message_preview = str(data.get("message", ""))[:200]

    item = {
        "entity_type": {"S": "CONTACT_REQUEST"},
        "timestamp_id": {"S": sk},
        "record_id": {"S": record_id},
        "name": {"S": str(data["name"]).strip()[:100]},
        "email": {"S": str(data["email"]).strip()[:200]},
        "message_preview": {"S": message_preview},
        "created_at": {"S": now.isoformat()},
        "source_ip_hash": {"S": ip_hash},
        "ttl": {"N": str(ttl)},
    }

    company = data.get("company")
    if company:
        item["company"] = {"S": str(company).strip()[:200]}

    opportunity_type = data.get("opportunity_type")
    if opportunity_type:
        item["opportunity_type"] = {"S": str(opportunity_type).strip()[:200]}

    client.put_item(TableName=table_name, Item=item)


def lambda_handler(event: dict, context) -> dict:
    table_name = os.environ.get("EVENTS_TABLE_NAME", "")
    http_method = (
        event.get("requestContext", {}).get("http", {}).get("method", "")
        or event.get("httpMethod", "")
    )

    if http_method != "POST":
        return _error(405, "Method not allowed.")

    # Parse body
    try:
        raw_body = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            import base64
            raw_body = base64.b64decode(raw_body).decode("utf-8")
        data = json.loads(raw_body)
    except (json.JSONDecodeError, ValueError):
        return _error(400, "Invalid request body.")

    # Validate fields
    validation_error = _validate_fields(data)
    if validation_error:
        return _error(400, validation_error)

    # Get client IP
    source_ip = (
        event.get("requestContext", {}).get("http", {}).get("sourceIp")
        or event.get("requestContext", {}).get("identity", {}).get("sourceIp")
        or "unknown"
    )
    ip_hash = _hash_ip(source_ip)
    now = datetime.now(timezone.utc)
    now_ts = int(now.timestamp())

    if not table_name:
        logger.error("EVENTS_TABLE_NAME not configured")
        return _error(503, "Service temporarily unavailable. Please try again later.")

    try:
        client = _get_dynamodb_client()

        # Rate limit check
        if _check_rate_limit(client, table_name, ip_hash, now_ts):
            return _error(429, "Too many requests. Please try again later.")

        # Store contact request
        _store_contact(client, table_name, data, ip_hash, now)

        logger.info("Contact request stored successfully from ip_hash=%s", ip_hash[:8])
        return _response(200, {
            "success": True,
            "message": "Thank you for reaching out! I'll get back to you soon.",
        })

    except Exception as exc:
        logger.error("Unhandled error in contact handler: %s", exc)
        return _error(503, "Service temporarily unavailable. Please try again later.")
