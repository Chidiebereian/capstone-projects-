"""Grounded Q&A over a Bedrock Knowledge Base, abstaining when retrieval is weak."""
import os
import sys

import boto3

rt = boto3.client("bedrock-agent-runtime")
KB_ID = os.environ["KB_ID"]
MODEL_ARN = os.environ["MODEL_ARN"]
MIN_SCORE = float(os.getenv("MIN_SCORE", "0.45"))


def ask(question: str, top_k: int = 4) -> dict:
    hits = rt.retrieve(
        knowledgeBaseId=KB_ID,
        retrievalQuery={"text": question},
        retrievalConfiguration={"vectorSearchConfiguration": {"numberOfResults": top_k}},
    )["retrievalResults"]
    if not hits or max(h.get("score", 0) for h in hits) < MIN_SCORE:
        return {"answer": "I can't answer that from the knowledge base.", "citations": []}

    config = {
        "type": "KNOWLEDGE_BASE",
        "knowledgeBaseConfiguration": {
            "knowledgeBaseId": KB_ID,
            "modelArn": MODEL_ARN,
            "retrievalConfiguration": {"vectorSearchConfiguration": {"numberOfResults": top_k}},
        },
    }
    if os.getenv("GUARDRAIL_ID"):
        config["knowledgeBaseConfiguration"]["generationConfiguration"] = {
            "guardrailConfiguration": {"guardrailId": os.environ["GUARDRAIL_ID"], "guardrailVersion": os.getenv("GUARDRAIL_VERSION", "DRAFT")}
        }
    res = rt.retrieve_and_generate(input={"text": question}, retrieveAndGenerateConfiguration=config)
    sources = [
        ref["location"].get("s3Location", {}).get("uri")
        for c in res.get("citations", [])
        for ref in c.get("retrievedReferences", [])
    ]
    return {"answer": res["output"]["text"], "citations": sorted({s for s in sources if s})}


if __name__ == "__main__":
    print(ask(" ".join(sys.argv[1:]) or "How long are customer logs retained?"))
