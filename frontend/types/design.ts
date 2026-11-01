export type DesignType = "poster" | "flyer" | "brochure" | "social_media_post" | "banner"

export type LayoutAnalysis = {
  layoutStructure: string
  visualHierarchy: string
  ctaPlacement: string
  contentBlocks: string
  imagePlacement: string
  colorDistribution: string
  typographyHierarchy: string
  decorativeElements: string
  rawAnalysis?: string
}

export type OptimizePromptPayload = {
  rawIntention: string
  referencePhotoUrl?: string
  designType?: DesignType
}

export type OptimizePromptResult = {
  success: boolean
  optimizedPrompt: string
  layoutAnalysis?: LayoutAnalysis | null
}

export type GenerateDesignPayload = {
  designType: DesignType
  promptText: string
  rawUserIntention?: string
  referenceImageUrl?: string
  layoutAnalysis?: LayoutAnalysis | null
}

export type GenerateDesignResult = {
  success: boolean
  designId: string
  status?: "pending" | "processing" | "completed" | "failed"
  generatedImageUrl?: string
}

export type BrandSnapshot = {
  brandName: string
  primaryColor: string
  secondaryColor: string
  fontStyle: string
  logoUrl: string
}

export type DesignHistoryRecord = {
  _id: string
  organizationId: string
  designType: DesignType
  promptText: string
  rawUserIntention?: string
  generatedImageUrl?: string
  status: "pending" | "processing" | "completed" | "failed"
  referenceImageUrl?: string
  generationModel?: string | null
  replicatePredictionId?: string | null
  replicateMetrics?: Record<string, unknown> | null
  usedReferenceImage?: boolean
  compiledPrompt?: string
  layoutAnalysis?: LayoutAnalysis | null
  brandSnapshot?: BrandSnapshot
  createdAt?: string
  updatedAt?: string
}

export type RegenerateDesignPayload = {
  previousDesignId: string
  useUpdatedBrand?: boolean
}

export type ListDesignHistoryParams = {
  status?: DesignHistoryRecord["status"]
  designType?: DesignType
  page?: number
  limit?: number
}

export type ListDesignHistoryResult = {
  success: boolean
  designs: DesignHistoryRecord[]
  total: number
  page: number
  limit: number
}

export type RegenerateDesignResult = {
  success: boolean
  data: DesignHistoryRecord
}
