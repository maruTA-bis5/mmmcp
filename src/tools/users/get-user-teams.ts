import type { MattermostClient } from '../../mattermost/client.js';

import { execute, type ToolServer } from '../shared.js';

export function registerGetUserTeamsTool(server: ToolServer, client: MattermostClient): void {
    server.registerTool(
        'get_user_teams',
        {
            description: 'List team memberships for the authenticated Mattermost user.',
            inputSchema: {},
        },
        async () => execute(() => client.api.getMyTeamMembers()),
    );
}
