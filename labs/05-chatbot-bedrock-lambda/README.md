# Lab 05 · Build & Deploy an AI Chatbot with Bedrock & Lambda

**Track:** Foundation Models · **Mode:** Code · **Services:** Amazon Bedrock, AWS Lambda, API Gateway

## Objective
Deployed a serverless chatbot: API Gateway calls a Lambda function that invokes Bedrock and returns the reply.

## What I did
- Wrote a Lambda handler calling Converse
- Exposed it through an HTTP API
- Applied least-privilege IAM for bedrock:InvokeModel

## Reference code
- [`lambda_function.py`](lambda_function.py)
- [`iam-policy.json`](iam-policy.json)

## Used in capstones
- [AI-Powered IT Help Desk](../../projects/05-ai-it-helpdesk) · [live demo](https://chidiebereian.github.io/capstone-projects-/#/helpdesk)
