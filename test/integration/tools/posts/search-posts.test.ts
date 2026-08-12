import type { Post, PostSearchResults } from '@mattermost/types/posts';
import type { Team } from '@mattermost/types/teams';
import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { SearchPostsTool } from '../../../../src/tools/posts/search-posts.js';
import { execute, type ToolResult, ToolResultSchema } from '../../../../src/tools/shared.js';
import { getAdminAccessToken, getMattermostUrl } from '../../testShared.js';

describe('search_posts tool', () => {
    it('should search posts in a Mattermost team', async () => {
        const client = await MattermostClient.create({
            url: getMattermostUrl(),
            auth: { token: getAdminAccessToken() },
        });
        const suffix = Date.now().toString(36);
        const searchTerm = `searchable-post-${suffix}`;
        const team = await client.api.createTeam({
            id: '',
            create_at: 0,
            update_at: 0,
            delete_at: 0,
            display_name: `Integration Team ${suffix}`,
            name: `integration-team-${suffix}`,
            description: 'Integration test team',
            email: '',
            type: 'O',
            company_name: '',
            allowed_domains: '',
            invite_id: '',
            allow_open_invite: true,
            scheme_id: '',
            group_constrained: false,
        } satisfies Team);
        const channel = await client.api.createChannel({
            team_id: team.id,
            name: `integration-channel-${suffix}`,
            display_name: `Integration Channel ${suffix}`,
            type: 'O',
        });
        await client.api.createPost({ channel_id: channel.id, message: searchTerm });
        try {
            const searchPostsTool = new SearchPostsTool(client);
            const result: ToolResult = await execute(() =>
                searchPostsTool.definition.handler(client, { team_id: team.id, terms: searchTerm }),
            );

            expect(ToolResultSchema.safeParse(result).success).toBe(true);
            expect(result.content).lengthOf(1);
            const searchResults: PostSearchResults = await client.api.searchPostsWithParams(team.id, {
                terms: searchTerm,
            });
            const posts = searchResults.order
                .map(postId => searchResults.posts[postId])
                .filter((post): post is Post => post !== undefined);
            const expectedContent = posts
                .map(
                    post =>
                        `Post ID: ${post.id}\nChannel ID: ${post.channel_id}\nUser ID: ${post.user_id}\nMessage: ${post.message}`,
                )
                .join('\n\n');
            expect(result.content[0]?.text).toEqual(expectedContent);
        } finally {
            await client.api.deleteTeam(team.id);
        }
    });
});
