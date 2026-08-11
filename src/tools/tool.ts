import type { z } from 'zod';
import type { MattermostClient } from '../mattermost/client.js';
import { execute, ToolResult, type ToolServer } from './shared.js';

export type EmptyInput = {};
export type ToolOutput = ToolResult | unknown;
export type ToolDefinition<Input extends z.ZodRawShape, Output extends ToolOutput> = {
    name: string;
    description: string;
    inputSchema: Input;
    handler: (client: MattermostClient, input: z.infer<z.ZodObject<Input>>) => Promise<Output>;
};
export type Tool<Input extends z.ZodRawShape, Output extends ToolOutput> = {
    readonly client: MattermostClient;
    readonly definition: ToolDefinition<Input, Output>;
};

export function registerTool<Input extends z.ZodRawShape, Output extends ToolOutput>(server: ToolServer, tool: Tool<Input, Output>) {
    server.registerTool(
        tool.definition.name,
        {
            description: tool.definition.description,
            inputSchema: tool.definition.inputSchema,
        },
        async (input: z.infer<z.ZodObject<Input>>) => execute(tool.definition.handler.bind(null, tool.client, input))
    );
};
