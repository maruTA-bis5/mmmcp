import { describe, expect, it } from 'vitest';
import { type WhoAmIOutput, WhoamiTool } from '../../../../src/tools/users/whoami.js';
import { expectToolResultIsError, toolTest } from '../toolstestlib.js';

describe(
    'whoami tool',
    toolTest(
        c => new WhoamiTool(c),
        context => {
            it('should return the authenticated user profile', async () => {
                const me = await context.mattermostClient.api.getMe();
                const expected: WhoAmIOutput = {
                    userId: me.id,
                    username: me.username,
                    nickname: me.nickname,
                    firstName: me.first_name,
                    lastName: me.last_name,
                };

                const toolResult = await context.mcpClient.callTool({ name: 'whoami', arguments: {} });

                expectToolResultIsError(toolResult).toBeFalsy();
                expect(toolResult.structuredContent).toEqual(expected);
            });
        },
    ),
);
