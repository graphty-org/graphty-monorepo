import { describe, expect, it } from "vitest";

import { attributeTickets, ticketCloses } from "../lib/waits.mjs";

describe("attributeTickets", () => {
    it("names each ticket's pushed branch and the session its process runs under", () => {
        const tickets = [
            { pid: 30, cwd: "/r/.worktrees/feat-a", command: "git push -u origin HEAD:feat/a" },
            { pid: 40, cwd: "/r/.worktrees/feat-b", command: "git push" },
        ];
        const facts = {
            sessions: [{ pid: 10, sessionId: "s1" }],
            procs: [
                { pid: 30, ppid: 20 },
                { pid: 20, ppid: 10 },
                { pid: 10, ppid: 1 },
                { pid: 40, ppid: 1 },
            ],
        };
        expect(attributeTickets(tickets, facts)).toEqual([
            { branch: "feat/a", cwd: "/r/.worktrees/feat-a", session: "s1" },
            { branch: null, cwd: "/r/.worktrees/feat-b", session: null },
        ]);
    });
});

describe("ticketCloses", () => {
    it("names the issues each ticket's commits close, not the ones they only reference", async () => {
        const tickets = [
            { branch: "fix/a", cwd: "/a", session: "s1" },
            { branch: "fix/b", cwd: "/b", session: null },
        ];
        const messages = { "/a": "fix: x\n\nFixes #2085\nRefs #2062\n\nfeat: y\n\nCloses: #12\n", "/b": "" };
        expect(await ticketCloses(tickets, async (cwd) => messages[cwd])).toEqual([
            { branch: "fix/a", cwd: "/a", session: "s1", closes: [12, 2085] },
            { branch: "fix/b", cwd: "/b", session: null, closes: [] },
        ]);
    });
});
