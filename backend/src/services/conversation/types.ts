export type ConversationHistoryItem = {
  role: "customer" | "assistant";
  content: string;
};

export type ConversationCustomer = {
  id?: string;
  name?: string;
  email?: string;
};

export type ConversationOrganization = {
  _id: string;
  status: string;
  profile?: {
    name?: string;
    businessType?: string;
    description?: string;
  };
  contact?: {
    supportEmail?: string;
  };
  businessInfo?: {
    workingHours?: string;
    services?: string;
    products?: string;
    policies?: string;
    location?: string;
  };
  supportSettings?: {
    fallbackMessage?: string;
    timezone?: string;
    language?: string;
  };
  knowledgeBaseReference?: string;
  aiSettings?: {
    aiEnabled?: boolean;
    autoReplyEnabled?: boolean;
    humanHandoffEnabled?: boolean;
    modelName?: string;
  };
  allowedChannels?: string[];
  enabledFeatures?: string[];
  api_settings?: {
    total_tokens_used?: number;
    monthly_limit?: number;
  };
};

export type GenerateConversationReplyInput = {
  organization: ConversationOrganization;
  message: string;
  topK?: number;
  channel?: string;
  history?: ConversationHistoryItem[];
  customer?: ConversationCustomer;
};

export type RetrievedSource = {
  embeddingId: string;
  score: number;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  excerpt: string;
  content: string;
};

export type RankedSource = RetrievedSource & {
  rerankScore?: number;
};

export type RetrievedSourceSummary = Omit<RetrievedSource, "content"> & {
  rerankScore?: number;
};

export type UsageSummary = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalTokensUsed: number;
  monthlyLimit: number;
};

export type GenerateConversationReplyResult = {
  reply: string;
  mode: "rag" | "fallback" | "conversational";
  intent: string;
  retrievedSources: RetrievedSourceSummary[];
  usage: UsageSummary;
};
