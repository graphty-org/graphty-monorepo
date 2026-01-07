# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the @graphty/remote-logger package.

## Package Overview

@graphty/remote-logger is a standalone npm package that provides:
- **RemoteLogClient**: Browser client for sending logs to a remote server
- **Log Server**: HTTP/HTTPS server with terminal output and REST API
- **ConsoleCaptureUI**: Floating widget for browser console capture

## Directory Structure

```
remote-logger/
├── src/
│   ├── index.ts              # Main exports
│   ├── client/
│   │   ├── RemoteLogClient.ts  # Browser logging client
│   │   ├── types.ts            # Type definitions
│   │   └── index.ts            # Client exports
│   ├── server/
│   │   ├── log-server.ts       # HTTP/HTTPS server
│   │   ├── self-signed-cert.ts # Certificate generation
│   │   └── index.ts            # Server exports
│   └── ui/
│       ├── ConsoleCaptureUI.ts # Console capture widget
│       └── index.ts            # UI exports
├── bin/
│   └── remote-log-server.js    # CLI entry point
├── test/
│   ├── client/                 # Client unit tests
│   ├── server/                 # Server unit tests
│   ├── cli/                    # CLI tests
│   ├── ui/                     # UI unit tests + browser tests
│   └── integration/            # Client-server integration tests
└── dist/                       # Built output
```

## Development Commands

```bash
# Build
npm run build              # Compile TypeScript

# Test
npm test                   # Run tests in watch mode
npm run test:run           # Run tests once

# Lint
npm run lint               # Check lint and types
npm run lint:fix           # Auto-fix lint issues

# Coverage
npm run coverage           # Run with coverage report
```

## Test Structure

The package uses vitest with three test projects:

1. **default** (Node.js): Server, client, CLI, and integration tests
2. **ui-unit** (happy-dom): UI unit tests
3. **browser** (Playwright): Browser tests for real DOM

### Running Specific Tests

```bash
# Run a specific test project
npm run test:run -- --project=default
npm run test:run -- --project=ui-unit
npm run test:run -- --project=browser

# Run a specific test file
npm run test:run -- test/integration/client-server.test.ts
```

## Key Implementation Details

### RemoteLogClient

- Batches logs before sending (configurable interval)
- Automatic retry with exponential backoff
- Unique session ID per instance
- Browser-safe (uses native fetch)

### Log Server

- Supports both HTTP and HTTPS
- Auto-generates self-signed certificates
- Colored terminal output
- REST API for log retrieval
- Optional file logging (JSONL format)

### ConsoleCaptureUI

- Intercepts all console.* methods
- Creates floating button with menu
- Supports copy/download/clear/show
- Exposes `window.__console__` for programmatic access

## Testing Patterns

### Mocking Strategy

| Test Type | Environment | Approach |
|-----------|-------------|----------|
| Server tests | Node.js | Real HTTP server |
| Client tests | Node.js | Mock fetch |
| UI unit tests | happy-dom | Spy on console |
| Browser tests | Playwright | Real DOM |
| Integration | Node.js | Real server + client |

### Port Ranges

Tests use specific port ranges to avoid conflicts:
- Server tests: 8100-8199
- Integration tests: 8200-8399
- Development servers: 9000-9099

## Common Tasks

### Adding a New Log Level

Log levels are strings and don't require code changes. The server displays them with appropriate colors based on known levels (ERROR, WARN, INFO, DEBUG, TRACE).

### Modifying REST API

1. Update handler in `src/server/log-server.ts`
2. Add tests in `test/server/log-server.test.ts`
3. Add integration tests if needed
4. Update README.md API documentation

### Adding UI Features

1. Modify `src/ui/ConsoleCaptureUI.ts`
2. Add unit tests in `test/ui/ConsoleCaptureUI.test.ts`
3. Add browser tests in `test/ui/ConsoleCaptureUI.browser.test.ts`

## Integration with Other Packages

This package is used by:
- **graphty-element**: RemoteSink uses RemoteLogClient for remote logging
- **graphty (React app)**: Storybook integration for console capture

When making breaking changes, check these packages for compatibility.

## Coverage Thresholds

- Lines: 80%
- Functions: 80%
- Branches: 75%
- Statements: 80%

## Important Notes

- This is a standalone package, not dependent on other @graphty packages
- Browser client has zero runtime dependencies
- Server depends on `selfsigned` for certificate generation
- All exports are ES modules
