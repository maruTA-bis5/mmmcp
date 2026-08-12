import type { ServerError } from '@mattermost/types/errors';
import { describe, expect, it } from 'vitest';
import { MattermostClient } from '../../src/mattermost/client.js';
import { getMattermostUrl } from './testShared.js';

describe('mattermost authentication', async () => {
    it('should throw an error when the access token is invalid', async () => {
        await expect(MattermostClient.create({ url: getMattermostUrl(), auth: { token: 'invalid' } })).rejects.toThrow(
            'Invalid Mattermost personal access token',
        );
    });
    it('should throw an error when the username is invalid', async () => {
        await expect(
            MattermostClient.create({ url: getMattermostUrl(), auth: { username: 'invalid', password: 'invalid' } }),
        ).rejects.toSatisfy(e => assertServerErrorId(e, 'api.user.login.invalid_credentials_email_username'));
    });
    it('should throw an error when the password is invalid', async () => {
        await expect(
            MattermostClient.create({ url: getMattermostUrl(), auth: { username: 'general', password: 'invalid' } }),
        ).rejects.toSatisfy(e => assertServerErrorId(e, 'api.user.login.invalid_credentials_email_username'));
    });
});

function assertServerErrorId(err: ServerError, expectedServerErrorId: string): boolean {
    expect(err.server_error_id).toEqual(expectedServerErrorId);
    return true;
}
