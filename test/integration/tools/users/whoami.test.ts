import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { execute, type ToolResult, ToolResultSchema } from '../../../../src/tools/shared.js';
import { WhoamiTool } from '../../../../src/tools/users/whoami.js';
import { getMattermostUrl, getUserAccessToken } from '../../testShared.js';

describe('whoami tool', async () => {
    it('should return the authenticated user profile', async () => {
        const client = await MattermostClient.create({
            url: getMattermostUrl(),
            auth: { token: getUserAccessToken() },
        });
        const me = await client.api.getMe();
        const whoamiTool = new WhoamiTool(client);

        const profile: ToolResult = await execute(() => whoamiTool.definition.handler(client, {}));

        expect(ToolResultSchema.safeParse(profile).success).toBe(true);
        expect(profile.content).lengthOf(1);
        const expectedContent = `
User ID: ${me.id}
Username: ${me.username}
Nickname: ${me.nickname}
First Name: ${me.first_name}
Last Name: ${me.last_name}
`;
        expect(profile.content[0]?.text).toEqual(expectedContent.trim());
    });
});
