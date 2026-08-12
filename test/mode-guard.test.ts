import { describe, expect, it } from 'vitest';
import type { MattermostClient } from '../src/mattermost/client.js';
import { registerTools } from '../src/modes/mode-guard.js';

interface RegisteredTool {
    name: string;
}

function fakeServer(): { tools: RegisteredTool[]; registerTool: (name: string) => void } {
    const tools: RegisteredTool[] = [];
    return {
        tools,
        registerTool(name: string): void {
            tools.push({ name });
        },
    };
}

describe('registerTools', () => {
    it('only exposes read-only tools in readonly mode', () => {
        const server = fakeServer();
        registerTools(server as never, {} as MattermostClient, true);

        expect(server.tools).toHaveLength(12);
        expect(server.tools.map(({ name }) => name)).not.toContain('create_post');
    });

    it('exposes all documented tools in writable mode', () => {
        const server = fakeServer();
        registerTools(server as never, {} as MattermostClient, false);

        expect(server.tools).toHaveLength(17);
        expect(server.tools.map(({ name }) => name)).toContain('send_group_message');
    });
});
