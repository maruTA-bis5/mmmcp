import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, paginationSchema, type ToolServer } from '../shared.js';

const inputSchema = { channel_id: idSchema.describe('Channel ID'), ...paginationSchema };

export function registerGetChannelMembersTool(server: ToolServer, client: MattermostClient): void {
  server.registerTool(
    'get_channel_members',
    {
      description: 'List members of a Mattermost channel.',
      inputSchema,
    },
    async ({ channel_id, page, per_page }: z.infer<z.ZodObject<typeof inputSchema>>) =>
      execute(() => client.api.getChannelMembers(channel_id, page, per_page)),
  );
}
