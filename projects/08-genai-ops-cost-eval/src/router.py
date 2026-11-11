"""Route prompts to a small or large model by estimated complexity."""
import re

import boto3

rt = boto3.client("bedrock-runtime")
SMALL = "us.anthropic.claude-3-5-haiku-20241022-v1:0"
LARGE = "us.anthropic.claude-3-5-sonnet-20241022-v2:0"
HARD = re.compile(r"\b(analy[sz]e|compare|design|architect|prove|step[- ]by[- ]step|trade-?offs?|refactor|debug)\b", re.I)


def pick_model(prompt: str) -> str:
    score = len(prompt) / 800 + 2 * len(HARD.findall(prompt)) + prompt.count("```")
    return LARGE if score >= 2 else SMALL


def ask(prompt: str) -> dict:
    model = pick_model(prompt)
    res = rt.converse(modelId=model, messages=[{"role": "user", "content": [{"text": prompt}]}], inferenceConfig={"maxTokens": 600})
    return {"model": model, "text": res["output"]["message"]["content"][0]["text"], "usage": res["usage"]}


if __name__ == "__main__":
    for p in ["What is our VPN address?", "Compare three architectures for multi-region RAG and analyze the trade-offs."]:
        print(pick_model(p), "<-", p)
