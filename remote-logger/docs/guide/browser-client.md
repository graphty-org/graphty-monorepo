# The browser client

## RemoteLogClient

The browser-side client for sending logs.

```typescript
import { RemoteLogClient, createRemoteLogClient } from "@graphty/remote-logger";

// Using constructor
const client = new RemoteLogClient(options);

// Using factory function
const client = createRemoteLogClient(options);
```

### Options

| Option             | Type                | Default     | Description                                                        |
| ------------------ | ------------------- | ----------- | ------------------------------------------------------------------ |
| `serverUrl`        | `string`            | required    | URL of the log server                                              |
| `sessionPrefix`    | `string`            | `"session"` | Prefix for session ID                                              |
| `batchIntervalMs`  | `number`            | `1000`      | Interval between batch sends                                       |
| `maxRetries`       | `number`            | `3`         | Max retry attempts on failure                                      |
| `retryDelayMs`     | `number`            | `1000`      | Base delay between retries (uses exponential backoff)              |
| `throttlePatterns` | `ThrottlePattern[]` | `[]`        | Patterns to throttle (see below)                                   |
| `projectMarker`    | `string`            | auto        | Project identifier for filtering (auto-detected from Vite globals) |
| `worktreePath`     | `string`            | auto        | Full worktree path for debugging (auto-detected from Vite globals) |

### Throttling High-Frequency Logs

Use throttle patterns to prevent log flooding from high-frequency events:

```typescript
const logger = new RemoteLogClient({
    serverUrl: "http://localhost:9080",
    throttlePatterns: [
        // Only send "Rendering frame" once per second
        { pattern: /Rendering frame/, intervalMs: 1000 },
        // Only send mouse position updates every 500ms
        { pattern: /Mouse position:/, intervalMs: 500 },
    ],
});
```

### Methods

| Method                       | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| `log(level, message, data?)` | Log a message with optional data object          |
| `flush(): Promise<void>`     | Immediately send pending logs to server          |
| `close(): Promise<void>`     | Flush remaining logs and stop accepting new ones |

### Properties

| Property    | Type                | Description                                                         |
| ----------- | ------------------- | ------------------------------------------------------------------- |
| `sessionId` | `string` (readonly) | Unique session identifier in format `{prefix}-{timestamp}-{random}` |

## Basic Browser Integration

```typescript
import { RemoteLogClient } from "@graphty/remote-logger";

// Create a logger instance
const logger = new RemoteLogClient({
    serverUrl: "http://localhost:9080",
    sessionPrefix: "myapp",
});

// Wrap console methods to also send to remote server
const originalLog = console.log;
console.log = (...args) => {
    originalLog.apply(console, args);
    logger.log("LOG", args.map(String).join(" "));
};

// Flush before page unload
window.addEventListener("beforeunload", () => {
    logger.flush();
});
```

## React/Vue/Angular Error Boundary

```typescript
import { RemoteLogClient } from "@graphty/remote-logger";

const logger = new RemoteLogClient({
    serverUrl: "http://localhost:9080",
    sessionPrefix: "react-app",
});

// Global error handler
window.onerror = (message, source, lineno, colno, error) => {
    logger.log("ERROR", String(message), {
        source,
        lineno,
        colno,
        stack: error?.stack,
    });
};

// Unhandled promise rejections
window.onunhandledrejection = (event) => {
    logger.log("ERROR", "Unhandled rejection", {
        reason: String(event.reason),
    });
};
```

## The console capture widget

A floating UI widget that captures all console output (`log`, `error`, `warn`, `info`, `debug`) and provides a menu to copy, download, view, or clear the captured logs.

```typescript
import { initConsoleCaptureUI, ConsoleCaptureUI } from "@graphty/remote-logger/ui";

// Initialize the UI (adds floating button to page)
const ui = initConsoleCaptureUI();

// Or use the class directly
const ui = new ConsoleCaptureUI();

// All console methods are now captured
console.log("This is captured");
console.error("This too");

// Access captured logs programmatically
const logsText = ui.getLogs();

// Later, clean up (restores original console methods)
ui.destroy();
```

#### Widget Features

The floating button (📋) appears in the top-right corner of the page. Clicking it reveals a menu with:

| Button       | Action                                   |
| ------------ | ---------------------------------------- |
| 📋 Copy Logs | Copy all captured logs to clipboard      |
| 💾 Download  | Download logs as a timestamped text file |
| 🗑️ Clear     | Clear all captured logs                  |
| 👁️ Show Logs | Open a modal to view and select logs     |

#### Instance Methods

| Method                      | Description                             |
| --------------------------- | --------------------------------------- |
| `getLogs(): string`         | Get all captured logs as formatted text |
| `clearLogs(): void`         | Clear captured logs                     |
| `copyLogs(): Promise<void>` | Copy logs to clipboard                  |
| `downloadLogs(): void`      | Download logs as text file              |
| `destroy(): void`           | Restore console methods and remove UI   |

#### Global Methods

When initialized, `window.__console__` is exposed for programmatic access:

```typescript
// Available globally after initConsoleCaptureUI()
window.__console__.copy(); // Copy to clipboard
window.__console__.download(); // Download as file
window.__console__.clear(); // Clear logs
window.__console__.get(); // Get logs as string
window.__console__.logs; // Raw log array
```

#### Log Format

Captured logs are formatted as:

```
[2024-01-15T10:30:00.000Z] [INFO] User logged in
[2024-01-15T10:30:01.000Z] [ERROR] Failed to connect
```

## Combining RemoteLogClient with ConsoleCaptureUI

```typescript
import { RemoteLogClient } from "@graphty/remote-logger";
import { initConsoleCaptureUI } from "@graphty/remote-logger/ui";

// Initialize console capture for local viewing
const ui = initConsoleCaptureUI();

// Also send to remote server
const remoteLogger = new RemoteLogClient({
    serverUrl: "http://localhost:9080",
    sessionPrefix: "dual-logging",
});

// Hook into captured logs
const originalLog = console.log;
console.log = (...args) => {
    // ConsoleCaptureUI already captures this
    originalLog.apply(console, args);
    // Also send to remote
    remoteLogger.log("LOG", args.map(String).join(" "));
};
```
