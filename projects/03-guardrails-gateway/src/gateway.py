"""Lambda handler: guard the input, call the model with the guardrail attached, return a safe answer."""
import json
import os

import boto3

rt = boto3.client("bedrock-runtime")
GID, GVER = os.environ["GUARDRAIL_ID"], os.environ.get("GUARDRAIL_VERSION", "1")
MODEL = os.getenv("MODEL_ID", "us.anthropic.claude-3-5-haiku-20241022-v1:0")


def is_blocking(assessment: dict) -> bool:
    """True when the guardrail blocked (topic, content, words or BLOCK-action PII) rather than only masked."""
    if any(k in assessment for k in ("topicPolicy", "contentPolicy", "wordPolicy")):
        return True
    pii = assessment.get("sensitiveInformationPolicy", {}).get("piiEntities", [])
    return any(e.get("action") == "BLOCKED" for e in pii)


def handler(event, _context):
    prompt = json.loads(event.get("body") or "{}").get("prompt", "")
    check = rt.apply_guardrail(
        guardrailIdentifier=GID, guardrailVersion=GVER, source="INPUT", content=[{"text": {"text": prompt}}]
    )
    if check["action"] == "GUARDRAIL_INTERVENED":
        print(json.dumps({"intervention": check["assessments"]}))  # CloudWatch audit trail
        sanitized = (check.get("outputs") or [{"text": ""}])[0]["text"]
        if any(is_blocking(a) for a in check["assessments"]):
            return {"statusCode": 200, "body": json.dumps({"answer": sanitized, "blocked": True})}
        prompt = sanitized  # PII was only masked; continue with the sanitized text

    res = rt.converse(
        modelId=MODEL,
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        inferenceConfig={"maxTokens": 512, "temperature": 0.3},
        guardrailConfig={"guardrailIdentifier": GID, "guardrailVersion": GVER},
    )
    answer = res["output"]["message"]["content"][0]["text"]
    return {"statusCode": 200, "body": json.dumps({"answer": answer, "stopReason": res["stopReason"], "usage": res["usage"]})}
