import type { UserProfile } from '@mattermost/types/users';
import { z } from 'zod';
import type { MattermostClient } from '../../mattermost/client.js';
import { idSchema, type StructuredToolResult, toolStructuredResult } from '../shared.js';
import { type EmptyInput, Tool } from '../tool.js';

export const WhoAmIOutputSchema = z.strictObject({
    userId: idSchema.describe('The ID of the authenticated user'),
    username: z.string().min(1).describe('The username of the authenticated user'),
    nickname: z.string().optional().describe('The nickname of the authenticated user'),
    firstName: z.string().optional().describe('The first name of the authenticated user'),
    lastName: z.string().optional().describe('The last name of the authenticated user'),
});
export type WhoAmIOutput = z.infer<typeof WhoAmIOutputSchema>;
export class WhoamiTool extends Tool<EmptyInput, WhoAmIOutput, StructuredToolResult<WhoAmIOutput>> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'whoami',
            description: 'Get the authenticated Mattermost user profile.',
            inputSchema: z.strictObject({}),
            outputSchema: WhoAmIOutputSchema,
            handler: whoami,
        });
    }
}

async function whoami(client: MattermostClient): Promise<StructuredToolResult<WhoAmIOutput>> {
    const profile: UserProfile = await client.api.getMe();

    const output: WhoAmIOutput = {
        userId: profile.id,
        username: profile.username,
        nickname: profile.nickname,
        firstName: profile.first_name,
        lastName: profile.last_name,
    };
    return toolStructuredResult(output);
}
