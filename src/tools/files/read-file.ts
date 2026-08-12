import type { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, safeFileRepresentation, type ToolServer } from '../shared.js';

const inputSchema = { file_id: idSchema.describe('Mattermost file ID') };

export function registerReadFileTool(server: ToolServer, client: MattermostClient): void {
    server.registerTool(
        'read_file',
        {
            description:
                'Read a text attachment safely. Binary attachments return only metadata and are never emitted as raw content.',
            inputSchema,
        },
        async ({ file_id }: z.infer<z.ZodObject<typeof inputSchema>>) =>
            execute(async () => safeFileRepresentation(await client.downloadFile(file_id))),
    );
}
