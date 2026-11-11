"""Count tokens with the Converse API and estimate request cost."""
import sys

import boto3

rt = boto3.client("bedrock-runtime")
MODEL = "us.anthropic.claude-3-5-haiku-20241022-v1:0"
RATES = {"input": 0.8, "output": 4.0}  # example USD per 1M tokens; check current pricing

res = rt.converse(
    modelId=MODEL,
    messages=[{"role": "user", "content": [{"text": " ".join(sys.argv[1:]) or "Explain tokenization in two sentences."}]}],
    inferenceConfig={"maxTokens": 200},
)
u = res["usage"]
cost = u["inputTokens"] / 1e6 * RATES["input"] + u["outputTokens"] / 1e6 * RATES["output"]
print(res["output"]["message"]["content"][0]["text"])
print(f"\ninput={u['inputTokens']} output={u['outputTokens']} est_cost=${cost:.6f}")
