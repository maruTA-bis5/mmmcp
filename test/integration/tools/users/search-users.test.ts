import type { UserProfile } from '@mattermost/types/users';
import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { execute, type ToolResult, ToolResultSchema } from '../../../../src/tools/shared.js';
import { SearchUsersTool } from '../../../../src/tools/users/search-users.js';
import { getAdminAccessToken, getMattermostUrl } from '../../testShared.js';

describe('search_users tool', () => {
    it('should search Mattermost users', async () => {
        const client = await MattermostClient.create({
            url: getMattermostUrl(),
            auth: { token: getAdminAccessToken() },
        });
        const searchUsersTool = new SearchUsersTool(client);
        const result: ToolResult = await execute(() => searchUsersTool.definition.handler(client, { term: 'general' }));

        expect(ToolResultSchema.safeParse(result).success).toBe(true);
        expect(result.content).lengthOf(1);
        const users: UserProfile[] = await client.api.searchUsers('general', {});
        const expectedContent = users
            .map(
                user =>
                    `User ID: ${user.id}\nUsername: ${user.username}\nNickname: ${user.nickname}\nFirst Name: ${user.first_name}\nLast Name: ${user.last_name}\nEmail: ${user.email}`,
            )
            .join('\n\n');
        expect(result.content[0]?.text).toEqual(expectedContent);
    });
});
