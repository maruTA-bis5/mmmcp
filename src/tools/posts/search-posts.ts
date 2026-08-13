import type { Post, PostSearchResults } from '@mattermost/types/posts';
import { z } from 'zod';

import type { MattermostClient } from '../../mattermost/client.js';

import { execute, idSchema, paginationSchema, type ToolResult, toolTextResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = {
    team_id: idSchema.describe('Team ID'),
    terms: z.string().min(1).describe('Mattermost post search terms'),
    is_or_search: z.boolean().optional().describe('Match any term instead of all terms'),
    ...paginationSchema,
};

export class SearchPostsTool extends Tool<typeof inputSchema, ToolResult> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'search_posts',
            description: 'Search posts in a Mattermost team using Mattermost search terms.',
            inputSchema,
            handler: searchPosts,
        });
    }
}

async function searchPosts(
    client: MattermostClient,
    { team_id, ...params }: z.infer<z.ZodObject<typeof inputSchema>>,
): Promise<ToolResult> {
    return execute(async () => {
        const searchResults: PostSearchResults = await client.api.searchPostsWithParams(team_id, params);
        const posts = searchResults.order
            .map(postId => searchResults.posts[postId])
            .filter((post): post is Post => post !== undefined);
        return toolTextResult(
            posts
                .map(
                    post =>
                        `Post ID: ${post.id}\nChannel ID: ${post.channel_id}\nUser ID: ${post.user_id}\nMessage: ${post.message}`,
                )
                .join('\n\n'),
        );
    });
}
