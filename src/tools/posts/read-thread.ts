import type { PaginatedPostList, Post } from '@mattermost/types/posts';
import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, type ToolResult, toolTextResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = {
    post_id: idSchema.describe('Root or reply post ID'),
    fetch_threads: z.boolean().optional().describe('Include thread metadata'),
};

export class ReadThreadTool extends Tool<typeof inputSchema, ToolResult> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'read_thread',
            description: 'Read the thread containing a Mattermost post.',
            inputSchema,
            handler: readThread,
        });
    }
}

async function readThread(
    client: MattermostClient,
    { post_id, fetch_threads }: z.infer<z.ZodObject<typeof inputSchema>>,
): Promise<ToolResult> {
    return execute(async () => {
        const thread: PaginatedPostList = await client.api.getPostThread(post_id, fetch_threads);
        const posts = thread.order
            .map(threadPostId => thread.posts[threadPostId])
            .filter((post): post is Post => post !== undefined);
        return toolTextResult(
            posts
                .map(
                    post =>
                        `Post ID: ${post.id}\nUser ID: ${post.user_id}\nRoot ID: ${post.root_id}\nMessage: ${post.message}`,
                )
                .join('\n\n'),
        );
    });
}
