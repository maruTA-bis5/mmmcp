import { describe, expect, it } from "vitest";

import { MattermostClient } from "../../src/mattermost/client.js";

const url = process.env.MATTERMOST_URL;
const token = process.env.MATTERMOST_TOKEN;

describe.skipIf(url === undefined || token === undefined)(
  "Mattermost integration",
  () => {
    it("authenticates a personal access token", async () => {
      const client = new MattermostClient({ url: url ?? "", token: token ?? "" });
      const user = await client.api.getMe();

      expect(user.id).toBeTruthy();
      expect(user.username).toBeTruthy();
    });
  },
  // TODO load test data
  // TODO test each tools
);
