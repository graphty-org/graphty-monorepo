import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { liveSessions, socketTransport, tellSessions } from "../lib/peers.mjs";

/** @type {string} */
let dir;

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "githerd-peers-"));
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("liveSessions", () => {
    it("lists the live sessions in the repository and its worktrees, not githerd's workers or other repositories", () => {
        const sessions = join(dir, "sessions");
        mkdirSync(sessions);
        const root = "/home/o/repo";
        const entry = (/** @type {number} */ pid, /** @type {Record<string, unknown>} */ over) =>
            writeFileSync(
                join(sessions, `${pid}.json`),
                JSON.stringify({
                    pid,
                    sessionId: `s${pid}`,
                    cwd: root,
                    peerProtocol: 1,
                    messagingSocketPath: `/tmp/cc-socks/${pid}.sock`,
                    name: `repo-${pid}`,
                    status: "idle",
                    ...over,
                }),
            );
        entry(11, {});
        entry(12, { cwd: `${root}/.worktrees/feat-x`, status: "busy" });
        entry(13, { cwd: `${root}/.worktrees/githerd-pr-7` });
        entry(14, { cwd: "/home/o/repo-other" });
        entry(15, { messagingSocketPath: undefined });
        entry(16, {});
        entry(17, { peerProtocol: undefined });
        writeFileSync(join(sessions, "18.json"), "{torn");
        writeFileSync(join(sessions, "11.abc.key"), "not a session");
        const alive = (/** @type {number} */ pid) => pid !== 16;
        expect(liveSessions({ sessionsDir: sessions, root, alive })).toEqual([
            { pid: 11, sessionId: "s11", name: "repo-11", cwd: root, socket: "/tmp/cc-socks/11.sock", status: "idle" },
            {
                pid: 12,
                sessionId: "s12",
                name: "repo-12",
                cwd: `${root}/.worktrees/feat-x`,
                socket: "/tmp/cc-socks/12.sock",
                status: "busy",
            },
        ]);
        expect(liveSessions({ sessionsDir: join(dir, "missing"), root })).toEqual([]);
    });
});

describe("socketTransport", () => {
    it("writes one user message line to the session's socket", async () => {
        const path = join(dir, "inbox.sock");
        /** @type {string[]} */
        const received = [];
        const server = createServer((c) => {
            let data = "";
            c.setEncoding("utf8");
            c.on("data", (d) => (data += d));
            c.on("end", () => received.push(data));
        });
        await new Promise((resolve) => server.listen(path, () => resolve(undefined)));
        try {
            const transport = socketTransport();
            await transport.send(path, "githerd: hello");
            await expect(transport.send(join(dir, "gone.sock"), "x")).rejects.toThrow(/ENOENT/);
            await new Promise((resolve) => setImmediate(resolve));
            expect(received.map((r) => JSON.parse(r))).toEqual([
                { type: "user", message: { role: "user", content: "githerd: hello" } },
            ]);
            expect(received[0].endsWith("\n")).toBe(true);
        } finally {
            await new Promise((resolve) => server.close(() => resolve(undefined)));
        }
    });
});

describe("tellSessions", () => {
    it("reports who was reached and who was not, without throwing", async () => {
        const sessions = [
            { pid: 1, sessionId: "a", name: "a", cwd: "/r", socket: "/a.sock", status: "idle" },
            { pid: 2, sessionId: "b", name: "b", cwd: "/r", socket: "/b.sock", status: "busy" },
        ];
        /** @type {[string, string][]} */
        const sent = [];
        const transport = {
            send: async (/** @type {string} */ socket, /** @type {string} */ text) => {
                if (socket === "/b.sock") throw new Error("connect ECONNREFUSED");
                sent.push([socket, text]);
            },
        };
        expect(await tellSessions(sessions, "hi", transport)).toEqual({
            sent: ["a"],
            failed: [{ name: "b", error: "connect ECONNREFUSED" }],
        });
        expect(sent).toEqual([["/a.sock", "hi"]]);
    });
});
