import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { SearchUsersTool } from '../../../../src/tools/users/search-users.js';
import { execute, type ToolResult, ToolResultSchema } from '../../../../src/tools/shared.js';
import { getAdminAccessToken, getMattermostUrl } from '../../testShared.js';

describe('search_users tool', () => {
    it('should search Mattermost users', async () => {
        const client = await MattermostClient.create({
            url: getMattermostUrl(),
            auth: { token: getAdminAccessToken() },
        });
        const searchUsersTool = new SearchUsersTool(client);
        const result: ToolResult = await execute(() =>
            searchUsersTool.definition.handler(client, { term: 'general' }),
        );

        expect(ToolResultSchema.safeParse(result).success).toBe(true);
        expect(result.content).lengthOf(1);
        const users = await client.api.searchUsers('general', {});
        expect(result.content[0]?.text).toEqual(JSON.stringify(users, null, 2));
    });
});