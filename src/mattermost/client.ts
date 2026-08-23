import { Client4, ClientError } from '@mattermost/client';

import type { DownloadedFile, MattermostApi, MattermostClientOptions, TokenMattermostClientOptions } from './types.js';

const MAX_FILE_BYTES = 1_048_576;

export class MattermostClient {
    readonly api: MattermostApi;

    private readonly client: Client4;
    private readonly token: string;
    private readonly shouldLogout: boolean;
    private readonly url: string;
    private serverVersion: string;

    constructor(options: TokenMattermostClientOptions);
    constructor(url: string, token: string);
    constructor(options: TokenMattermostClientOptions, suppliedToken: undefined, shouldLogout: boolean);
    constructor(
        options: TokenMattermostClientOptions,
        suppliedToken: undefined,
        shouldLogout: boolean,
        serverVersion: string,
    );
    constructor(
        optionsOrUrl: TokenMattermostClientOptions | string,
        suppliedToken?: string,
        shouldLogout = false,
        serverVersion?: string,
    ) {
        const { url, token } =
            typeof optionsOrUrl === 'string' ? { url: optionsOrUrl, token: suppliedToken ?? '' } : optionsOrUrl;

        if (!url) {
            throw new Error('Mattermost server URL is required');
        }
        if (!token) {
            throw new Error('Mattermost personal access token is required');
        }

        const cleanUrl = url.replace(/\/+$/, '');
        const client = new Client4();
        client.setUrl(cleanUrl);
        client.setToken(token);

        this.client = client;
        this.api = client;
        this.token = token;
        this.url = cleanUrl;
        this.shouldLogout = shouldLogout;
        this.serverVersion = serverVersion ?? client.serverVersion;
    }

    public static async create(options: MattermostClientOptions): Promise<MattermostClient> {
        if ('token' in options.auth) {
            const client = new MattermostClient({ url: options.url, token: options.auth.token });
            // validate
            const me = client.api.getMe();
            await me.catch((error: unknown) => {
                if (error instanceof ClientError && (error.status_code === 401 || error.status_code === 403)) {
                    throw new Error('Invalid Mattermost personal access token');
                }
                throw error;
            });
            return client;
        }

        const client = new Client4();
        const cleanUrl = options.url.replace(/\/+$/, '');
        client.setUrl(cleanUrl);
        try {
            await client.login(options.auth.username, options.auth.password);
        } catch (error: unknown) {
            if (error instanceof ClientError) {
                if (error.status_code === 401 || error.status_code === 403) {
                    // Preserve ServerError details for authentication failures
                    throw error;
                }
                // Other ClientErrors (e.g., network errors) should be wrapped
                throw new Error(`Could not connect to Mattermost (${cleanUrl}). Reason: ${error.message}`);
            }
            if (error instanceof Error) {
                throw new Error(`Could not connect to Mattermost (${cleanUrl}). Reason: ${error.message}`);
            }
            throw error;
        }

        return new MattermostClient({ url: options.url, token: client.token }, undefined, true, client.serverVersion);
    }

    public async logout(): Promise<void> {
        if (this.shouldLogout) {
            await this.client.logout();
        }
    }

    public getServerVersion(): string {
        return this.serverVersion || this.client.serverVersion;
    }

    async downloadFile(fileId: string): Promise<DownloadedFile> {
        const response = await fetch(this.api.getFileRoute(fileId), {
            headers: { Authorization: `Bearer ${this.token}` },
        });

        if (!response.ok) {
            const body = await response.text();
            const error = new Error(`Mattermost file download failed with status ${response.status}`);
            Object.assign(error, {
                status_code: response.status,
                detailed_error: body,
            });
            throw error;
        }

        const contentLengthHeader = response.headers.get('content-length');
        const contentLength = contentLengthHeader ? Number(contentLengthHeader) : undefined;
        const normalizedContentLength = Number.isFinite(contentLength) ? contentLength : undefined;

        if (normalizedContentLength !== undefined && normalizedContentLength > MAX_FILE_BYTES) {
            return {
                bytes: new Uint8Array(),
                contentLength: normalizedContentLength,
                truncated: true,
                ...fileMetadata(response),
            };
        }

        return {
            ...(await readResponseBytes(response, MAX_FILE_BYTES)),
            ...(normalizedContentLength === undefined ? {} : { contentLength: normalizedContentLength }),
            ...fileMetadata(response),
        };
    }

    setUserAgent(userAgent: string): void {
        this.client.setUserAgent(userAgent);
    }
}

function fileMetadata(response: Response): Pick<DownloadedFile, 'contentType' | 'fileName'> {
    const contentType = response.headers.get('content-type') ?? undefined;
    const fileName = filenameFromContentDisposition(response.headers.get('content-disposition'));
    return {
        ...(contentType === undefined ? {} : { contentType }),
        ...(fileName === undefined ? {} : { fileName }),
    };
}

async function readResponseBytes(
    response: Response,
    maximumBytes: number,
): Promise<Pick<DownloadedFile, 'bytes' | 'truncated'>> {
    if (!response.body) {
        return { bytes: new Uint8Array(await response.arrayBuffer()) };
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            const available = maximumBytes - total;
            if (value.byteLength > available) {
                chunks.push(value.slice(0, available));
                total += available;
                await reader.cancel();
                return { bytes: concatenate(chunks, total), truncated: true };
            }

            chunks.push(value);
            total += value.byteLength;
        }
    } finally {
        reader.releaseLock();
    }

    return { bytes: concatenate(chunks, total) };
}

function concatenate(chunks: Uint8Array[], length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return bytes;
}

function filenameFromContentDisposition(value: string | null): string | undefined {
    if (!value) {
        return undefined;
    }

    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(value)?.[1];
    if (encoded) {
        try {
            return decodeURIComponent(encoded);
        } catch {
            return encoded;
        }
    }

    return /filename="?([^";]+)"?/i.exec(value)?.[1];
}
