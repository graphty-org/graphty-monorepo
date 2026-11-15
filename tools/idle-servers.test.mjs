// Tests of tools/idle-servers.mjs on a fake servherd home and a fake /proc/net/tcp.
//
//   node tools/idle-servers.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, it } from "node:test";

import { connectedPorts, stopIdleServers } from "./idle-servers.mjs";

const tmp = mkdtempSync(join(tmpdir(), "idle-servers-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

const root = join(tmp, "root");
const home = join(tmp, "home");
const proc = join(tmp, "proc");
mkdirSync(join(root, "tools"), { recursive: true });
mkdirSync(join(home, ".servherd/pm2/pids"), { recursive: true });
mkdirSync(join(proc, "net"), { recursive: true });
writeFileSync(join(root, "tools/live-tools.json"), JSON.stringify({ review: { worktree: ".worktrees/review-live" } }));

const servers = [
    ["idle", ".worktrees/a/graphty", 9101],
    ["busy", ".worktrees/b/graphty", 9102],
    ["broker", ".", 9103],
    ["review", ".worktrees/review-live", 9104],
    ["proofroom-review", ".worktrees/proofroom-review", 9105],
];
writeFileSync(
    join(home, ".servherd/registry.json"),
    JSON.stringify({
        servers: servers.map(([name, cwd, port]) => ({ name, pm2Name: `sh-${name}`, cwd: join(root, cwd), port })),
    }),
);
for (const [name] of servers) writeFileSync(join(home, `.servherd/pm2/pids/sh-${name}-0.pid`), String(process.pid));

// 9102 has an established connection (state 01); 9101 only listens (state 0A).
const row = (port, st) => `   0: 0100007F:${port.toString(16).toUpperCase()} 0100007F:D431 ${st} 0:0 0 1000`;
writeFileSync(
    join(proc, "net/tcp"),
    ["  sl  local_address rem_address   st", row(9101, "0A"), row(9102, "01")].join("\n"),
);

it("reads established local ports from /proc/net/tcp", () => {
    assert.deepEqual([...connectedPorts(proc)], [9102]);
});

it("stops only a worktree server with no connection for 12 hours", () => {
    const stopped = [];
    const run = (now) => stopIdleServers({ root, home, procDir: proc, now, stop: (n) => stopped.push(n) > 0 });
    run(0);
    run(12 * 3600e3 - 1);
    assert.deepEqual(stopped, [], "nothing is stopped before 12 hours");
    const r = run(12 * 3600e3);
    assert.deepEqual(stopped, ["sh-idle"]);
    assert.deepEqual(r.stopped, ["idle"]);
});
