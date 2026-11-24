# API reference

The pages under "Generated TypeDoc" in the sidebar are generated from the source's documentation
comments, one module per entry point. This page lists the entry points and the types you are most
likely to need.

## Entry points

The package provides three entry points for different use cases:

### Main entry (`@graphty/remote-logger`)

Browser-safe exports for the logging client:

```typescript
import { RemoteLogClient, createRemoteLogClient } from "@graphty/remote-logger";

// Types
import type { LogEntry, RemoteLogClientOptions, ThrottlePattern } from "@graphty/remote-logger";
```

### Server entry (`@graphty/remote-logger/server`)

Node.js-only exports for the log server:

```typescript
import {
    startLogServer, // Start server programmatically
    main, // CLI entry point
    parseArgs, // Parse CLI arguments
    clearLogs, // Clear stored logs
    HELP_TEXT, // CLI help text

    // Certificate utilities
    generateSelfSignedCert,
    certFilesExist,
    readCertFiles,
} from "@graphty/remote-logger/server";

// Types
import type { LogServerOptions, LogEntry, ParseArgsResult, GeneratedCert } from "@graphty/remote-logger/server";
```

### UI entry (`@graphty/remote-logger/ui`)

Browser exports for the console capture widget:

```typescript
import { ConsoleCaptureUI, initConsoleCaptureUI } from "@graphty/remote-logger/ui";
```

### Client entry (`@graphty/remote-logger/client`)

Direct client-only imports (same as main entry):

```typescript
import { RemoteLogClient } from "@graphty/remote-logger/client";
```

### Vite entry (`@graphty/remote-logger/vite`)

Vite plugin for automatic project marker injection:

```typescript
import { remoteLoggerPlugin } from "@graphty/remote-logger/vite";
```

## TypeScript

Full TypeScript support with type definitions included.

```typescript
// Client types
import type { LogEntry, RemoteLogClientOptions, ThrottlePattern } from "@graphty/remote-logger";

// Server types (from server entry point)
import type { LogServerOptions, ParseArgsResult, GeneratedCert } from "@graphty/remote-logger/server";
```

### Type definitions

```typescript
interface LogEntry {
    time: string; // ISO 8601 timestamp
    level: string; // Log level (INFO, DEBUG, WARN, ERROR, etc.)
    message: string; // Log message
    data?: Record<string, unknown>; // Optional additional data
}

interface ThrottlePattern {
    pattern: RegExp; // Pattern to match log messages
    intervalMs: number; // Minimum interval between matching messages
}

interface RemoteLogClientOptions {
    serverUrl: string;
    sessionPrefix?: string;
    batchIntervalMs?: number;
    maxRetries?: number;
    retryDelayMs?: number;
    throttlePatterns?: ThrottlePattern[];
    projectMarker?: string; // Project identifier for filtering
    worktreePath?: string; // Full path for debugging
}

interface LogServerOptions {
    port?: number;
    host?: string;
    certPath?: string;
    keyPath?: string;
    logFile?: string;
    quiet?: boolean;
}
```
