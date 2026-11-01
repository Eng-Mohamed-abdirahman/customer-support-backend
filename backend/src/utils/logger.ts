type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const resolveMinLevel = (): number => {
  if (process.env.NODE_ENV === "test") return Infinity; // keep test output clean
  const configured = (process.env.LOG_LEVEL || "").toLowerCase() as LogLevel;
  if (configured in LEVELS) return LEVELS[configured];
  return process.env.NODE_ENV === "production" ? LEVELS.info : LEVELS.debug;
};

const serialize = (value: unknown): unknown => {
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, inner instanceof Error ? serialize(inner) : inner]));
  }
  return value;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value) && !(value instanceof Error);

const write = (level: LogLevel, scope: string, message: string, details: unknown[]) => {
  if (LEVELS[level] < resolveMinLevel()) return;

  // A single plain object becomes structured context; anything else is listed under "details".
  const context: Record<string, unknown> | undefined =
    details.length === 0
      ? undefined
      : details.length === 1 && isPlainObject(details[0])
        ? (serialize(details[0]) as Record<string, unknown>)
        : { details: details.length === 1 ? serialize(details[0]) : details.map(serialize) };

  const line =
    process.env.NODE_ENV === "production"
      ? JSON.stringify({ time: new Date().toISOString(), level, scope: scope || undefined, message, ...context })
      : `${scope ? `[${scope}] ` : ""}${message}${context ? ` ${JSON.stringify(context)}` : ""}`;

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

type LogMethod = (message: string, ...details: unknown[]) => void;

export type Logger = Record<LogLevel, LogMethod> & { child: (scope: string) => Logger };

/** Create a logger whose lines are prefixed with `scope` (e.g. "WhatsApp"). */
export const createLogger = (scope = ""): Logger => ({
  debug: (message, ...details) => write("debug", scope, message, details),
  info: (message, ...details) => write("info", scope, message, details),
  warn: (message, ...details) => write("warn", scope, message, details),
  error: (message, ...details) => write("error", scope, message, details),
  child: (childScope) => createLogger(scope ? `${scope}:${childScope}` : childScope),
});

export const logger = createLogger();
