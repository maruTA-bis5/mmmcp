import { Client4, ClientError } from '@mattermost/client';

import type { FileInfo, MattermostApi, MattermostClientOptions, TokenMattermostClientOptions } from './types.js';

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

    async getFileInfo(fileId: string): Promise<FileInfo> {
        const response = await fetch(`${this.api.getFileRoute(fileId)}/info`, {
            headers: { Authorization: `Bearer ${this.token}` },
        });

        if (!response.ok) {
            await throwMattermostResponseError(response, 'Mattermost file info request failed');
        }

        return (await response.json()) as FileInfo;
    }

    async downloadFile(fileId: string): Promise<Response> {
        const response = await fetch(this.api.getFileRoute(fileId), {
            headers: { Authorization: `Bearer ${this.token}` },
        });

        if (!response.ok) {
            await throwMattermostResponseError(response, 'Mattermost file download failed');
        }

        return response;
    }

    setUserAgent(userAgent: string): void {
        this.client.setUserAgent(userAgent);
    }
}

async function throwMattermostResponseError(response: Response, message: string): Promise<never> {
    const body = await response.text();
    const error = new Error(`${message} with status ${response.status}`);
    Object.assign(error, {
        status_code: response.status,
        detailed_error: body,
    });
    throw error;
}
