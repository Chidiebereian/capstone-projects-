"""Serverless chatbot: API Gateway (HTTP API) -> Lambda -> Bedrock Converse."""
import json
import os

import boto3

rt = boto3.client("bedrock-runtime")
MODEL = os.getenv("MODEL_ID", "us.anthropic.claude-3-5-haiku-20241022-v1:0")


def lambda_handler(event, _context):
    body = json.loads(event.get("body") or "{}")
    messages = body.get("history", []) + [{"role": "user", "content": [{"text": body.get("message", "")}]}]
    res = rt.converse(modelId=MODEL, messages=messages, inferenceConfig={"maxTokens": 400, "temperature": 0.5},
                      system=[{"text": "You are a friendly support assistant. Keep answers under 80 words."}])
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps({"reply": res["output"]["message"]["content"][0]["text"], "usage": res["usage"]}),
    }
