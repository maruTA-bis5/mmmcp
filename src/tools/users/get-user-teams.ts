import type { TeamMembership } from '@mattermost/types/teams';
import type { MattermostClient } from '../../mattermost/client.js';

import { type EmptyInput, Tool } from '../tool.js';

export class GetUserTeamsTool extends Tool<EmptyInput, TeamMembership[]> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'get_user_teams',
            description: 'List team memberships for the authenticated Mattermost user.',
            inputSchema: {},
            handler: getUserTeams,
        });
    }
}

async function getUserTeams(client: MattermostClient): Promise<TeamMembership[]> {
    return client.api.getMyTeamMembers();
}
