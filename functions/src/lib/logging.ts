type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

const log = ({ level, message, context, error }: LogPayload) => {
  const entry: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context
  };

  if (error instanceof Error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  } else if (error) {
    entry.error = error;
  }

  const line = JSON.stringify(entry);

  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    default:
      console.log(line);
  }
};

export const logger = {
  info: (message: string, context?: Record<string, unknown>) =>
    log({ level: "info", message, context }),
  warn: (message: string, context?: Record<string, unknown>) =>
    log({ level: "warn", message, context }),
  error: (message: string, error?: unknown, context?: Record<string, unknown>) =>
    log({ level: "error", message, error, context }),
  debug: (message: string, context?: Record<string, unknown>) =>
    log({ level: "debug", message, context })
};
