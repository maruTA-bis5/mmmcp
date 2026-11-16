import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MattermostClient } from '../src/mattermost/client.js';
import { DownloadFileTool } from '../src/tools/files/download-file.js';
import { ReadFileInfoTool } from '../src/tools/files/read-file-info.js';
import type { ToolResult, ToolServer } from '../src/tools/shared.js';
import { registerTool } from '../src/tools/tool.js';

vi.mock('node:os', async importOriginal => {
    const actual = await importOriginal<typeof import('node:os')>();
    return { ...actual, tmpdir: vi.fn(actual.tmpdir) };
});

type DownloadInput = { file_id: string; directory?: string; filename?: string };
const testFileId = 'aaaaaaaaaaaaaaaaaaaaaaaaaa';
type DownloadResult = {
    path: string;
    file_name: string;
    size_bytes: number;
    content_type?: string;
    temporary: boolean;
};

const temporaryDirectories: string[] = [];

afterEach(async () => {
    vi.mocked(tmpdir).mockReset();
    await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('file tools', () => {
    it('rejects malformed file IDs before invoking Mattermost', async () => {
        const { downloadInputSchema, getFileInfo, downloadFile } = createHandlers({
            response: new Response('body'),
            fileName: 'file.txt',
        });

        expect(downloadInputSchema.safeParse({ file_id: '../users/me?x=/../../escape' }).success).toBe(false);
        expect(getFileInfo).not.toHaveBeenCalled();
        expect(downloadFile).not.toHaveBeenCalled();
    });

    it('gets file metadata from the authenticated Mattermost info endpoint', async () => {
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({ name: 'report.pdf' })));
        vi.stubGlobal('fetch', fetchMock);
        try {
            const client = new MattermostClient({ url: 'https://mattermost.example', token: 'test-token' });
            await expect(client.getFileInfo('aaaaaaaaaaaaaaaaaaaaaaaaaa')).resolves.toMatchObject({
                name: 'report.pdf',
            });
            expect(fetchMock).toHaveBeenCalledWith(
                'https://mattermost.example/api/v4/files/aaaaaaaaaaaaaaaaaaaaaaaaaa/info',
                { headers: { Authorization: 'Bearer test-token' } },
            );
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it('streams downloads with an explicit name without overwriting existing files', async () => {
        const directory = await makeTemporaryDirectory();
        await writeFile(path.join(directory, 'report.pdf'), 'existing');
        const { downloadHandler } = createHandlers({
            fileName: 'server-name.pdf',
            response: new Response(new TextEncoder().encode('downloaded'), {
                headers: { 'content-type': 'application/pdf' },
            }),
        });

        const result = await downloadHandler({ file_id: testFileId, directory, filename: 'report.pdf' });
        const output = getStructuredContent<DownloadResult>(result);

        expect(output).toMatchObject({
            path: path.join(directory, 'report (1).pdf'),
            file_name: 'report (1).pdf',
            size_bytes: 10,
            content_type: 'application/pdf',
            temporary: false,
        });
        expect(await readFile(path.join(directory, 'report.pdf'), 'utf8')).toBe('existing');
        expect(await readFile(output.path, 'utf8')).toBe('downloaded');
    });

    it('streams files larger than 1 MiB without truncating them', async () => {
        const directory = await makeTemporaryDirectory();
        const contents = new Uint8Array(1_048_593);
        const { downloadHandler } = createHandlers({
            fileName: 'large.bin',
            response: new Response(contents),
        });

        const result = await downloadHandler({ file_id: testFileId, directory });
        const output = getStructuredContent<DownloadResult>(result);

        expect(output.size_bytes).toBe(contents.byteLength);
        expect(await readFile(output.path)).toHaveLength(contents.byteLength);
    });

    it('keeps concurrent downloads to the same directory collision-safe', async () => {
        const directory = await makeTemporaryDirectory();
        await writeFile(path.join(directory, 'report.pdf'), 'pre-existing');
        let responseNumber = 0;
        const { downloadHandler } = createHandlers({
            fileName: 'report.pdf',
            response: () => new Response(`download-${++responseNumber}`),
        });

        const results = await Promise.all([
            downloadHandler({ file_id: testFileId, directory }),
            downloadHandler({ file_id: testFileId, directory }),
        ]);
        const outputs = results.map(result => getStructuredContent<DownloadResult>(result));
        const filenames = outputs.map(output => output.file_name).sort();

        expect(filenames).toEqual(['report (1).pdf', 'report (2).pdf']);
        expect(await readFile(path.join(directory, 'report.pdf'), 'utf8')).toBe('pre-existing');
        expect(new Set(await Promise.all(outputs.map(output => readFile(output.path, 'utf8'))))).toEqual(
            new Set(['download-1', 'download-2']),
        );
    });

    it('truncates oversized metadata names on UTF-8 boundaries and reserves collision suffix bytes', async () => {
        const directory = await makeTemporaryDirectory();
        const originalName = `${'報'.repeat(90)}.pdf`;
        const { downloadHandler } = createHandlers({
            fileName: originalName,
            response: () => new Response('download'),
        });

        const first = getStructuredContent<DownloadResult>(await downloadHandler({ file_id: testFileId, directory }));
        await writeFile(first.path, 'pre-existing');
        const duplicate = getStructuredContent<DownloadResult>(
            await downloadHandler({ file_id: testFileId, directory }),
        );

        expect(Buffer.byteLength(first.file_name, 'utf8')).toBeLessThanOrEqual(255);
        expect(Buffer.byteLength(duplicate.file_name, 'utf8')).toBeLessThanOrEqual(255);
        expect(duplicate.file_name.endsWith(' (1).pdf')).toBe(true);
        expect(await readFile(first.path, 'utf8')).toBe('pre-existing');
    });

    it.each(['b', '\u5831'])('shortens long extensions to fit duplicate suffixes (%s)', async character => {
        const directory = await makeTemporaryDirectory();
        const filename = `a.${character.repeat(Math.floor(253 / Buffer.byteLength(character, 'utf8')))}`;
        await writeFile(path.join(directory, filename), 'original');
        const { downloadHandler } = createHandlers({
            response: new Response('download'),
        });

        const result = await downloadHandler({ file_id: testFileId, directory, filename });
        const output = getStructuredContent<DownloadResult>(result);

        expect(output.file_name).toContain('a (1).');
        expect(Buffer.byteLength(output.file_name, 'utf8')).toBeLessThanOrEqual(255);
        expect(output.file_name).not.toContain('\ufffd');
        expect(await readFile(output.path, 'utf8')).toBe('download');
        expect(await readFile(path.join(directory, filename), 'utf8')).toBe('original');
    });

    it.each(['request', 'stream'])('removes its temporary directory after a %s failure', async failure => {
        const parent = await makeTemporaryDirectory();
        vi.mocked(tmpdir).mockReturnValue(parent);
        const { downloadHandler } = createHandlers({
            fileName: 'report.pdf',
            response: () => {
                if (failure === 'request') {
                    throw new Error('request failed');
                }
                return new Response(
                    new ReadableStream<Uint8Array>({
                        start(controller) {
                            controller.error(new Error('stream failed'));
                        },
                    }),
                );
            },
        });

        const result = await downloadHandler({ file_id: testFileId });

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain(`${failure} failed`);
        expect(await readdir(parent)).toEqual([]);
    });

    it('reports the retained temporary path if directory cleanup fails without removing other files', async () => {
        const parent = await makeTemporaryDirectory();
        vi.mocked(tmpdir).mockReturnValue(parent);
        let retainedPath = '';
        const { downloadHandler } = createHandlers({
            fileName: 'report.pdf',
            response: async () => {
                const [name] = await readdir(parent);
                if (!name) {
                    throw new Error('Expected the tool-created directory');
                }
                retainedPath = path.join(parent, name);
                await writeFile(path.join(retainedPath, 'keep.txt'), 'keep');
                throw new Error('request failed');
            },
        });

        const result = await downloadHandler({ file_id: testFileId });

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain('request failed');
        expect(result.content[0]?.text).toContain(`could not remove temporary directory ${retainedPath}`);
        expect(await readFile(path.join(retainedPath, 'keep.txt'), 'utf8')).toBe('keep');
    });

    it('uses the Mattermost filename, creates a temporary destination, and avoids concurrent overwrites', async () => {
        const { downloadHandler } = createHandlers({
            fileName: 'report.pdf',
            response: () => new Response(new TextEncoder().encode('download')),
        });

        const [first, second] = await Promise.all([
            downloadHandler({ file_id: testFileId }),
            downloadHandler({ file_id: testFileId }),
        ]);
        const firstResult = getStructuredContent<DownloadResult>(first);
        const secondResult = getStructuredContent<DownloadResult>(second);

        expect(firstResult.temporary).toBe(true);
        expect(secondResult.temporary).toBe(true);
        expect(firstResult.path).not.toBe(secondResult.path);
        expect(firstResult.file_name).toMatch(/^report(?: \(\d+\))?\.pdf$/);
        expect(secondResult.file_name).toMatch(/^report(?: \(\d+\))?\.pdf$/);
        expect(await readFile(firstResult.path)).toHaveLength(firstResult.size_bytes);
        expect(await readFile(secondResult.path)).toHaveLength(secondResult.size_bytes);
        for (const result of [firstResult, secondResult]) {
            const directory = path.dirname(result.path);
            temporaryDirectories.push(directory);
        }
    });

    it('uses the file ID when the metadata has no filename', async () => {
        const directory = await makeTemporaryDirectory();
        const { downloadHandler } = createHandlers({
            response: new Response('downloaded'),
            fileName: undefined,
        });

        const result = await downloadHandler({ file_id: testFileId, directory });

        expect(getStructuredContent<DownloadResult>(result).file_name).toBe(testFileId);
    });

    it('removes a partial file after a stream failure', async () => {
        const directory = await makeTemporaryDirectory();
        const failingBody = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new TextEncoder().encode('partial'));
                controller.error(new Error('stream interrupted'));
            },
        });
        const { downloadHandler, getFileInfo } = createHandlers({
            response: new Response(failingBody),
            fileName: 'report.pdf',
        });

        const result = await downloadHandler({ file_id: testFileId, directory });

        expect(result.isError).toBe(true);
        expect(getFileInfo).toHaveBeenCalledOnce();
        expect(await readdir(directory)).toEqual([]);
    });

    it('cancels the download body if creating the destination file fails', async () => {
        const directory = await makeTemporaryDirectory();
        const cancel = vi.fn(async () => {
            throw new Error('cancel failed');
        });
        const body = new ReadableStream<Uint8Array>({ cancel });
        const { downloadHandler } = createHandlers({
            fileName: 'report.pdf',
            response: async () => {
                await rm(directory, { recursive: true, force: true });
                return new Response(body);
            },
        });

        const result = await downloadHandler({ file_id: testFileId, directory });

        expect(result.isError).toBe(true);
        expect(cancel).toHaveBeenCalledOnce();
        expect(result.content[0]?.text).toContain('ENOENT');
        expect(result.content[0]?.text).not.toContain('cancel failed');
    });

    it('rejects invalid names and does not download when metadata retrieval fails', async () => {
        const directory = await makeTemporaryDirectory();
        const first = createHandlers({ response: new Response('body'), fileName: 'file.txt' });
        const invalidResult = await first.downloadHandler({ file_id: testFileId, directory, filename: '../escape' });
        const oversizedNameResult = await first.downloadHandler({
            file_id: testFileId,
            directory,
            filename: 'a'.repeat(256),
        });
        expect(invalidResult.isError).toBe(true);
        expect(oversizedNameResult.isError).toBe(true);
        expect(first.downloadFile).not.toHaveBeenCalled();

        const second = createHandlers({
            response: new Response('body'),
            getFileInfoError: new Error('metadata unavailable'),
        });
        const metadataResult = await second.downloadHandler({ file_id: testFileId, directory });
        expect(metadataResult.isError).toBe(true);
        expect(second.downloadFile).not.toHaveBeenCalled();
        expect(await readdir(directory)).toEqual([]);
    });

    it('returns file metadata without downloading its contents', async () => {
        const { infoHandler, downloadFile } = createHandlers({
            fileName: 'report.pdf',
            response: new Response('unused'),
        });
        const result = await infoHandler({ file_id: testFileId });

        expect(getStructuredContent<Record<string, unknown>>(result)).toMatchObject({ name: 'report.pdf' });
        expect(downloadFile).not.toHaveBeenCalled();
    });
});

async function makeTemporaryDirectory(): Promise<string> {
    const directory = await mkdtemp(path.join(tmpdir(), 'mmmcp-file-test-'));
    temporaryDirectories.push(directory);
    return directory;
}

function createHandlers(options: {
    fileName?: string;
    response: Response | (() => Response | Promise<Response>);
    getFileInfoError?: Error;
}): {
    downloadHandler: (input: DownloadInput) => Promise<ToolResult>;
    infoHandler: (input: DownloadInput) => Promise<ToolResult>;
    downloadInputSchema: DownloadFileTool['definition']['inputSchema'];
    getFileInfo: ReturnType<typeof vi.fn>;
    downloadFile: ReturnType<typeof vi.fn>;
} {
    const getFileInfo = vi.fn(async () => {
        if (options.getFileInfoError) {
            throw options.getFileInfoError;
        }
        return {
            id: testFileId,
            user_id: 'user123',
            channel_id: 'channel123',
            create_at: 0,
            update_at: 0,
            delete_at: 0,
            name: options.fileName ?? '',
            extension: 'txt',
            size: 10,
            mime_type: 'application/octet-stream',
            width: 0,
            height: 0,
            has_preview_image: false,
            clientId: '',
            archived: false,
        };
    });
    const downloadFile = vi.fn(async () =>
        typeof options.response === 'function' ? await options.response() : options.response,
    );
    const client = { getFileInfo, downloadFile } as unknown as MattermostClient;
    const handlers = new Map<string, (input: DownloadInput) => Promise<ToolResult>>();
    const server = {
        registerTool(name: string, _definition: unknown, handler: unknown) {
            handlers.set(name, handler as (input: DownloadInput) => Promise<ToolResult>);
        },
    } as unknown as ToolServer;

    const downloadTool = new DownloadFileTool(client);
    registerTool(server, downloadTool);
    registerTool(server, new ReadFileInfoTool(client));

    const downloadHandler = handlers.get('download_file');
    const infoHandler = handlers.get('read_file_info');
    if (!downloadHandler || !infoHandler) {
        throw new Error('File tool handlers were not registered');
    }

    return {
        downloadHandler,
        infoHandler,
        downloadInputSchema: downloadTool.definition.inputSchema,
        getFileInfo,
        downloadFile,
    };
}

function getStructuredContent<T>(result: ToolResult): T {
    if (!('structuredContent' in result)) {
        throw new Error('Expected structured tool result');
    }
    return result.structuredContent as T;
}
