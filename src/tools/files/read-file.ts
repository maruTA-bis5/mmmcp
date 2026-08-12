import type { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, safeFileRepresentation, type ToolResult, toolTextResult } from '../shared.js';
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
    return execute(async () => {
        const representation = await safeFileRepresentation(await client.downloadFile(file_id));
        return toolTextResult(formatFileRepresentation(representation));
    });
}

function formatFileRepresentation(file: Record<string, unknown>): string {
    const labels: Record<string, string> = {
        file_name: 'File Name',
        content_type: 'Content Type',
        size_bytes: 'Size Bytes',
        truncated: 'Truncated',
        binary: 'Binary',
        message: 'Message',
        content: 'Content',
    };
    return Object.entries(file)
        .map(([key, value]) => `${labels[key] ?? key}: ${typeof value === 'string' ? value : String(value)}`)
        .join('\n');
}
