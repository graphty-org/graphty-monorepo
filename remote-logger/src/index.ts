/**
 * Remote logging client and server for browser debugging.
 *
 * Client usage (Browser):
 *   import { RemoteLogClient } from "@graphty/remote-logger";
 *   const client = new RemoteLogClient({ serverUrl: "http://localhost:9080" });
 *   client.log("INFO", "Hello from browser");
 *
 * Server usage (Node.js):
 *   import { startLogServer } from "@graphty/remote-logger/server";
 *   startLogServer({ port: 9080 });
 *
 * Or via CLI:
 *   npx remote-log-server --port 9080
 *
 * UI usage (Browser):
 *   import { initConsoleCaptureUI } from "@graphty/remote-logger/ui";
 *   initConsoleCaptureUI();
 */

// Client exports (primary exports for browser usage)
// Note: Server components are NOT re-exported here because they use Node.js APIs.
// Import from "@graphty/remote-logger/server" for server-side usage.
export type { LogEntry, RemoteLogClientOptions, ThrottlePattern } from "./client/index.js";
export { createRemoteLogClient, RemoteLogClient } from "./client/index.js";

// Note: UI components are NOT re-exported here to keep the main entry lightweight.
// Import from "@graphty/remote-logger/ui" for UI usage.
