"""Zero-shot classification, summarisation and extraction with structured JSON output."""
import json

import boto3

rt = boto3.client("bedrock-runtime")
MODEL = "us.anthropic.claude-3-5-haiku-20241022-v1:0"
review = "The checkout was fast, but my order arrived two days late and the box was damaged."

TASKS = {
    "classify": 'Classify the sentiment as positive, negative or mixed. Reply as JSON: {"sentiment": ...}',
    "summarize": 'Summarize in at most 12 words. Reply as JSON: {"summary": ...}',
    "extract": 'List every issue mentioned. Reply as JSON: {"issues": [...]}',
}
for name, instruction in TASKS.items():
    res = rt.converse(modelId=MODEL, inferenceConfig={"maxTokens": 200, "temperature": 0},
                      messages=[{"role": "user", "content": [{"text": f"{instruction}\n\nReview: {review}"}]}])
    text = res["output"]["message"]["content"][0]["text"]
    print(name, json.loads(text[text.find("{"): text.rfind("}") + 1]))
