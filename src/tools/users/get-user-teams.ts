import type { TeamMembership } from '@mattermost/types/teams';
import type { MattermostClient } from '../../mattermost/client.js';

import { type ToolResult, toolTextResult } from '../shared.js';
import { type EmptyInput, Tool } from '../tool.js';

export class GetUserTeamsTool extends Tool<EmptyInput, ToolResult> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'get_user_teams',
            description: 'List team memberships for the authenticated Mattermost user.',
            inputSchema: {},
            handler: getUserTeams,
        });
    }
}

async function getUserTeams(client: MattermostClient): Promise<ToolResult> {
    const memberships: TeamMembership[] = await client.api.getMyTeamMembers();
    const content = memberships
        .map(membership => `Team ID: ${membership.team_id}\nRoles: ${membership.roles}`)
        .join('\n\n');
    return toolTextResult(content);
}
