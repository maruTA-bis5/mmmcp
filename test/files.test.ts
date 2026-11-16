import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MattermostClient } from '../src/mattermost/client.js';
import { DownloadFileTool } from '../src/tools/files/download-file.js';
import { ReadFileInfoTool } from '../src/tools/files/read-file-info.js';
import type { ToolResult, ToolServer } from '../src/tools/shared.js';
import { registerTool } from '../src/tools/tool.js';

type DownloadInput = { file_id: string; directory?: string; filename?: string };
type DownloadResult = {
    path: string;
    file_name: string;
    size_bytes: number;
    content_type?: string;
    temporary: boolean;
};

const temporaryDirectories: string[] = [];

afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('file tools', () => {
    it('gets file metadata from the authenticated Mattermost info endpoint', async () => {
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({ name: 'report.pdf' })));
        vi.stubGlobal('fetch', fetchMock);
        try {
            const client = new MattermostClient({ url: 'https://mattermost.example', token: 'test-token' });
            await expect(client.getFileInfo('file123')).resolves.toMatchObject({ name: 'report.pdf' });
            expect(fetchMock).toHaveBeenCalledWith('https://mattermost.example/api/v4/files/file123/info', {
                headers: { Authorization: 'Bearer test-token' },
            });
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

        const result = await downloadHandler({ file_id: 'file123', directory, filename: 'report.pdf' });
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

        const result = await downloadHandler({ file_id: 'file123', directory });
        const output = getStructuredContent<DownloadResult>(result);

        expect(output.size_bytes).toBe(contents.byteLength);
        expect(await readFile(output.path)).toHaveLength(contents.byteLength);
    });

    it('uses the Mattermost filename, creates a temporary destination, and avoids concurrent overwrites', async () => {
        const { downloadHandler } = createHandlers({
            fileName: 'report.pdf',
            response: () => new Response(new TextEncoder().encode('download')),
        });

        const [first, second] = await Promise.all([
            downloadHandler({ file_id: 'file123' }),
            downloadHandler({ file_id: 'file123' }),
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

        const result = await downloadHandler({ file_id: 'file123', directory });

        expect(getStructuredContent<DownloadResult>(result).file_name).toBe('file123');
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

        const result = await downloadHandler({ file_id: 'file123', directory });

        expect(result.isError).toBe(true);
        expect(getFileInfo).toHaveBeenCalledOnce();
        expect(await readdir(directory)).toEqual([]);
    });

    it('rejects invalid names and does not download when metadata retrieval fails', async () => {
        const directory = await makeTemporaryDirectory();
        const first = createHandlers({ response: new Response('body'), fileName: 'file.txt' });
        const invalidResult = await first.downloadHandler({ file_id: 'file123', directory, filename: '../escape' });
        expect(invalidResult.isError).toBe(true);
        expect(first.downloadFile).not.toHaveBeenCalled();

        const second = createHandlers({
            response: new Response('body'),
            getFileInfoError: new Error('metadata unavailable'),
        });
        const metadataResult = await second.downloadHandler({ file_id: 'file123', directory });
        expect(metadataResult.isError).toBe(true);
        expect(second.downloadFile).not.toHaveBeenCalled();
        expect(await readdir(directory)).toEqual([]);
    });

    it('returns file metadata without downloading its contents', async () => {
        const { infoHandler, downloadFile } = createHandlers({
            fileName: 'report.pdf',
            response: new Response('unused'),
        });
        const result = await infoHandler({ file_id: 'file123' });

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
    response: Response | (() => Response);
    getFileInfoError?: Error;
}): {
    downloadHandler: (input: DownloadInput) => Promise<ToolResult>;
    infoHandler: (input: DownloadInput) => Promise<ToolResult>;
    getFileInfo: ReturnType<typeof vi.fn>;
    downloadFile: ReturnType<typeof vi.fn>;
} {
    const getFileInfo = vi.fn(async () => {
        if (options.getFileInfoError) {
            throw options.getFileInfoError;
        }
        return {
            id: 'file123',
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
        typeof options.response === 'function' ? options.response() : options.response,
    );
    const client = { getFileInfo, downloadFile } as unknown as MattermostClient;
    const handlers = new Map<string, (input: DownloadInput) => Promise<ToolResult>>();
    const server = {
        registerTool(name: string, _definition: unknown, handler: unknown) {
            handlers.set(name, handler as (input: DownloadInput) => Promise<ToolResult>);
        },
    } as unknown as ToolServer;

    registerTool(server, new DownloadFileTool(client));
    registerTool(server, new ReadFileInfoTool(client));

    const downloadHandler = handlers.get('download_file');
    const infoHandler = handlers.get('read_file_info');
    if (!downloadHandler || !infoHandler) {
        throw new Error('File tool handlers were not registered');
    }

    return {
        downloadHandler,
        infoHandler,
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
