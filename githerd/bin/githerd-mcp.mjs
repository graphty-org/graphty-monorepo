#!/usr/bin/env node
/**
 * The githerd MCP server Claude Code starts from `.mcp.json` (design section 3.1). It answers MCP
 * startup at once, finds or starts the repository's daemon in the background and forwards tool
 * calls to it. Outside a git repository it exits quietly. stdout carries JSON-RPC lines only.
 *
 * Environment: `GITHERD_CONFIG` (a config file instead of the default branch's), `GITHERD_PM2` (the pm2 command as a JSON array, when servherd's own cannot be found),
 * `GITHERD_NAME` (a servherd name other than `githerd`, for a separate daemon), `GITHERD_URL` (a running
 * development daemon to use instead, e.g. http://127.0.0.1:9678 from `githerd dev`; nothing is installed or started).
 */

import { runLauncher } from "../lib/launcher.mjs";

await runLauncher({ input: process.stdin, write: (line) => process.stdout.write(`${line}\n`) });
process.exit(0);
