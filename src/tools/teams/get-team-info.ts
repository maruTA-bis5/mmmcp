import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolServer } from '../shared.js';

const inputSchema = { team_id: idSchema.describe('Team ID') };

export function registerGetTeamInfoTool(server: ToolServer, client: MattermostClient): void {
  server.registerTool(
    'get_team_info',
    {
      description: 'Get details for a Mattermost team.',
      inputSchema,
    },
    async ({ team_id }: z.infer<z.ZodObject<typeof inputSchema>>) =>
      execute(() => client.api.getTeam(team_id)),
  );
}
