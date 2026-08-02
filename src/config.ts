import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Config {
  mattermost: {
    url: string;
    auth:
      | { token: string }
      | { username: string; password: string };
  };
  readonly: boolean;
  logLevel: LogLevel;
}

const LOG_LEVELS = new Set<LogLevel>(["debug", "info", "warn", "error"]);

export function parseConfig(
  args: readonly string[] = process.argv.slice(2),
  environment: NodeJS.ProcessEnv = process.env,
): Config {
  let url: string | undefined;
  let readonly = false;
  let logLevel: LogLevel = "info";

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--readonly") {
      readonly = true;
      continue;
    }

    if (argument === "--url" || argument === "--log-level") {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new ConfigurationError(`Option ${argument} requires a value.`);
      }
      index += 1;

      if (argument === "--url") {
        url = value;
      } else if (LOG_LEVELS.has(value as LogLevel)) {
        logLevel = value as LogLevel;
      } else {
        throw new ConfigurationError(
          `Invalid log level "${value}". Use debug, info, warn, or error.`,
        );
      }
      continue;
    }

    throw new ConfigurationError(`Unknown option "${argument}".`);
  }

  const mattermostUrl = url ?? environment.MATTERMOST_URL;
  const token = environment.MATTERMOST_TOKEN;
  const username = environment.MATTERMOST_USERNAME;
  const password = environment.MATTERMOST_PASSWORD;

  if (mattermostUrl === undefined || mattermostUrl.trim() === "") {
    throw new ConfigurationError(
      "Mattermost URL is required. Provide --url or MATTERMOST_URL.",
    );
  }
  const hasToken = token !== undefined && token.trim() !== "";
  const hasUsername = username !== undefined && username.trim() !== "";
  const hasPassword = password !== undefined && password.trim() !== "";
  if (!hasToken && (!hasUsername || !hasPassword)) {
    throw new ConfigurationError(
      "Set MATTERMOST_TOKEN or both MATTERMOST_USERNAME and MATTERMOST_PASSWORD.",
    );
  }

  let normalizedUrl: string;
  try {
    const parsedUrl = new URL(mattermostUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new ConfigurationError("Mattermost URL must use HTTP or HTTPS.");
    }
    normalizedUrl =
      `${parsedUrl.origin}${parsedUrl.pathname}`.replace(/\/+$/, "") ||
      parsedUrl.origin;
  } catch {
    throw new ConfigurationError("Mattermost URL must be an absolute HTTP(S) URL.");
  }

  return {
    mattermost: {
      url: normalizedUrl,
      auth: hasToken
        ? { token: token as string }
        : { username: username as string, password: password as string },
    },
    readonly,
    logLevel,
  };
}

export class ConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}
