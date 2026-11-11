import { Library, Workflow, ShieldCheck, Binary, Headset, Radio, Stethoscope, Gauge } from "lucide-react";

export type Project = {
  key: string; route: string; short: string; title: string; folder: string;
  icon: typeof Library; color: string; pitch: string; impact: string;
  services: string[]; labs: number[];
};

export const PROJECTS: Project[] = [
  { key: "rag", route: "/rag", short: "RAG Knowledge Assistant", title: "Enterprise Knowledge Assistant (RAG)",
    folder: "projects/01-enterprise-rag-assistant", icon: Library, color: "#22D3EE",
    pitch: "Grounded Q&A over company policy docs with chunking controls, BM25 retrieval, citations and an abstain-when-unsure guard.",
    impact: "Cuts policy lookup time from minutes to seconds and refuses to answer outside the knowledge base.",
    services: ["Bedrock Knowledge Bases", "Titan Embeddings", "OpenSearch Serverless", "S3", "Guardrails"], labs: [10, 11, 12, 13, 9] },
  { key: "claims", route: "/claims", short: "Multi-Agent Claims", title: "Multi-Agent Insurance Claims Platform",
    folder: "projects/02-multi-agent-claims", icon: Workflow, color: "#10B981",
    pitch: "A supervisor agent orchestrates intake, policy verification, fraud scoring and adjudication agents with a full tool-call trace.",
    impact: "Straight-through processing for clean claims; risky ones go to a human with an explainable fraud score.",
    services: ["Bedrock AgentCore", "Strands Agents", "Step Functions", "Lambda", "DynamoDB"], labs: [14, 15, 16, 17, 18] },
  { key: "guardrails", route: "/guardrails", short: "Guardrails Gateway", title: "Responsible AI Guardrails Gateway",
    folder: "projects/03-guardrails-gateway", icon: ShieldCheck, color: "#F59E0B",
    pitch: "A policy layer in front of every model call: PII masking, denied topics, word filters and prompt-injection detection.",
    impact: "Mirrors the Bedrock ApplyGuardrail assessment shape, so policies are tested before they ship.",
    services: ["Bedrock Guardrails", "Converse API", "Lambda", "API Gateway"], labs: [6, 7, 8, 9] },
  { key: "tokenizer", route: "/tokenizer", short: "Tokenizer & Decoding", title: "Transformer Tokenizer & Decoding Lab",
    folder: "projects/04-tokenizer-decoding-lab", icon: Binary, color: "#8B5CF6",
    pitch: "Trains a byte-pair-encoding tokenizer live on your text, then shows how temperature and top-k reshape next-token sampling.",
    impact: "Explains why token counts drive cost and latency, and how decoding settings change model behaviour.",
    services: ["Hugging Face Transformers", "GPT-2", "Bedrock InvokeModel"], labs: [4, 1, 2, 3] },
  { key: "helpdesk", route: "/helpdesk", short: "AI IT Help Desk", title: "AI-Powered IT Help Desk",
    folder: "projects/05-ai-it-helpdesk", icon: Headset, color: "#60A5FA",
    pitch: "A Lex-style conversational bot with intent detection, slot filling and sentiment-aware ticket priority.",
    impact: "Deflects password resets and VPN issues automatically and escalates frustrated users faster.",
    services: ["Amazon Lex V2", "Lambda", "Comprehend", "DynamoDB", "Bedrock"], labs: [27, 28, 29, 31, 5] },
  { key: "streaming", route: "/streaming", short: "Streaming Analytics", title: "Real-Time Clickstream Analytics Pipeline",
    folder: "projects/06-realtime-streaming-pipeline", icon: Radio, color: "#F87171",
    pitch: "Kinesis shards with real throughput limits, Spark tumbling windows, an S3 data lake and Athena queries priced per TB scanned.",
    impact: "Capacity planning made visible: watch throttling appear when producers outrun your shard count.",
    services: ["Kinesis Data Streams", "Spark Structured Streaming", "S3", "Glue Catalog", "Athena"], labs: [34, 36, 35, 33, 32, 37, 18] },
  { key: "clinical", route: "/clinical", short: "Clinical Copilot", title: "Clinical Documentation Copilot",
    folder: "projects/07-clinical-documentation-copilot", icon: Stethoscope, color: "#34D399",
    pitch: "Turns a doctor-patient conversation into a structured SOAP note with medical entity extraction and PHI redaction.",
    impact: "Reduces after-visit documentation time while keeping PHI out of downstream systems.",
    services: ["Transcribe Medical", "Comprehend Medical", "Bedrock", "S3"], labs: [22, 23, 21] },
  { key: "genaiops", route: "/genaiops", short: "GenAI Ops & Cost", title: "GenAI Ops: Cost, Evaluation & Model Routing",
    folder: "projects/08-genai-ops-cost-eval", icon: Gauge, color: "#F472B6",
    pitch: "Models monthly Bedrock spend under prompt caching, batch inference and small-model routing, plus a weighted model scorecard.",
    impact: "Turns the model-selection question into a quantified quality, latency and cost decision.",
    services: ["Bedrock Evaluations", "CloudWatch", "Batch Inference", "Prompt Caching"], labs: [19, 20, 25, 26, 24] },
];
