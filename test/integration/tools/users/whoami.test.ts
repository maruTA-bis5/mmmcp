import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { WhoamiTool } from '../../../../src/tools/users/whoami.js';
import { getMattermostUrl, getUserAccessToken } from '../../testShared.js';

describe('whoami tool', async () => {
    const client = await MattermostClient.create({ url: getMattermostUrl(), auth: { token: getUserAccessToken() } });
    const me = await client.api.getMe();
    const whoamiTool = new WhoamiTool(client);
    it('should return the authenticated user profile', async () => {
        const profile = await whoamiTool.definition.handler(client, {});
        expect(profile.id).toEqual(me.id);
    });
});
