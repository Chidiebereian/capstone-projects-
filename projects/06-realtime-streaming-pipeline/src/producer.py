"""Clickstream producer for Kinesis Data Streams with batching and throttling retries."""
import json
import random
import time
import uuid

import boto3

kinesis = boto3.client("kinesis")
STREAM = "clickstream"
REGIONS = ["us-east-1", "eu-west-1", "ap-south-1", "sa-east-1"]


def event() -> dict:
    etype = random.choices(["view", "click", "purchase"], weights=[70, 22, 8])[0]
    return {
        "event_id": str(uuid.uuid4()), "user_id": f"u-{random.randint(10000, 99999)}",
        "event_type": etype, "region": random.choices(REGIONS, weights=[45, 30, 17, 8])[0],
        "revenue": round(random.uniform(30, 55), 2) if etype == "purchase" else 0.0,
        "ts": time.time(),
    }


def send(batch: list[dict], attempt: int = 0) -> None:
    records = [{"Data": json.dumps(e).encode(), "PartitionKey": e["user_id"]} for e in batch]
    res = kinesis.put_records(StreamName=STREAM, Records=records)
    if res["FailedRecordCount"] and attempt < 5:
        failed = [batch[i] for i, r in enumerate(res["Records"]) if "ErrorCode" in r]
        time.sleep(0.1 * 2 ** attempt)  # back off on ProvisionedThroughputExceeded
        send(failed, attempt + 1)


if __name__ == "__main__":
    while True:
        send([event() for _ in range(500)])  # put_records accepts up to 500 records per call
        time.sleep(0.25)
