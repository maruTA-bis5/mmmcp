import type { McpServer } from "@modelcontextprotocol/server";

import type { MattermostClient } from "../mattermost/client.js";
import { registerReadonlyTools } from "../tools/readonly.js";
import { registerWritableTools } from "../tools/writable.js";

export function registerTools(
  server: McpServer,
  client: MattermostClient,
  readonly: boolean,
): void {
  registerReadonlyTools(server, client);
  if (!readonly) {
    registerWritableTools(server, client);
  }
}
