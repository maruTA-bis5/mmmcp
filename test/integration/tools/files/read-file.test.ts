import type { Team } from '@mattermost/types/teams';
import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../../../src/mattermost/client.js';
import { ReadFileTool } from '../../../../src/tools/files/read-file.js';
import { execute, safeFileRepresentation, type ToolResult, ToolResultSchema } from '../../../../src/tools/shared.js';
import { getAdminAccessToken, getMattermostUrl } from '../../testShared.js';

describe('read_file tool', () => {
    it('should return a safe representation of a text attachment', async () => {
        const client = await MattermostClient.create({
            url: getMattermostUrl(),
            auth: { token: getAdminAccessToken() },
        });
        const suffix = Date.now().toString(36);
        const team = await client.api.createTeam({
            id: '',
            create_at: 0,
            update_at: 0,
            delete_at: 0,
            display_name: `Integration Team ${suffix}`,
            name: `integration-team-${suffix}`,
            description: 'Integration test team',
            email: '',
            type: 'O',
            company_name: '',
            allowed_domains: '',
            invite_id: '',
            allow_open_invite: true,
            scheme_id: '',
            group_constrained: false,
        } satisfies Team);
        const channel = await client.api.createChannel({
            team_id: team.id,
            name: `integration-channel-${suffix}`,
            display_name: `Integration Channel ${suffix}`,
            type: 'O',
        });
        try {
            const formData = new FormData();
            formData.append(
                'files',
                new Blob([`Integration file content ${suffix}`], { type: 'text/plain' }),
                `integration-file-${suffix}.txt`,
            );
            formData.append('channel_id', channel.id);
            const upload = await client.api.uploadFile(formData);
            const fileId = upload.file_infos[0]?.id;
            expect(fileId).toBeTruthy();

            const readFileTool = new ReadFileTool(client);
            const result: ToolResult = await execute(() =>
                readFileTool.definition.handler(client, { file_id: fileId as string }),
            );

            expect(ToolResultSchema.safeParse(result).success).toBe(true);
            expect(result.content).lengthOf(1);
            const expectedFile = await client.downloadFile(fileId as string);
            const expectedRepresentation = await safeFileRepresentation(expectedFile);
            expect(result.content[0]?.text).toEqual(JSON.stringify(expectedRepresentation, null, 2));
        } finally {
            await client.api.deleteTeam(team.id);
        }
    });
});