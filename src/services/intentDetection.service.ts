// ─────────────────────────────────────────────────────────────────────────────
// Intent Detection Service
// ─────────────────────────────────────────────────────────────────────────────
// Classifies user messages into intents BEFORE they hit the RAG pipeline.
// Greetings, small‑talk, and social niceties are handled conversationally
// without ever touching the knowledge‑base.
// ─────────────────────────────────────────────────────────────────────────────

export type IntentType =
  | "greeting"
  | "goodbye"
  | "smalltalk"
  | "thanks"
  | "identity"
  | "support_question";

export type IntentResult = {
  intent: IntentType;
  confidence: number;
  shouldRetrieve: boolean;
};

// ── Pattern maps ─────────────────────────────────────────────────────────────

const GREETING_PATTERNS: RegExp[] = [
  /^(hi|hey|hello|hola|yo|hii+|heyy+|helloo+)[\s!.,?]*$/i,
  /^good\s*(morning|afternoon|evening|day|night)[\s!.,?]*$/i,
  /^(howdy|sup|what'?s?\s*up|hiya|heya|aloha)[\s!.,?]*$/i,
  /^(assalamualaikum|salam|marhaba|namaste|bonjour|ciao)[\s!.,?]*$/i,
  /^(greetings|salutations)[\s!.,?]*$/i,
];

const GOODBYE_PATTERNS: RegExp[] = [
  /^(bye|goodbye|good\s*bye|see\s*ya|later|cya|ciao|take\s*care|peace)[\s!.,?]*$/i,
  /^(have\s*a\s*(good|great|nice)\s*(day|night|one|evening))[\s!.,?]*$/i,
  /^(ttyl|talk\s*later|gotta\s*go|i'?m?\s*leaving)[\s!.,?]*$/i,
  /^(thanks?\s*(bye|goodbye)|bye\s*bye)[\s!.,?]*$/i,
];

const THANKS_PATTERNS: RegExp[] = [
  /^(thanks?|thank\s*you|thx|thanx|ty|tysm|much\s*appreciated)[\s!.,?]*$/i,
  /^(thanks?\s*(a\s*lot|so\s*much|very\s*much|a\s*ton|a\s*bunch))[\s!.,?]*$/i,
  /^(i\s*appreciate\s*(it|that|this|your\s*help))[\s!.,?]*$/i,
  /^(cheers|ta|great\s*thanks?)[\s!.,?]*$/i,
  /^(thanks?\s*for\s*(your\s*)?(help|support|assistance|time|info|information))[\s!.,?]*$/i,
];

const SMALLTALK_PATTERNS: RegExp[] = [
  /^how\s*(are|r)\s*(you|u|ya)[\s!.,?]*$/i,
  /^(how'?s?\s*(it\s*going|everything|life|things|your\s*day))[\s!.,?]*$/i,
  /^(what'?s?\s*(good|new|happening|cracking|cooking))[\s!.,?]*$/i,
  /^(i'?m?\s*(good|fine|great|ok|okay|doing\s*well|doing\s*great))[\s!.,?]*$/i,
  /^(nice|cool|awesome|great|wonderful|amazing|fantastic|perfect)[\s!.,?]*$/i,
  /^(lol|haha|hehe|lmao|rofl|😂|😄|🤣)[\s!.,?]*$/i,
  /^(no\s*problem|no\s*worries|all\s*good|np|nw)[\s!.,?]*$/i,
  /^(you'?re?\s*welcome|welcome|my\s*pleasure|anytime)[\s!.,?]*$/i,
  /^(ok|okay|alright|sure|got\s*it|understood|roger|k|kk)[\s!.,?]*$/i,
  /^(yes|yeah|yep|yup|yea|ya|nope|nah|no)[\s!.,?]*$/i,
];

const IDENTITY_PATTERNS: RegExp[] = [
  /who\s*(are|r)\s*(you|u)/i,
  /what\s*(are|r)\s*(you|u)/i,
  /who\s*(am\s*i\s*talking\s*to|is\s*this)/i,
  /are\s*(you|u)\s*(a\s*)?(robot|bot|human|real|ai|machine|person)/i,
  /what'?s?\s*your\s*name/i,
  /introduce\s*yourself/i,
];

// ── Matching helpers ─────────────────────────────────────────────────────────

const matchesAny = (normalized: string, patterns: RegExp[]): boolean =>
  patterns.some((pattern) => pattern.test(normalized));

const normalizeForIntent = (message: string): string =>
  message
    .replace(/[^\w\s'?!.,@😂😄🤣👋]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Classifies a user message into an intent category.
 *
 * Returns early for conversational intents (greeting, goodbye, thanks,
 * smalltalk, identity) so that the RAG pipeline is never triggered
 * for non‑business messages.
 */
const detectIntent = (message: string): IntentResult => {
  const normalized = normalizeForIntent(message);

  // Very short messages are almost always conversational
  if (normalized.length === 0) {
    return { intent: "greeting", confidence: 1.0, shouldRetrieve: false };
  }

  // Order matters: check most specific patterns first
  if (matchesAny(normalized, IDENTITY_PATTERNS)) {
    return { intent: "identity", confidence: 0.95, shouldRetrieve: false };
  }

  if (matchesAny(normalized, GREETING_PATTERNS)) {
    return { intent: "greeting", confidence: 0.95, shouldRetrieve: false };
  }

  if (matchesAny(normalized, GOODBYE_PATTERNS)) {
    return { intent: "goodbye", confidence: 0.95, shouldRetrieve: false };
  }

  if (matchesAny(normalized, THANKS_PATTERNS)) {
    return { intent: "thanks", confidence: 0.95, shouldRetrieve: false };
  }

  if (matchesAny(normalized, SMALLTALK_PATTERNS)) {
    return { intent: "smalltalk", confidence: 0.9, shouldRetrieve: false };
  }

  // Everything else is a potential support question → trigger retrieval
  return { intent: "support_question", confidence: 0.8, shouldRetrieve: true };
};

// ── Conversational response pools ────────────────────────────────────────────
// Multiple responses per intent so the assistant doesn't feel repetitive.

type ConversationalResponsePool = Record<
  Exclude<IntentType, "support_question">,
  string[]
>;

const RESPONSE_POOLS: ConversationalResponsePool = {
  greeting: [
    "Hello! 👋 How can I help you today?",
    "Hi there! 😊 What can I assist you with?",
    "Hey! Welcome! How can I help you today?",
    "Hello! Great to see you. What can I do for you?",
    "Hi! 👋 I'm here to help — what's on your mind?",
  ],
  goodbye: [
    "Goodbye! Have a wonderful day! 👋",
    "Take care! Don't hesitate to reach out if you need anything. 😊",
    "Bye! It was great helping you. Have a great day!",
    "See you later! Feel free to come back anytime.",
    "Goodbye! Wishing you all the best! 👋",
  ],
  thanks: [
    "You're welcome! 😊 Is there anything else I can help with?",
    "Happy to help! Let me know if you need anything else.",
    "Glad I could assist! Feel free to ask if you have more questions.",
    "Anytime! 😊 Don't hesitate to reach out if you need more help.",
    "You're welcome! I'm here if you need anything else.",
  ],
  smalltalk: [
    "I'm doing great, thanks for asking! 😊 How can I assist you today?",
    "All good here! What can I help you with?",
    "I'm here and ready to help! What do you need?",
    "Doing well! Is there something I can assist you with today?",
    "Great, thanks! Let me know how I can help. 😊",
  ],
  identity: [], // handled dynamically with the organization name
};

/**
 * Returns a randomised conversational reply for non‑retrieval intents.
 *
 * For the `identity` intent the organization name is injected.
 */
const getConversationalResponse = (
  intent: Exclude<IntentType, "support_question">,
  organizationName?: string
): string => {
  if (intent === "identity") {
    const name = organizationName?.trim() || "this organization";
    return `I'm the AI support assistant for ${name}. I can help you with questions about our services, pricing, policies, and more. How can I assist you today? 😊`;
  }

  const pool = RESPONSE_POOLS[intent];
  return pool[Math.floor(Math.random() * pool.length)];
};

module.exports = {
  detectIntent,
  getConversationalResponse,
};

export { detectIntent, getConversationalResponse };
