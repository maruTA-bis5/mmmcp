import type { MattermostClient } from '../mattermost/client.js';

import { registerGetChannelInfoTool } from './channels/get-channel-info.js';
import { registerGetChannelMembersTool } from './channels/get-channel-members.js';
import { registerGetUserChannelsTool } from './channels/get-user-channels.js';
import { registerReadFileTool } from './files/read-file.js';
import { registerReadChannelTool } from './posts/read-channel.js';
import { registerReadThreadTool } from './posts/read-thread.js';
import { registerSearchPostsTool } from './posts/search-posts.js';
import type { ToolServer } from './shared.js';
import { registerGetTeamInfoTool } from './teams/get-team-info.js';
import { GetTeamMembersTool } from './teams/get-team-members.js';
import { registerTool } from './tool.js';
import { registerGetUserTeamsTool } from './users/get-user-teams.js';
import { registerSearchUsersTool } from './users/search-users.js';
import { WhoamiTool } from './users/whoami.js';

export function registerReadonlyTools(server: ToolServer, client: MattermostClient): void {
    registerTool(server, new WhoamiTool(client));

    registerGetUserTeamsTool(server, client);
    registerGetUserChannelsTool(server, client);
    registerGetChannelInfoTool(server, client);
    registerGetChannelMembersTool(server, client);
    registerGetTeamInfoTool(server, client);
    registerTool(server, new GetTeamMembersTool(client));
    registerReadChannelTool(server, client);
    registerReadThreadTool(server, client);
    registerSearchUsersTool(server, client);
    registerSearchPostsTool(server, client);
    registerReadFileTool(server, client);
}
