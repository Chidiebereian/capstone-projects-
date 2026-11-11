"""Multi-turn chat with the model-agnostic Converse API, tracking token usage."""
import boto3

rt = boto3.client("bedrock-runtime")
MODEL = "us.anthropic.claude-3-5-haiku-20241022-v1:0"  # swap for any Converse-capable model
system = [{"text": "You are a concise AWS solutions architect."}]
history = []
used = {"inputTokens": 0, "outputTokens": 0}

for question in ["What is Amazon Bedrock?", "How is it different from SageMaker?", "Summarize both in one sentence."]:
    history.append({"role": "user", "content": [{"text": question}]})
    res = rt.converse(modelId=MODEL, system=system, messages=history,
                      inferenceConfig={"maxTokens": 300, "temperature": 0.3, "topP": 0.9})
    reply = res["output"]["message"]
    history.append(reply)
    for k in used:
        used[k] += res["usage"][k]
    print(f"\nQ: {question}\nA: {reply['content'][0]['text']}")

print("\nTotal usage:", used)
