export type DesignType = "poster" | "flyer" | "brochure" | "social_media_post" | "banner"

export type OptimizePromptPayload = {
  rawIntention: string
  referencePhotoUrl?: string
}

export type OptimizePromptResult = {
  success: boolean
  optimizedPrompt: string
}

export type GenerateDesignPayload = {
  designType: DesignType
  promptText: string
  referenceImageUrl?: string
}

export type GenerateDesignResult = {
  success: boolean
  designId: string
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
  generatedImageUrl?: string
  status: "pending" | "completed" | "failed"
  brandSnapshot?: BrandSnapshot
  createdAt?: string
}

export type RegenerateDesignResult = {
  success: boolean
  data: DesignHistoryRecord
}
