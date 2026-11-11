"""Titan Text Embeddings V2 + cosine similarity search."""
import json
import math

import boto3

rt = boto3.client("bedrock-runtime")


def embed(text: str, dims: int = 512) -> list[float]:
    res = rt.invoke_model(modelId="amazon.titan-embed-text-v2:0",
                          body=json.dumps({"inputText": text, "dimensions": dims, "normalize": True}))
    return json.loads(res["body"].read())["embedding"]


def cosine(a, b):
    return sum(x * y for x, y in zip(a, b)) / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))


docs = ["How do I reset my password?", "Our refund window is 30 days.", "VPN must be on for internal tools.",
        "Expense meals with clients up to $75 per person."]
vecs = [embed(d) for d in docs]
query = embed("Can I get my money back?")
for score, doc in sorted(((cosine(query, v), d) for v, d in zip(vecs, docs)), reverse=True):
    print(f"{score:.3f}  {doc}")
