# Lab 13 · Building an End-to-End RAG System with the API

**Track:** Embeddings & RAG · **Mode:** Code · **Services:** Amazon Bedrock, Amazon S3, OpenSearch Serverless

## Objective
Implemented the full pipeline in code: load, chunk, embed, index, retrieve and generate a grounded answer.

## What I did
- Wrote a chunker with overlap
- Indexed embeddings for k-NN search
- Built a grounded prompt with retrieved context

## Reference code
- [`main.py`](main.py)
- [`requirements.txt`](requirements.txt)

## Used in capstones
- [Enterprise Knowledge Assistant (RAG)](../../projects/01-enterprise-rag-assistant) · [live demo](https://chidiebereian.github.io/capstone-projects-/#/rag)
