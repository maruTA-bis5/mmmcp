# Mattermost MCP Server Implementation Plan

## Project Overview
- **Name**: `@maruta-bis5/mmmcp`
- **Language**: TypeScript
- **SDK**: `@modelcontextprotocol/server` (MCP Spec 2026-07-28)
- **Transport**: stdio
- **Distribution**: npm

## Architecture

### Core Components
```
src/
├── index.ts                 # Entry point, MCP server setup
├── config.ts                # Configuration management
├── mattermost/
│   ├── client.ts            # Mattermost client wrapper (@mattermost/client)
│   └── types.ts             # Mattermost API types (re-exported from @mattermost/client)
├── tools/
│   ├── index.ts             # Tool registry
│   ├── readonly.ts          # Read-only tools
│   └── writable.ts          # Writable tools
├── modes/
│   └── mode-guard.ts        # Mode enforcement (readonly/writable)
└── utils/
    ├── errors.ts            # Custom error classes
    └── validation.ts        # Input validation
```

## Configuration

### CLI Arguments
```bash
# Required
--url <url>              # Mattermost server URL (optional if MATTERMOST_URL env var set)

# Optional
--readonly               # Enable readonly mode (default: writable)
--log-level <level>      # debug | info | warn | error (default: info)
```

### Environment Variables
```bash
# Required
MATTERMOST_TOKEN=<token>  # Personal Access Token (only source for token)

# Optional
MATTERMOST_URL=<url>      # Mattermost server URL (used if --url not provided)
```

### Configuration Schema (config.ts)
```typescript
interface Config {
  mattermost: {
    url: string;
    token: string;  // Always from MATTERMOST_TOKEN env var
  };
  readonly: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
```

### Precedence
- `url`: CLI `--url` > `MATTERMOST_URL` env var > error if neither
- `token`: Only `MATTERMOST_TOKEN` env var (no CLI option)

## Authentication Strategy

### Personal Access Token (Only)
- Uses `@mattermost/client` with `Client` class
- Configure with `url` and `token` (PAT)
- Client handles `Authorization: Bearer <token>` header automatically
- `url`: CLI `--url` or `MATTERMOST_URL` env var
- `token`: Only from `MATTERMOST_TOKEN` env var (no CLI option)

## Mode Enforcement

### Read-Only Mode (`--readonly` flag)
- Writable tools are **not registered** at all (not visible to MCP client)
- Only read-only tools exposed via `registerTool`

### Writable Mode (Default, no flag)
- All 17 tools registered
- No restrictions

## Tool Implementation Plan

### Read-Only Tools (Available in Both Modes)

| Tool | Mattermost API Endpoint | Description |
|------|------------------------|-------------|
| `whoami` | `GET /api/v4/users/me` | Get current user info |
| `get_user_teams` | `GET /api/v4/users/me/teams/members` | Get user's teams |
| `get_user_channels` | `GET /api/v4/users/me/teams/{team_id}/channels` | Get user's channels |
| `get_channel_info` | `GET /api/v4/channels/{channel_id}` | Get channel details |
| `get_channel_members` | `GET /api/v4/channels/{channel_id}/members` | List channel members |
| `get_team_info` | `GET /api/v4/teams/{team_id}` | Get team details |
| `get_team_members` | `GET /api/v4/teams/{team_id}/members` | List team members |
| `read_channel` | `GET /api/v4/channels/{channel_id}/posts` | Get recent messages |
| `read_thread` | `GET /api/v4/posts/{post_id}/thread` | Get thread messages |
| `search_users` | `GET /api/v4/users/search` | Search users |
| `search_posts` | `GET /api/v4/posts/search` | Search posts |
| `read_file` | `GET /api/v4/files/{file_id}` | Download attachment |

### Writable Tools (Writable Mode Only)

| Tool | Mattermost API Endpoint | Description |
|------|------------------------|-------------|
| `create_channel` | `POST /api/v4/channels` | Create channel |
| `add_user_to_channel` | `POST /api/v4/channels/{channel_id}/members` | Add member |
| `create_post` | `POST /api/v4/posts` | Create post |
| `send_dm` | `POST /api/v4/posts` (with direct channel) | Send DM |
| `send_group_message` | `POST /api/v4/posts` (with group channel) | Send group message |

## Tool Input Schemas (Zod)

Each tool will have a Zod schema for validation. Example:

```typescript
// create_channel
{
  team_id: string,
  name: string,
  display_name: string,
  type: 'O' | 'P',  // Open or Private
  header?: string,
  purpose?: string
}
```

## Error Handling

### Custom Error Classes
- `MattermostApiError` - API errors with status code
- `AuthenticationError` - 401/403 errors
- `RateLimitError` - 429 with retry-after
- `ValidationError` - Input validation failures
- `ModeError` - Readonly mode violations

### Error Response Format
```typescript
{
  code: string,
  message: string,
  details?: unknown,
  retryAfter?: number
}
```

## MCP Server Setup

### Server Capabilities (2026-07-28 Spec)
```typescript
const server = new Server(
  {
    name: '@maruta-bis5/mmmcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);
```

### Tool Registration
- Dynamic registration based on mode
- Read-only tools always registered
- Writable tools conditionally registered

## Package.json Scripts

```json
{
  "name": "@maruta-bis5/mmmcp",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "mmmcp": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "test": "vitest",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm run test && npm run lint"
  },
  "dependencies": {
    "@modelcontextprotocol/server": "^2.0.0",
    "@mattermost/client": "^11.7.0",
    "zod": "^4.2.0"
  },
  "devDependencies": {
    "typescript": "^7.0.2",
    "tsx": "^4.23.1",
    "vitest": "^4.1.10",
    "@types/node": "^24.0.0",
    "eslint": "^10.8.0",
    "@typescript-eslint/eslint-plugin": "^8.65.0"
  }
}
```

## CI/CD (GitHub Actions)

### Workflows
- **`.github/workflows/ci.yml`** - Run on PR/push:
  - TypeScript type check (`npm run typecheck`)
  - Lint (`npm run lint`)
  - Unit tests (`npm run test`)
  - Build (`npm run build`)

- **`.github/workflows/integration.yml`** - Run on PR/push:
  - Start Mattermost v11.9.0 + PostgreSQL containers
  - Start Mattermost v11.7.9 + PostgreSQL containers
  - Run integration tests (`npm run test:integration`) against both versions
  - Cleanup containers

- **`.github/workflows/release.yml`** - On version tag:
  - Run CI checks
  - Run integration tests
  - Publish to npm (`npm publish --access public`)

### Required Secrets
- `NPM_TOKEN` - For npm publishing

## Development Workflow

1. **Setup**: `npm init` + install dependencies
2. **CLI**: Implement argument parsing (`--url`, `--readonly`, `--log-level`) + env var reading (`MATTERMOST_URL`, `MATTERMOST_TOKEN`)
3. **Types**: Re-export types from `@mattermost/client`
4. **Client**: Wrapper around `@mattermost/client` with PAT auth
5. **Tools**: Implement each tool with Zod schemas
6. **Mode Guard**: Conditional tool registration based on `--readonly`
7. **Server**: Wire up MCP server
8. **Test**: Unit tests for each tool
9. **Integration Test**: Run against Mattermost v11.9.0 and v11.7.9
10. **Build**: `npm run build`
11. **Publish**: `npm publish`

## Testing Strategy

- Unit tests for each tool (mock `@mattermost/client`)
- **Integration tests** against two Mattermost versions:
  - **Latest**: v11.9.0
  - **LTS**: v11.7.9
- Mode enforcement tests
- Error handling tests

### Integration Test Setup (GitHub Actions)
- `.github/workflows/integration.yml` - Runs on PR/push:
  - Starts Mattermost v11.9.0 container (PostgreSQL backend)
  - Starts Mattermost v11.7.9 container (PostgreSQL backend)
  - Runs integration test suite against both versions
  - Tests all read-only tools + writable tools (in writable mode)
  - Cleans up containers after tests

### Test Matrix
| Test Type | v11.9.0 | v11.7.9 |
|-----------|---------|---------|
| Read-only tools | ✅ | ✅ |
| Writable tools | ✅ | ✅ |
| Mode switching | ✅ | ✅ |
| Error handling | ✅ | ✅ |

## Future Enhancements

- WebSocket support for real-time updates
- Caching layer
- Rate limiting handling
- Configuration file support (~/.mmmcp/config.json)