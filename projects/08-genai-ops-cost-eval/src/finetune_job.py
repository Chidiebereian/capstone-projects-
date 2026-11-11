"""Launch a Bedrock model customization (fine-tuning) job from JSONL training data in S3."""
import os
import time

import boto3

bedrock = boto3.client("bedrock")
name = f"support-tone-{int(time.time())}"
bedrock.create_model_customization_job(
    jobName=name,
    customModelName=name,
    roleArn=os.environ["CUSTOMIZATION_ROLE_ARN"],
    baseModelIdentifier="amazon.titan-text-express-v1",
    customizationType="FINE_TUNING",
    trainingDataConfig={"s3Uri": os.environ["TRAIN_S3_URI"]},  # JSONL lines: {"prompt": "...", "completion": "..."}
    outputDataConfig={"s3Uri": os.environ["OUTPUT_S3_URI"]},
    hyperParameters={"epochCount": "2", "batchSize": "1", "learningRate": "0.00001"},
)
print("started", name)
