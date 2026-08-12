import type { z } from 'zod';
import type { MattermostClient } from '../mattermost/client.js';
import { execute, type ToolResult, type ToolServer } from './shared.js';

export type EmptyInput = { [key: string]: never };
export type ToolOutput = ToolResult | unknown;
export type ToolDefinition<Input extends z.ZodRawShape, Output extends ToolOutput> = {
    readonly name: string;
    readonly description: string;
    readonly inputSchema: Input;
    readonly handler: (client: MattermostClient, input: z.infer<z.ZodObject<Input>>) => Promise<Output>;
};
export class Tool<Input extends z.ZodRawShape, Output extends ToolOutput> {
    readonly client: MattermostClient;
    readonly definition: ToolDefinition<Input, Output>;
    constructor(client: MattermostClient, definition: ToolDefinition<Input, Output>) {
        this.client = client;
        this.definition = definition;
    }
};

export function registerTool<Input extends z.ZodRawShape, Output extends ToolOutput>(
    server: ToolServer,
    tool: Tool<Input, Output>,
) {
    server.registerTool(
        tool.definition.name,
        {
            description: tool.definition.description,
            inputSchema: tool.definition.inputSchema,
        },
        async (input: z.infer<z.ZodObject<Input>>) => execute(tool.definition.handler.bind(null, tool.client, input)),
    );
}
