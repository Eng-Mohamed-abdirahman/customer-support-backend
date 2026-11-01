export interface KnowledgeTopQuestion {
  question: string
  count: number
  trend: number
}

export interface KnowledgeTrendingTopic {
  topic: string
  changePercent: number
}

export interface KnowledgeRecommendedArticle {
  title: string
  reason: string
  confidence: number
}

export interface KnowledgeInsightsData {
  summary: string
  topQuestions: KnowledgeTopQuestion[]
  trendingTopics: KnowledgeTrendingTopic[]
  unansweredTopics: string[]
  recommendedArticles: KnowledgeRecommendedArticle[]
}

export interface KnowledgeInsightsApiResponse {
  success: boolean
  data: KnowledgeInsightsData
}
