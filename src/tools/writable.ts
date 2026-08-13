import type { MattermostClient } from '../mattermost/client.js';

import { registerAddUserToChannelTool } from './channels/add-user-to-channel.js';
import { registerCreateChannelTool } from './channels/create-channel.js';
import { SendDmTool } from './direct-messages/send-dm.js';
import { registerSendGroupMessageTool } from './direct-messages/send-group-message.js';
import { registerCreatePostTool } from './posts/create-post.js';
import type { ToolServer } from './shared.js';
import { registerTool } from './tool.js';

export function registerWritableTools(server: ToolServer, client: MattermostClient): void {
    registerCreateChannelTool(server, client);
    registerAddUserToChannelTool(server, client);
    registerCreatePostTool(server, client);
    registerTool(server, new SendDmTool(client));
    registerSendGroupMessageTool(server, client);
}
