export type TrackKey = "fm" | "prompt" | "rag" | "agents" | "mlops" | "services" | "data";
export const TRACKS: { key: TrackKey; label: string; color: string }[] = [
  { key: "fm", label: "Foundation Models", color: "#8B5CF6" },
  { key: "prompt", label: "Prompting & Responsible AI", color: "#F59E0B" },
  { key: "rag", label: "Embeddings & RAG", color: "#22D3EE" },
  { key: "agents", label: "Agentic AI", color: "#10B981" },
  { key: "mlops", label: "MLOps & Model Customization", color: "#F472B6" },
  { key: "services", label: "AWS AI Services", color: "#60A5FA" },
  { key: "data", label: "Data Engineering", color: "#F87171" },
];
export const trackOf = (k: TrackKey) => TRACKS.find((t) => t.key === k)!;
