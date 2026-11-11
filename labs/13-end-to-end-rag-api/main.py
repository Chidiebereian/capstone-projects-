"""End-to-end RAG in code: chunk -> embed -> index (OpenSearch Serverless k-NN) -> retrieve -> generate."""
import json
import os

import boto3
from opensearchpy import AWSV4SignerAuth, OpenSearch, RequestsHttpConnection

REGION = os.getenv("AWS_REGION", "us-east-1")
rt = boto3.client("bedrock-runtime", region_name=REGION)
auth = AWSV4SignerAuth(boto3.Session().get_credentials(), REGION, "aoss")
os_client = OpenSearch(hosts=[{"host": os.environ["AOSS_HOST"], "port": 443}], http_auth=auth, use_ssl=True,
                       connection_class=RequestsHttpConnection)
INDEX = "handbook"


def chunk(text: str, size: int = 60, overlap: int = 15):
    words = text.split()
    for i in range(0, len(words), size - overlap):
        yield " ".join(words[i:i + size])
        if i + size >= len(words):
            break


def embed(text: str):
    res = rt.invoke_model(modelId="amazon.titan-embed-text-v2:0", body=json.dumps({"inputText": text, "normalize": True}))
    return json.loads(res["body"].read())["embedding"]


def build_index(docs: dict[str, str]):
    if not os_client.indices.exists(index=INDEX):
        os_client.indices.create(index=INDEX, body={
            "settings": {"index.knn": True},
            "mappings": {"properties": {"vector": {"type": "knn_vector", "dimension": 1024}, "text": {"type": "text"}, "source": {"type": "keyword"}}},
        })
    for source, text in docs.items():
        for c in chunk(text):
            os_client.index(index=INDEX, body={"vector": embed(c), "text": c, "source": source})


def answer(question: str, k: int = 3) -> str:
    hits = os_client.search(index=INDEX, body={"size": k, "query": {"knn": {"vector": {"vector": embed(question), "k": k}}}})["hits"]["hits"]
    context = "\n".join(f"[{i + 1}] ({h['_source']['source']}) {h['_source']['text']}" for i, h in enumerate(hits))
    prompt = f"Answer using only the context and cite sources like [1]. If the answer is not there, say so.\n\n{context}\n\nQuestion: {question}"
    res = rt.converse(modelId="us.anthropic.claude-3-5-haiku-20241022-v1:0",
                      messages=[{"role": "user", "content": [{"text": prompt}]}], inferenceConfig={"maxTokens": 300, "temperature": 0})
    return res["output"]["message"]["content"][0]["text"]
