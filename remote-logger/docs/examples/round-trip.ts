import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { RemoteLogClient } from "@graphty/remote-logger";
import { startLogServer } from "@graphty/remote-logger/server";

// The server: port 0 picks any free port. From a terminal: npx remote-log-server --port 9080
const server = startLogServer({ port: 0, host: "127.0.0.1", quiet: true });
await once(server, "listening");
const serverUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

// The client: in a browser, this is all your page needs.
const logger = new RemoteLogClient({ serverUrl, sessionPrefix: "docs" });
logger.log("INFO", "Application started");
logger.log("ERROR", "Failed to fetch", { status: 503 });
await logger.flush(); // send now instead of at the next batch

// Read them back the way a script or an AI assistant would: the newest first.
const response = await fetch(`${serverUrl}/logs/recent?n=10`);
const { logs } = (await response.json()) as { logs: { level: string; message: string }[] };
console.log(logs.map((entry) => `${entry.level} ${entry.message}`).join(", ")); // ERROR Failed to fetch, INFO Application started

await logger.close();
server.close();
