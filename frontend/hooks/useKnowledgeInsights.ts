import { useQuery } from "@tanstack/react-query"
import { fetchKnowledgeInsights } from "@/services/knowledgeInsightsApi"
import type { KnowledgeInsightsData } from "@/types/knowledge-insights"

export function useKnowledgeInsights(range: string = "7d") {
  return useQuery<KnowledgeInsightsData, Error>({
    queryKey: ["knowledge-insights", range],
    queryFn: () => fetchKnowledgeInsights(range),
    refetchInterval: 5 * 60 * 1000, // refresh every 5 minutes (AI analysis is expensive)
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}
