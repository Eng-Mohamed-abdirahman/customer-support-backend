/** Safe accessors for values caught in `catch` blocks, which are typed `unknown`. */

export const getErrorMessage = (error: unknown, fallback = "Unknown error"): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
};

export const getErrorCode = (error: unknown): string | number | undefined => {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" || typeof code === "number") return code;
  }
  return undefined;
};
