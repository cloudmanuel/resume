"""Health check Lambda handler."""
import json
import os
from datetime import datetime, timezone


def lambda_handler(event: dict, context) -> dict:
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN", "https://manuel-anda.com"),
            "Access-Control-Allow-Methods": "GET,OPTIONS",
        },
        "body": json.dumps({
            "status": "ok",
            "service": "platform-resume-api",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "environment": os.environ.get("ENVIRONMENT", "prod"),
        }),
    }
