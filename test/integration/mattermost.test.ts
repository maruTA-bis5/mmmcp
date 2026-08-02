import { describe, expect, it } from "vitest";

import { MattermostClient } from "../../src/mattermost/client.js";

const url = process.env.MATTERMOST_URL;
const token = process.env.MATTERMOST_TOKEN;
const username = process.env.MATTERMOST_USERNAME;
const password = process.env.MATTERMOST_PASSWORD;
const auth = token
  ? { token }
  : username && password
    ? { username, password }
    : undefined;

describe.skipIf(url === undefined || auth === undefined)(
  "Mattermost integration",
  () => {
    it("authenticates with configured credentials", async () => {
      const client = await MattermostClient.create({ url: url ?? "", auth: auth! });
      const user = await client.api.getMe();

      expect(user.id).toBeTruthy();
      expect(user.username).toBeTruthy();
    });
  },
  // TODO load test data
  // TODO test each tools
);
