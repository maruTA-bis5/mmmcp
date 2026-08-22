import type { UserProfile } from '@mattermost/types/users';
import type { MattermostClient } from '../../mattermost/client.js';

import { type PlainToolResult, toolTextResult } from '../shared.js';
import { type EmptyInput, Tool } from '../tool.js';

export class WhoamiTool extends Tool<EmptyInput, string, PlainToolResult> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'whoami',
            description: 'Get the authenticated Mattermost user profile.',
            inputSchema: {},
            handler: whoami,
        });
    }
}

async function whoami(client: MattermostClient): Promise<PlainToolResult> {
    const profile: UserProfile = await client.api.getMe();
    return toolTextResult(`User ID: ${profile.id}
Username: ${profile.username}
Nickname: ${profile.nickname}
First Name: ${profile.first_name}
Last Name: ${profile.last_name}`);
}
