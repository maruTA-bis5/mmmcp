import { describe, expect, it } from 'vitest';
import type { MattermostClient } from '../../src/mattermost/client.js';
import { execute, type ToolResult } from '../../src/tools/shared.js';
import { type EmptyInput, Tool, type ToolDefinition } from '../../src/tools/tool.js';

class TestTool extends Tool<EmptyInput, ToolResult> {
    constructor(definition: ToolDefinition<EmptyInput, ToolResult>) {
        super({} as MattermostClient, definition);
    }
}

describe('function execute', () => {
    it('return error result when handler throws an error', async () => {
        const tool = new TestTool({
            name: 'test',
            description: 'test tool',
            inputSchema: {},
            handler: async () => {
                throw new Error('test error');
            },
        });
        const result = await execute(() => tool.definition.handler(tool.client, {}));
        expect(result.isError).toBe(true);
        expect(result.content[0]?.type).toEqual('text');
        expect(result.content[0]?.text).toEqual('test error');
    });

    it('return same result when handler returns a ToolResult', async () => {
        const tool = new TestTool({
            name: 'test',
            description: 'test tool',
            inputSchema: {},
            handler: async () => {
                return { content: [{ type: 'text', text: 'test result' }] };
            },
        });
        const result = await execute(() => tool.definition.handler(tool.client, {}));
        expect(result.isError).toBeFalsy();
        expect(result.content[0]?.type).toEqual('text');
        expect(result.content[0]?.text).toEqual('test result');
    });
});
