import { AiKnowledgeInsightsPanel } from "@/components/dashboard/ai-knowledge-insights-panel"

export const metadata = {
  title: "AI Knowledge Insights | Technov",
  description: "AI-powered analysis of customer conversations — discover top questions, trending topics, and knowledge base gaps.",
}

export default function KnowledgeInsightsPage() {
  return (
    <div className="space-y-8 pb-10">
      <AiKnowledgeInsightsPanel />
    </div>
  )
}
