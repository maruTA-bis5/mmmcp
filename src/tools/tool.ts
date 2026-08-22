import type { z } from 'zod';
import type { MattermostClient } from '../mattermost/client.js';
import { execute, type PlainToolResult, type StructuredToolResult, type ToolServer } from './shared.js';

export type EmptyInput = { [key: string]: never };
export type ToolOutput<T> = PlainToolResult | StructuredToolResult<T> | /* @deprecated */ unknown;
export type ToolDefinition<Input, T, Output extends ToolOutput<T>> = {
    readonly name: string;
    readonly description: string;
    readonly inputSchema: z.ZodType<Input>;
    readonly outputSchema?: z.ZodType<T>;
    readonly handler: (client: MattermostClient, input: z.infer<z.ZodType<Input>>) => Promise<Output>;
};
export class Tool<Input, T, Output extends ToolOutput<T>> {
    readonly client: MattermostClient;
    readonly definition: ToolDefinition<Input, T, Output>;
    constructor(client: MattermostClient, definition: ToolDefinition<Input, T, Output>) {
        this.client = client;
        this.definition = definition;
    }
}

export function registerTool<Input, T, Output extends ToolOutput<T>>(server: ToolServer, tool: Tool<Input, T, Output>) {
    server.registerTool(
        tool.definition.name,
        {
            description: tool.definition.description,
            inputSchema: tool.definition.inputSchema,
            outputSchema: tool.definition.outputSchema,
        },
        async (input: z.infer<z.ZodType<Input>>) => execute(tool.definition.handler.bind(null, tool.client, input)),
    );
}
