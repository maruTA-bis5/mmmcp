import { type FileHandle, mkdtemp, open, realpath, stat, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import type { MattermostClient } from '../../mattermost/client.js';
import { idSchema, type StructuredToolResult, toolStructuredResult } from '../shared.js';
import { Tool } from '../tool.js';

const inputSchema = z.strictObject({
    file_id: idSchema.describe(
        'Mattermost file ID from a post attachment or file metadata result; provide the ID, not the file name.',
    ),
    directory: z
        .string()
        .min(1)
        .optional()
        .describe(
            'Absolute path to an existing directory on the mmmcp host where the downloaded file will be saved (for example, `C:\\Users\\alice\\Downloads` on Windows or `/home/alice/Downloads` on Linux/macOS). Omit to create a unique directory under the OS temporary directory; it is not automatically deleted.',
        ),
    filename: z
        .string()
        .min(1)
        .optional()
        .describe(
            "Optional single file name, such as `report.pdf`; do not include a path. Omit to use Mattermost's original file name (sanitized if needed), or the file ID if no name is available. Existing files are never overwritten; a numeric suffix is added to duplicates.",
        ),
});
type DownloadFileInput = z.infer<typeof inputSchema>;

export const DownloadFileOutputSchema = z.strictObject({
    path: z.string().describe('The absolute path of the saved file'),
    file_name: z.string().describe('The saved file name'),
    size_bytes: z.number().int().nonnegative().describe('The saved file size in bytes'),
    content_type: z.string().optional().describe('The file MIME type, when available'),
    temporary: z.boolean().describe('Whether the file was saved in a temporary directory'),
});
export type DownloadFileOutput = z.infer<typeof DownloadFileOutputSchema>;

const invalidFileNameCharacters = /[<>:"/\\|?*]/;
const reservedFileName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

export class DownloadFileTool extends Tool<
    DownloadFileInput,
    DownloadFileOutput,
    StructuredToolResult<DownloadFileOutput>
> {
    constructor(client: MattermostClient) {
        super(client, {
            name: 'download_file',
            description: 'Download one attachment to an existing directory or a unique temporary directory.',
            inputSchema,
            outputSchema: DownloadFileOutputSchema,
            handler: downloadFile,
        });
    }
}

async function downloadFile(
    client: MattermostClient,
    { file_id, directory, filename }: DownloadFileInput,
): Promise<StructuredToolResult<DownloadFileOutput>> {
    const info = await client.getFileInfo(file_id);
    const selectedName =
        filename === undefined ? safeMattermostFileName(info.name, file_id) : validateFileName(filename);
    const temporary = directory === undefined;
    const destinationDirectory = temporary
        ? await mkdtemp(path.join(tmpdir(), 'mmmcp-'))
        : await resolveExistingDirectory(directory);

    const response = await client.downloadFile(file_id);
    const destination = await writeWithoutOverwrite(destinationDirectory, selectedName, response.body);
    const contentType = response.headers.get('content-type') ?? info.mime_type ?? undefined;

    return toolStructuredResult({
        path: destination.path,
        file_name: path.basename(destination.path),
        size_bytes: destination.size,
        ...(contentType === undefined ? {} : { content_type: contentType }),
        temporary,
    });
}

async function resolveExistingDirectory(directory: string): Promise<string> {
    if (!path.isAbsolute(directory)) {
        throw new Error('The destination directory must be an absolute path');
    }

    const resolved = await realpath(directory);
    const directoryStat = await stat(resolved);
    if (!directoryStat.isDirectory()) {
        throw new Error('The destination path must be an existing directory');
    }
    return resolved;
}

function validateFileName(filename: string): string {
    if (
        filename === '.' ||
        filename === '..' ||
        filename !== path.basename(filename) ||
        invalidFileNameCharacters.test(filename) ||
        hasControlCharacter(filename) ||
        filename.endsWith('.') ||
        filename.endsWith(' ') ||
        reservedFileName.test(filename)
    ) {
        throw new Error('filename must be a valid single file name');
    }
    return filename;
}

function safeMattermostFileName(originalName: string | undefined, fileId: string): string {
    const safeName = originalName
        ?.split('')
        .map(character =>
            invalidFileNameCharacters.test(character) || hasControlCharacter(character) ? '_' : character,
        )
        .join('')
        .replace(/[. ]+$/g, '')
        .trim();
    return safeName && safeName !== '.' && safeName !== '..' && !reservedFileName.test(safeName) ? safeName : fileId;
}

function hasControlCharacter(value: string): boolean {
    return [...value].some(character => {
        const code = character.charCodeAt(0);
        return code < 32 || code === 127;
    });
}

async function writeWithoutOverwrite(
    directory: string,
    filename: string,
    body: ReadableStream<Uint8Array> | null,
): Promise<{ path: string; size: number }> {
    const extension = path.extname(filename);
    const stem = extension ? filename.slice(0, -extension.length) : filename;

    for (let suffix = 0; ; suffix += 1) {
        const candidateName = suffix === 0 ? filename : `${stem} (${suffix})${extension}`;
        const candidatePath = path.join(directory, candidateName);
        let fileHandle: FileHandle;
        try {
            fileHandle = await open(candidatePath, 'wx', 0o600);
        } catch (error: unknown) {
            if (isAlreadyExistsError(error)) {
                continue;
            }
            throw error;
        }

        try {
            if (body) {
                for await (const chunk of body) {
                    await fileHandle.writeFile(chunk);
                }
            }
            const fileStat = await fileHandle.stat();
            await fileHandle.close();
            return { path: candidatePath, size: fileStat.size };
        } catch (error: unknown) {
            await fileHandle.close().catch(() => undefined);
            try {
                await unlink(candidatePath);
            } catch (cleanupError: unknown) {
                throw new Error(
                    `File download failed (${errorMessage(error)}); could not remove partial file ${candidatePath} (${errorMessage(cleanupError)})`,
                );
            }
            throw error;
        }
    }
}

function isAlreadyExistsError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST';
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
