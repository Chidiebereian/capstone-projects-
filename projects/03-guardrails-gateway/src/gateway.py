"""Lambda handler: guard the input, call the model with the guardrail attached, return a safe answer."""
import json
import os

import boto3

rt = boto3.client("bedrock-runtime")
GID, GVER = os.environ["GUARDRAIL_ID"], os.environ.get("GUARDRAIL_VERSION", "1")
MODEL = os.getenv("MODEL_ID", "us.anthropic.claude-3-5-haiku-20241022-v1:0")


def handler(event, _context):
    prompt = json.loads(event.get("body") or "{}").get("prompt", "")
    check = rt.apply_guardrail(
        guardrailIdentifier=GID, guardrailVersion=GVER, source="INPUT", content=[{"text": {"text": prompt}}]
    )
    if check["action"] == "GUARDRAIL_INTERVENED":
        outputs = check.get("outputs") or [{"text": ""}]
        sanitized = outputs[0]["text"]
        print(json.dumps({"intervention": check["assessments"]}))  # CloudWatch audit trail
        if any("topicPolicy" in a or "contentPolicy" in a for a in check["assessments"]):
            return {"statusCode": 200, "body": json.dumps({"answer": sanitized, "blocked": True})}
        prompt = sanitized  # PII was masked; continue with the sanitized text

    res = rt.converse(
        modelId=MODEL,
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        inferenceConfig={"maxTokens": 512, "temperature": 0.3},
        guardrailConfig={"guardrailIdentifier": GID, "guardrailVersion": GVER},
    )
    answer = res["output"]["message"]["content"][0]["text"]
    return {"statusCode": 200, "body": json.dumps({"answer": answer, "stopReason": res["stopReason"], "usage": res["usage"]})}
