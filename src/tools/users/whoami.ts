import type { UserProfile } from '@mattermost/types/users';
import type { MattermostClient } from '../../mattermost/client.js';

import type { EmptyInput, Tool, ToolDefinition } from '../tool.js';

export class WhoamiTool implements Tool<EmptyInput, UserProfile> {
    client: MattermostClient;
    definition: ToolDefinition<EmptyInput, UserProfile>;
    constructor(client: MattermostClient) {
        this.client = client;
        this.definition = {
            name: 'whoami',
            description: 'Get the authenticated Mattermost user profile.',
            inputSchema: {},
            handler: whoami,
        };
    }
}

function whoami(client: MattermostClient): Promise<UserProfile> {
    return client.api.getMe();
}
