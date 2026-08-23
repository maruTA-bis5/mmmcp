import { describe, expect, it } from 'vitest';
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
                expect(result).toHaveProperty('serverUrl');
                expect(result).toHaveProperty('version');
                expect(result.serverUrl).toBe(expectedServerUrl);
                expect(typeof result.version).toBe('string');
                expect(result.version.length).toBeGreaterThan(0);
            });
        },
    ),
);
