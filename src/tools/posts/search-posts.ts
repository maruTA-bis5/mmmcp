import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, paginationSchema, type ToolServer } from '../shared.js';

const inputSchema = {
  team_id: idSchema.describe('Team ID'),
  terms: z.string().min(1).describe('Mattermost post search terms'),
  is_or_search: z.boolean().optional().describe('Match any term instead of all terms'),
  ...paginationSchema,
};

export function registerSearchPostsTool(server: ToolServer, client: MattermostClient): void {
  server.registerTool(
    'search_posts',
    {
      description: 'Search posts in a Mattermost team using Mattermost search terms.',
      inputSchema,
    },
    async ({ team_id, ...params }: z.infer<z.ZodObject<typeof inputSchema>>) =>
      execute(() => client.api.searchPostsWithParams(team_id, params)),
  );
}
