# mmmcp

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for Mattermost. It runs over the stdio transport and connects to Mattermost with a Personal Access Token (PAT).

## Requirements

- Node.js 20 or later
- A Mattermost server
- A Mattermost Personal Access Token

Grant the token only the permissions it needs. To prevent write operations, start the server with `--readonly`; write tools will not be exposed to the MCP client.

## Installation

Install globally with npm:

```sh
npm install --global @maruta-bis5/mmmcp
```

To run from source, install dependencies and build:

```sh
git clone https://github.com/maruta-bis5/mmmcp.git
cd mmmcp
npm ci
npm run build
```

## Configuration

| Setting | Source | Required | Description |
| --- | --- | --- | --- |
| Mattermost URL | `--url <url>` or `MATTERMOST_URL` | Yes | Mattermost server URL. The CLI option takes precedence over the environment variable. Reverse-proxy paths are supported. |
| Personal Access Token | `MATTERMOST_TOKEN` | Yes | Mattermost PAT. It cannot be supplied through a CLI option. |
| Read-only mode | `--readonly` | No | Does not register write tools. |
| Log level | `--log-level <level>` | No | One of `debug`, `info`, `warn`, or `error`. Defaults to `info`. |

Because this is a stdio server, standard output is reserved for the MCP protocol. Logs and errors are written to standard error.

## Use with an MCP Client

The following is an MCP configuration example for a global installation. Store `MATTERMOST_TOKEN` using the MCP client's secure environment-variable mechanism.

```json
{
  "mcpServers": {
    "mattermost": {
      "command": "mmmcp",
      "args": [
        "--url",
        "https://mattermost.example.com",
        "--readonly"
      ],
      "env": {
        "MATTERMOST_TOKEN": "replace-with-a-personal-access-token"
      }
    }
  }
}
```

To run from a local source tree, point the client to the built entry point:

```json
{
  "mcpServers": {
    "mattermost": {
      "command": "node",
      "args": [
        "C:\\absolute\\path\\to\\mmmcp\\dist\\index.js",
        "--url",
        "https://mattermost.example.com"
      ],
      "env": {
        "MATTERMOST_TOKEN": "replace-with-a-personal-access-token"
      }
    }
  }
}
```

Remove `--readonly` to permit write operations.

## Available Tools

### Read-only tools

These tools are always available.

| Tool | Description |
| --- | --- |
| `whoami` | Gets the authenticated user's profile. |
| `get_user_teams` | Gets the authenticated user's team memberships. |
| `get_user_channels` | Gets the available channels in a specified team. |
| `get_channel_info` | Gets channel details. |
| `get_channel_members` | Gets channel members. |
| `get_team_info` | Gets team details. |
| `get_team_members` | Gets team members. |
| `read_channel` | Gets recent channel posts. |
| `read_thread` | Gets the thread containing a post. |
| `search_users` | Searches users by name, username, nickname, or email address. |
| `search_posts` | Searches posts in a specified team. |
| `read_file` | Reads UTF-8 text attachments up to 1 MiB. Binary or oversized attachments return metadata only. |

### Write tools

The following tools are exposed only in writable mode, which is the default.

| Tool | Description |
| --- | --- |
| `create_channel` | Creates a public or private channel. |
| `add_user_to_channel` | Adds a user to a channel. |
| `create_post` | Creates a post in a channel or thread. |
| `send_dm` | Sends a direct message to a user. |
| `send_group_message` | Sends a group direct message to multiple users. |

## Development

Install dependencies:

```sh
npm ci
```

Start the server in watch mode:

```sh
MATTERMOST_URL=https://mattermost.example.com MATTERMOST_TOKEN=your-token npm run dev -- --readonly
```

In PowerShell:

```powershell
$env:MATTERMOST_URL = "https://mattermost.example.com"
$env:MATTERMOST_TOKEN = "your-token"
npm run dev -- --readonly
```

Build distributable JavaScript:

```sh
npm run build
```

Build output is written to `dist/`.

## Testing and Validation

| Command | Description |
| --- | --- |
| `npm run typecheck` | Runs TypeScript type checking. |
| `npm run lint` | Runs ESLint. |
| `npm test` | Runs unit tests. |
| `npm run test:integration` | Runs Mattermost integration tests. |
| `npm run build` | Creates a production build. |

Integration tests require a running Mattermost server and a PAT:

```sh
MATTERMOST_URL=http://localhost:8065 MATTERMOST_TOKEN=your-token npm run test:integration
```

GitHub Actions starts PostgreSQL and tests Mattermost 11.7.9 and 11.9.0. Integration tests are skipped locally when connection settings are not provided.

## License

[MIT](./package.json)
