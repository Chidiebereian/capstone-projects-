import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Overview } from "./pages/Overview";
import { LabLibrary } from "./pages/LabLibrary";
import { RagStudio } from "./pages/RagStudio";
import { ClaimsAgents } from "./pages/ClaimsAgents";
import { Guardrails } from "./pages/Guardrails";
import { TokenizerLab } from "./pages/TokenizerLab";
import { HelpDesk } from "./pages/HelpDesk";
import { Streaming } from "./pages/Streaming";
import { Clinical } from "./pages/Clinical";
import { CostOps } from "./pages/CostOps";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="labs" element={<LabLibrary />} />
        <Route path="rag" element={<RagStudio />} />
        <Route path="claims" element={<ClaimsAgents />} />
        <Route path="guardrails" element={<Guardrails />} />
        <Route path="tokenizer" element={<TokenizerLab />} />
        <Route path="helpdesk" element={<HelpDesk />} />
        <Route path="streaming" element={<Streaming />} />
        <Route path="clinical" element={<Clinical />} />
        <Route path="genaiops" element={<CostOps />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
