import { describe, expect, it } from "vitest";

import { attributeTickets } from "../lib/waits.mjs";

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
