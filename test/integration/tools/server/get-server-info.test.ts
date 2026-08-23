import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { type GetServerInfoOutput, GetServerInfoTool } from '../../../../src/tools/server/get-server-info.js';
import { getMattermostUrl } from '../../testShared.js';
import { expectToolResultIsError, toolTest } from '../toolstestlib.js';

describe(
    'get_server_info tool',
    toolTest(
        c => new GetServerInfoTool(c),
        context => {
            it('should return server URL and version', async () => {
                const expectedServerUrl = getMattermostUrl();

                const toolResult = await context.mcpClient.callTool({
                    name: 'get_server_info',
                    arguments: {},
                });

                expectToolResultIsError(toolResult).toBeFalsy();
                const result = toolResult.structuredContent as GetServerInfoOutput;
                expect(result).toHaveProperty('mattermost_url');
                expect(result).toHaveProperty('server_version');
                expect(result.mattermost_url).toBe(expectedServerUrl);
                expect(typeof result.server_version).toBe('string');
                expect(result.server_version.length).toBeGreaterThan(0);
            });
        },
    ),
);

describe('get_server_info with username/password auth', () => {
    it('should preserve server version during username/password login', async () => {
        const client = await MattermostClient.create({
            url: getMattermostUrl(),
            auth: { username: 'admin', password: 'admin-password' },
        });
        try {
            const version = client.getServerVersion();
            expect(typeof version).toBe('string');
            expect(version.length).toBeGreaterThan(0);
        } finally {
            await client.logout();
        }
    });
});
