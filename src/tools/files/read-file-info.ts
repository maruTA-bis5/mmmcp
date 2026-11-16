import type { FileInfo } from '@mattermost/types/files';
import { z } from 'zod';
import type { MattermostClient } from '../../mattermost/client.js';
import { idSchema, type StructuredToolResult, toolStructuredResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = z.strictObject({
    file_id: idSchema.describe('Mattermost file ID from a post attachment; provide the ID, not the file name.'),
});
type ReadFileInfoInput = z.infer<typeof inputSchema>;

export const ReadFileInfoOutputSchema = z.strictObject({
    id: idSchema.describe('The file ID'),
    user_id: idSchema.describe('The ID of the user who uploaded the file'),
    channel_id: idSchema.describe('The ID of the channel where the file was uploaded'),
    create_at: z.number().describe('The file creation time in milliseconds'),
    update_at: z.number().describe('The last file update time in milliseconds'),
    delete_at: z.number().describe('The file deletion time in milliseconds, or zero when not deleted'),
    name: z.string().describe('The original file name'),
    extension: z.string().describe('The file extension'),
    size: z.number().describe('The file size in bytes'),
    mime_type: z.string().describe('The file MIME type'),
    width: z.number().optional().describe('The image width, when available'),
    height: z.number().optional().describe('The image height, when available'),
    has_preview_image: z.boolean().optional().describe('Whether the file has a preview image, when available'),
    clientId: z.string().optional().describe('The client-provided file identifier, when available'),
    post_id: z.string().optional().describe('The ID of the post attached to the file'),
    mini_preview: z.string().nullable().optional().describe('The encoded miniature image preview, when available'),
    archived: z.boolean().describe('Whether the file is archived'),
    link: z.string().optional().describe('A public link, when available'),
});
export type ReadFileInfoOutput = z.infer<typeof ReadFileInfoOutputSchema>;

export class ReadFileInfoTool extends Tool<
    ReadFileInfoInput,
    ReadFileInfoOutput,
    StructuredToolResult<ReadFileInfoOutput>
> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'read_file_info',
            description: 'Get attachment metadata without downloading the file contents.',
            inputSchema,
            outputSchema: ReadFileInfoOutputSchema,
            handler: readFileInfo,
        });
    }
}

async function readFileInfo(
    client: MattermostClient,
    { file_id }: ReadFileInfoInput,
): Promise<StructuredToolResult<ReadFileInfoOutput>> {
    const info: FileInfo = await client.getFileInfo(file_id);
    const output: ReadFileInfoOutput = {
        id: info.id,
        user_id: info.user_id,
        channel_id: info.channel_id,
        create_at: info.create_at,
        update_at: info.update_at,
        delete_at: info.delete_at,
        name: info.name,
        extension: info.extension,
        size: info.size,
        mime_type: info.mime_type,
        width: info.width,
        height: info.height,
        has_preview_image: info.has_preview_image,
        clientId: info.clientId,
        ...(info.post_id === undefined ? {} : { post_id: info.post_id }),
        ...(info.mini_preview === undefined ? {} : { mini_preview: info.mini_preview }),
        archived: info.archived,
        ...(info.link === undefined ? {} : { link: info.link }),
    };
    return toolStructuredResult(output);
}
