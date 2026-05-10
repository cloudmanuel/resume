"""Health check Lambda handler."""
import json
import os
from datetime import datetime, timezone


def lambda_handler(event: dict, context) -> dict:
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({
            "status": "ok",
            "service": "platform-resume-api",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "environment": os.environ.get("ENVIRONMENT", "prod"),
        }),
    }
