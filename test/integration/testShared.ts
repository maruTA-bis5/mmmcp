import { inject } from "vitest";

const TEST_USER_ACCESS_TOKEN_KEY = "userAccessToken";
const TEST_ADMIN_ACCESS_TOKEN_KEY = "adminAccessToken";
const TEST_MATTERMOST_URL_KEY = "mattermostUrl";

export function getUserAccessToken(): string {
    return inject(TEST_USER_ACCESS_TOKEN_KEY);
}

export function getAdminAccessToken(): string {
    return inject(TEST_ADMIN_ACCESS_TOKEN_KEY);
}

export function getMattermostUrl(): string {
    return inject(TEST_MATTERMOST_URL_KEY);
}
