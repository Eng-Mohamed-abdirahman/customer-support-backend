type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const resolveMinLevel = (): number => {
  if (process.env.NODE_ENV === "test") return Infinity; // keep test output clean
  const configured = (process.env.LOG_LEVEL || "").toLowerCase() as LogLevel;
  if (configured in LEVELS) return LEVELS[configured];
  return process.env.NODE_ENV === "production" ? LEVELS.info : LEVELS.debug;
};

const serializeError = (value: unknown) =>
  value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value;

const write = (level: LogLevel, scope: string, message: string, context?: LogContext) => {
  if (LEVELS[level] < resolveMinLevel()) return;

  const safeContext = context
    ? Object.fromEntries(Object.entries(context).map(([key, value]) => [key, serializeError(value)]))
    : undefined;

  const line =
    process.env.NODE_ENV === "production"
      ? JSON.stringify({ time: new Date().toISOString(), level, scope, message, ...safeContext })
      : `${scope ? `[${scope}] ` : ""}${message}${safeContext ? ` ${JSON.stringify(safeContext)}` : ""}`;

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

export type Logger = {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  child: (scope: string) => Logger;
};

/** Create a logger whose lines are prefixed with `scope` (e.g. "WhatsApp"). */
export const createLogger = (scope = ""): Logger => ({
  debug: (message, context) => write("debug", scope, message, context),
  info: (message, context) => write("info", scope, message, context),
  warn: (message, context) => write("warn", scope, message, context),
  error: (message, context) => write("error", scope, message, context),
  child: (childScope) => createLogger(scope ? `${scope}:${childScope}` : childScope),
});

export const logger = createLogger();
