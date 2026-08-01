import type { MattermostClient } from '../../mattermost/client.js';

import { execute, type ToolServer } from '../shared.js';

export function registerWhoamiTool(server: ToolServer, client: MattermostClient): void {
  server.registerTool(
    'whoami',
    {
      description: 'Get the authenticated Mattermost user profile.',
      inputSchema: {},
    },
    async () => execute(() => client.api.getMe()),
  );
}
