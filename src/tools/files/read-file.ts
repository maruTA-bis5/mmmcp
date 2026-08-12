import type { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, safeFileRepresentation, type ToolResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = { file_id: idSchema.describe('Mattermost file ID') };

export class ReadFileTool extends Tool<typeof inputSchema, ToolResult> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'read_file',
            description:
                'Read a text attachment safely. Binary attachments return only metadata and are never emitted as raw content.',
            inputSchema,
            handler: readFile,
        });
    }
}

async function readFile(
    client: MattermostClient,
    { file_id }: z.infer<z.ZodObject<typeof inputSchema>>,
): Promise<ToolResult> {
    return execute(async () => safeFileRepresentation(await client.downloadFile(file_id)));
}
