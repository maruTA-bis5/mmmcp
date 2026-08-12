import type { UserProfile } from '@mattermost/types/users';
import type { MattermostClient } from '../../mattermost/client.js';

import { type EmptyInput, Tool } from '../tool.js';

export class WhoamiTool extends Tool<EmptyInput, UserProfile> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'whoami',
            description: 'Get the authenticated Mattermost user profile.',
            inputSchema: {},
            handler: whoami,
        });
    }
}

async function whoami(client: MattermostClient): Promise<UserProfile> {
    return await client.api.getMe();
}
