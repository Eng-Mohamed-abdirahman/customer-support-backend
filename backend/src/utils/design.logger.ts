type LogLevel = "info" | "warn" | "error" | "debug";

type LogPayload = Record<string, unknown>;

const prefix = "[DesignPipeline]";

function write(level: LogLevel, event: string, payload?: LogPayload) {
  const line = payload ? `${prefix} ${event} ${JSON.stringify(payload)}` : `${prefix} ${event}`;

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const designLog = {
  info: (event: string, payload?: LogPayload) => write("info", event, payload),
  warn: (event: string, payload?: LogPayload) => write("warn", event, payload),
  error: (event: string, payload?: LogPayload) => write("error", event, payload),
  debug: (event: string, payload?: LogPayload) => write("debug", event, payload),
};

export function maskSecret(value: string | undefined, visible = 4): string {
  if (!value) {
    return "(missing)";
  }
  if (value.length <= visible * 2) {
    return "***";
  }
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}
