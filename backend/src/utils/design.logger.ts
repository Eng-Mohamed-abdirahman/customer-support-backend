import { createLogger } from "./logger";

export const designLog = createLogger("DesignPipeline");

export function maskSecret(value: string | undefined, visible = 4): string {
  if (!value) {
    return "(missing)";
  }
  if (value.length <= visible * 2) {
    return "***";
  }
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}
