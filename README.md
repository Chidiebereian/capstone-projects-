# Capstone OS · AWS Generative AI & Data Engineering Portfolio

### ▶ Live interactive demo: **https://chidiebereian.github.io/capstone-projects-/**

Eight production-style capstone projects built from **37 hands-on AWS labs**, covering foundation models, RAG, agentic AI, guardrails, AI services and streaming data engineering. Every capstone has:

1. **An interactive demo** that runs entirely in the browser (no AWS account or login needed), with real algorithms such as BM25 retrieval, BPE tokenization, regex/Luhn PII detection and Kinesis shard-limit simulation.
2. **An AWS implementation** in [`projects/`](projects): boto3, Strands Agents/AgentCore, Step Functions, Spark and Athena code with an architecture diagram.

| # | Capstone | What it shows | AWS stack | Demo |
|---|---|---|---|---|
| 01 | [Enterprise Knowledge Assistant (RAG)](projects/01-enterprise-rag-assistant) | Chunking, retrieval, citations, abstains when unsure | Bedrock Knowledge Bases, Titan Embeddings, OpenSearch Serverless | [open](https://chidiebereian.github.io/capstone-projects-/#/rag) |
| 02 | [Multi-Agent Insurance Claims](projects/02-multi-agent-claims) | Supervisor + 4 specialist agents, tool-call trace, explainable fraud score | AgentCore, Strands Agents, Step Functions, DynamoDB | [open](https://chidiebereian.github.io/capstone-projects-/#/claims) |
| 03 | [Responsible AI Guardrails Gateway](projects/03-guardrails-gateway) | PII masking, denied topics, prompt-injection blocking | Bedrock Guardrails, Converse API, Lambda | [open](https://chidiebereian.github.io/capstone-projects-/#/guardrails) |
| 04 | [Tokenizer & Decoding Lab](projects/04-tokenizer-decoding-lab) | Live BPE training, temperature / top-k / top-p sampling | Hugging Face GPT-2, Bedrock | [open](https://chidiebereian.github.io/capstone-projects-/#/tokenizer) |
| 05 | [AI-Powered IT Help Desk](projects/05-ai-it-helpdesk) | Intents, slot filling, sentiment-aware ticket priority | Lex V2, Lambda, Comprehend, DynamoDB | [open](https://chidiebereian.github.io/capstone-projects-/#/helpdesk) |
| 06 | [Real-Time Clickstream Pipeline](projects/06-realtime-streaming-pipeline) | Shard capacity and throttling, tumbling windows, Athena cost | Kinesis, Spark, S3, Glue, Athena | [open](https://chidiebereian.github.io/capstone-projects-/#/streaming) |
| 07 | [Clinical Documentation Copilot](projects/07-clinical-documentation-copilot) | Medical entities, PHI redaction, SOAP note | Transcribe Medical, Comprehend Medical, Bedrock | [open](https://chidiebereian.github.io/capstone-projects-/#/clinical) |
| 08 | [GenAI Ops: Cost, Eval & Routing](projects/08-genai-ops-cost-eval) | Caching, batch and routing savings; model scorecard | Bedrock, CloudWatch, Batch Inference | [open](https://chidiebereian.github.io/capstone-projects-/#/genaiops) |

## Repository layout

```
site/        Capstone OS: React + TypeScript + Tailwind demo app (deployed to GitHub Pages by Actions)
projects/    8 capstones: architecture, README and AWS reference code
labs/        37 labs: objective, outcomes and reference code (index: labs/README.md)
```

## Tech highlights
- **Frontend:** React 18, TypeScript (strict), Vite, Tailwind, with a dark "OS-style" command-center UI. No backend: every demo is deterministic and runs client-side.
- **GenAI:** Bedrock Converse / InvokeModel, Knowledge Bases (Retrieve, RetrieveAndGenerate), Guardrails (ApplyGuardrail), AgentCore Runtime, Strands Agents, LangGraph, fine-tuning jobs.
- **Data:** Kinesis put_records with retry, Spark Structured Streaming with watermarks, partitioned Parquet, Athena partition projection, Glue + Step Functions orchestration.

## Run the demo locally
```bash
cd site && npm install && npm run dev
```

> Sample data (handbook, claims, patients) is fictional. Model pricing in the GenAI Ops demo uses editable example rates, not live AWS pricing.
