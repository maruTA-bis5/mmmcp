import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Client4 } from '@mattermost/client';
import type { Team } from '@mattermost/types/teams';
import { describe, expect, it } from 'vitest';

import { DownloadFileTool } from '../../../../src/tools/files/download-file.js';
import { ReadFileInfoTool } from '../../../../src/tools/files/read-file-info.js';
import { registerTool } from '../../../../src/tools/tool.js';
import { getAdminAccessToken, getMattermostUrl } from '../../testShared.js';
import { expectToolResultIsError, registeredToolTest } from '../toolstestlib.js';

describe(
    'file tools',
    registeredToolTest(
        (server, client) => {
            registerTool(server, new ReadFileInfoTool(client));
            registerTool(server, new DownloadFileTool(client));
        },
        context => {
            it('returns file metadata and downloads the uploaded content', async () => {
                const adminClient = new Client4();
                adminClient.setUrl(getMattermostUrl());
                adminClient.setToken(getAdminAccessToken());
                const suffix = randomUUID().replaceAll('-', '');
                const team = await adminClient.createTeam({
                    id: '',
                    create_at: 0,
                    update_at: 0,
                    delete_at: 0,
                    display_name: `Integration Team ${suffix}`,
                    name: `integration-team-${suffix}`,
                    description: '',
                    email: '',
                    type: 'O',
                    company_name: '',
                    allowed_domains: '',
                    invite_id: '',
                    allow_open_invite: true,
                    scheme_id: '',
                    group_constrained: false,
                } satisfies Team);
                let directory: string | undefined;

                try {
                    const user = await adminClient.getUserByUsername('general');
                    await adminClient.addToTeam(team.id, user.id);
                    const channel = await adminClient.createChannel({
                        team_id: team.id,
                        name: `integration-channel-${suffix}`,
                        display_name: `Integration Channel ${suffix}`,
                        type: 'O',
                    });
                    const contents = new TextEncoder().encode('integration attachment contents');
                    const formData = new FormData();
                    formData.append('channel_id', channel.id);
                    formData.append('files', new Blob([contents], { type: 'text/plain' }), 'report.txt');
                    const upload = await adminClient.uploadFile(formData);
                    const fileInfo = upload.file_infos[0];
                    if (!fileInfo) {
                        throw new Error('Mattermost did not return metadata for the uploaded test file');
                    }

                    const infoResult = await context.mcpClient.callTool({
                        name: 'read_file_info',
                        arguments: { file_id: fileInfo.id },
                    });
                    expectToolResultIsError(infoResult).toBeFalsy();
                    expect(infoResult.structuredContent).toMatchObject({
                        id: fileInfo.id,
                        name: 'report.txt',
                        mime_type: expect.stringContaining('text/plain'),
                        size: contents.byteLength,
                    });

                    directory = await mkdtemp(path.join(tmpdir(), 'mmmcp-file-integration-'));
                    const resolvedDirectory = await realpath(directory);
                    const downloadResult = await context.mcpClient.callTool({
                        name: 'download_file',
                        arguments: { file_id: fileInfo.id, directory },
                    });
                    expectToolResultIsError(downloadResult).toBeFalsy();
                    expect(downloadResult.structuredContent).toMatchObject({
                        path: path.join(resolvedDirectory, 'report.txt'),
                        file_name: 'report.txt',
                        size_bytes: contents.byteLength,
                        content_type: expect.stringContaining('text/plain'),
                        temporary: false,
                    });
                    expect(await readFile(path.join(resolvedDirectory, 'report.txt'))).toEqual(Buffer.from(contents));
                } finally {
                    if (directory) {
                        await rm(directory, { recursive: true, force: true });
                    }
                    await adminClient.deleteTeam(team.id);
                }
            });
        },
    ),
);
