// Starts the pipeline health MCP server (.mcp.json runs this). tools/pipeline-health is outside the
// pnpm workspace, so a fresh checkout or worktree has no node_modules for it: install them first.
// Install output goes to stderr only, because stdout is the MCP channel.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
if (!existsSync(join(pkg, "node_modules/@modelcontextprotocol/sdk"))) {
    const r = spawnSync("pnpm", ["install", "--frozen-lockfile", "--dir", pkg], { stdio: ["ignore", 2, 2] });
    if (r.status !== 0) {
        console.error(`pipeline-health MCP: pnpm install in ${pkg} failed (${r.error?.message ?? `exit ${r.status}`})`);
        process.exit(1);
    }
}
await import("./server.mjs");
