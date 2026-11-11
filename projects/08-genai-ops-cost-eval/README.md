# 08 · GenAI Ops: Cost, Evaluation & Model Routing

**Live demo:** https://chidiebereian.github.io/capstone-projects-/#/genaiops

Operating LLM workloads means balancing quality, latency and cost. This project provides:

- `src/bedrock_metrics.py` pulls per-model `Invocations`, `InputTokenCount`, `OutputTokenCount` and `InvocationLatency` from CloudWatch (namespace `AWS/Bedrock`) and estimates spend.
- `src/router.py` is a lightweight complexity router: short, simple prompts go to a small model and complex prompts go to a larger one.
- `src/finetune_job.py` launches a Bedrock model customization (fine-tuning) job from JSONL in S3.

Cost levers modelled in the demo:

| Lever | Effect |
|---|---|
| Prompt caching | Cached input tokens are billed at a fraction of the normal input rate |
| Batch inference | About 50% cheaper for asynchronous workloads |
| Model routing | Send easy traffic to a smaller, cheaper model |

**Builds on labs** 19, 20, 24, 25, 26.
