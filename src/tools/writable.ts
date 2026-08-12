import type { MattermostClient } from '../mattermost/client.js';

import { AddUserToChannelTool } from './channels/add-user-to-channel.js';
import { registerCreateChannelTool } from './channels/create-channel.js';
import { registerSendDmTool } from './direct-messages/send-dm.js';
import { registerSendGroupMessageTool } from './direct-messages/send-group-message.js';
import { registerCreatePostTool } from './posts/create-post.js';
import type { ToolServer } from './shared.js';
import { registerTool } from './tool.js';

export function registerWritableTools(server: ToolServer, client: MattermostClient): void {
    registerCreateChannelTool(server, client);
    registerTool(server, new AddUserToChannelTool(client));
    registerCreatePostTool(server, client);
    registerSendDmTool(server, client);
    registerSendGroupMessageTool(server, client);
}
