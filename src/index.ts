#!/usr/bin/env node

import { McpServer} from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { parseConfig } from "./config.js";
import { MattermostClient } from "./mattermost/client.js";
import { registerTools } from "./modes/mode-guard.js";

function createServer(client: MattermostClient): McpServer {
  const server = new McpServer({
    name: "mmmcp",
    version: "1.0.0",
  });

  registerTools(server, client, config.readonly);

  if (config.logLevel === "debug") {
    console.error("Mattermost MCP server connected over stdio.");
  }
  return server;
}

const config = parseConfig();
const client = new MattermostClient(config.mattermost);
serveStdio(() => createServer(client));
