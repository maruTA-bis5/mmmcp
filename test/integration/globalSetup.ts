import { Client4 } from "@mattermost/client";
import { UserProfile } from "@mattermost/types/users";
import * as child_process from "node:child_process";
import * as util from "node:util";
import type { TestProject } from "vitest/node";

const execFile = util.promisify(child_process.execFile);

const getClient = (token: string): Client4 => {
    const client = new Client4();
    client.setUrl("http://host.docker.internal:8065");
    client.setToken(token);
    return client;
}

export async function setup(project: TestProject): Promise<void> {
    await execFile("docker", ["compose", "-f", "compose-test.yml", "up", "-d", "--wait"]);

    const setupClient = getClient("");
    let adminUser: UserProfile = newUserProfile("admin", "admin@example.com");
    adminUser.roles = "system_admin system_user";
    setupClient.logToConsole = true;
    adminUser = await setupClient.createUser(adminUser, "", "");
    const adminClient = getClient("");
    await adminClient.login("admin", "admin-password");
    const adminToken = await adminClient.createUserAccessToken(adminUser.id, "admin-access-token");
    const adminAccessToken = adminToken.token ?? "invalid";

    let generalUser = newUserProfile("general", "general@example.com");
    generalUser = await adminClient.createUser(generalUser, "", "");
    await adminClient.updateUserRoles(generalUser.id, "system_user system_user_access_token system_post_all");
    const userClient = getClient("");
    await userClient.login("general", "general-password");
    
    const userToken = await userClient.createUserAccessToken(generalUser.id, "general-access-token");
    const userAccessToken = userToken.token ?? "invalid";

    await adminClient.logout();
    await userClient.logout();

    // verify
    await getClient(adminAccessToken).getMe();
    await getClient(userAccessToken).getMe();

    // share to each test
    project.provide("adminAccessToken", adminAccessToken);
    project.provide("userAccessToken", userAccessToken);
    project.provide("mattermostUrl", "http://host.docker.internal:8065");

    // await writeFile(ENV_FILE, JSON.stringify({
    //     url: "http://host.docker.internal:8065",
    //     adminToken: adminAccessToken, 
    //     userToken: userAccessToken
    // }), "utf-8");

    console.log("Docker compose up completed.");
}

declare module 'vitest' {
    export interface ProvidedContext {
        adminAccessToken: string;
        userAccessToken: string;
        mattermostUrl: string;
    }
}

export async function teardown(): Promise<void> {
    const keepEnvs : boolean = process.env.KEEP_TEST_ENVIRONMENT === "true";
    if (keepEnvs) {
        console.log("Keeping test environment.");
        return;
    }
    // await unlink(ENV_FILE).catch(() => { /* ignore */ });
    await execFile("docker", ["compose", "-f", "compose-test.yml", "down"]);
    console.log("Docker compose down completed.");
}

function newUserProfile(username: string, email: string): UserProfile {
    return {
        id: "",
        username: username, 
        password: username + "-password",
        nickname: username,
        first_name: username,
        last_name: "User",
        email: email,
        position: "",
        mfa_active: false,
        last_activity_at: 0,
        is_bot: false,
        bot_description: "",
        terms_of_service_id: "",
        terms_of_service_create_at: 0,
        create_at: 0,
        update_at: 0,
        delete_at: 0,
        roles: "system_user",
        auth_data: "",
        auth_service: "",
        last_password_update: 0,
        last_picture_update: 0,
        locale: "en",
        timezone: { automaticTimezone: "", manualTimezone: "", useAutomaticTimezone: ""},
        notify_props: {
            desktop: 'default',
            desktop_sound: 'default',
            calls_desktop_sound: 'true',
            email: 'true',
            mark_unread: 'all',
            push: 'default',
            push_status: 'online',
            comments: 'any',
            first_name: 'true',
            channel: 'true',
            mention_keys: '',
            highlight_keys: '',
        },
        props: {},
    };
}