import "express";

// Properties our middlewares attach to every request.
export interface AuthenticatedUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: "admin" | "company-admin" | "staff";
  organizationId: string | null;
  company: string | null;
  accountId: string | null;
}

declare module "express-serve-static-core" {
  interface Request {
    /** Set by `protect` (JWT auth). */
    user?: AuthenticatedUser;
    /** Set by `validateApiKey`: the organization that owns the API key. */
    organization?: Record<string, any>;
    organizationId?: string;
    /** Set by the request-id middleware in app.ts. */
    requestId?: string;
    /** Raw JSON body, kept for webhook signature checks. */
    rawBody?: Buffer;
  }
}
