import type { MattermostClient } from '../mattermost/client.js';

import { GetChannelInfoTool } from './channels/get-channel-info.js';
import { registerGetChannelMembersTool } from './channels/get-channel-members.js';
import { GetUserChannelsTool } from './channels/get-user-channels.js';
import { registerReadFileTool } from './files/read-file.js';
import { registerReadChannelTool } from './posts/read-channel.js';
import { registerReadThreadTool } from './posts/read-thread.js';
import { registerSearchPostsTool } from './posts/search-posts.js';
import { GetServerInfoTool } from './server/get-server-info.js';
import type { ToolServer } from './shared.js';
import { GetTeamInfoTool } from './teams/get-team-info.js';
import { registerGetTeamMembersTool } from './teams/get-team-members.js';
import { registerTool } from './tool.js';
import { registerGetUserTeamsTool } from './users/get-user-teams.js';
import { registerSearchUsersTool } from './users/search-users.js';
import { WhoamiTool } from './users/whoami.js';

export function registerReadonlyTools(server: ToolServer, client: MattermostClient): void {
	registerTool(server, new WhoamiTool(client));

	registerTool(server, new GetServerInfoTool(client));

	registerGetUserTeamsTool(server, client);
	registerTool(server, new GetUserChannelsTool(client));
	registerTool(server, new GetChannelInfoTool(client));
	registerGetChannelMembersTool(server, client);
	registerTool(server, new GetTeamInfoTool(client));
	registerGetTeamMembersTool(server, client);
	registerReadChannelTool(server, client);
	registerReadThreadTool(server, client);
	registerSearchUsersTool(server, client);
	registerSearchPostsTool(server, client);
	registerReadFileTool(server, client);
}
