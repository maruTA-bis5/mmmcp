import { describe, expect, it } from "vitest";

import { ConfigurationError, parseConfig } from "../src/config.js";

const TOKEN = "personal-access-token";

describe("parseConfig", () => {
  it("uses command-line URL over the environment and accepts readonly mode", () => {
    const config = parseConfig(
      ["--url", "https://cli.example.test/path", "--readonly", "--log-level", "debug"],
      { MATTERMOST_URL: "https://environment.example.test", MATTERMOST_TOKEN: TOKEN },
    );

    expect(config).toEqual({
      mattermost: { url: "https://cli.example.test/path", token: TOKEN },
      readonly: true,
      logLevel: "debug",
    });
  });

  it("uses the environment URL when a command-line URL is absent", () => {
    const config = parseConfig([], {
      MATTERMOST_URL: "https://mattermost.example.test",
      MATTERMOST_TOKEN: TOKEN,
    });

    expect(config.mattermost.url).toBe("https://mattermost.example.test");
  });

  it("preserves a Mattermost reverse-proxy path", () => {
    const config = parseConfig(
      ["--url", "https://mattermost.example.test/chat/"],
      { MATTERMOST_TOKEN: TOKEN },
    );

    expect(config.mattermost.url).toBe("https://mattermost.example.test/chat");
  });

  it("rejects missing credentials and invalid arguments", () => {
    expect(() => parseConfig([], {})).toThrow(ConfigurationError);
    expect(() =>
      parseConfig(["--log-level", "verbose"], {
        MATTERMOST_URL: "https://mattermost.example.test",
        MATTERMOST_TOKEN: TOKEN,
      }),
    ).toThrow('Invalid log level "verbose"');
    expect(() =>
      parseConfig(["--token", TOKEN], {
        MATTERMOST_URL: "https://mattermost.example.test",
        MATTERMOST_TOKEN: TOKEN,
      }),
    ).toThrow('Unknown option "--token"');
  });
});
