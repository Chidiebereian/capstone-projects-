"""Start and wait for a Bedrock Knowledge Base ingestion job (S3 -> chunk -> embed -> index)."""
import os
import time

import boto3

agent = boto3.client("bedrock-agent")


def ingest(kb_id: str, data_source_id: str) -> dict:
    job = agent.start_ingestion_job(knowledgeBaseId=kb_id, dataSourceId=data_source_id)["ingestionJob"]
    while job["status"] in ("STARTING", "IN_PROGRESS"):
        time.sleep(5)
        job = agent.get_ingestion_job(
            knowledgeBaseId=kb_id, dataSourceId=data_source_id, ingestionJobId=job["ingestionJobId"]
        )["ingestionJob"]
    print(job["status"], job.get("statistics", {}))
    return job


if __name__ == "__main__":
    ingest(os.environ["KB_ID"], os.environ["DATA_SOURCE_ID"])
