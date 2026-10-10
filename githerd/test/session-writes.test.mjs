import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ghWrites, logSessionWrites, SESSION_WRITES, sessionWriteCheck } from "../lib/session-writes.mjs";

/** @type {string} */
let dir;
beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "githerd-session-writes-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("ghWrites", () => {
    it("finds the gh writes on issues and pull requests, with the numbers they name", () => {
        expect(ghWrites("gh issue comment 12 --body 'looks fine'")).toEqual([[12]]);
        expect(ghWrites("cd x && gh pr comment --body hi")).toEqual([[]]);
        expect(ghWrites("gh api -X PATCH repos/o/r/issues/7 -f state=closed")).toEqual([[7]]);
        expect(ghWrites("gh api repos/o/r/issues/7/comments -f body=x")).toEqual([[7]]);
        expect(ghWrites("gh pr close 9; gh issue reopen 4")).toEqual([[9], [4]]);
        // A shell comment is not a command: `#9` starts one.
        expect(ghWrites("gh pr close #9")).toEqual([[]]);
    });

    it("leaves reads alone", () => {
        expect(ghWrites("gh issue view 12")).toBeNull();
        expect(ghWrites("gh api repos/o/r/issues/7")).toBeNull();
        expect(ghWrites("gh api -X GET repos/o/r/issues/7")).toBeNull();
        expect(ghWrites("git log --oneline")).toBeNull();
    });
});

describe("the session-write log", () => {
    it("matches an owner-account event to a write a session logged just before it on the same number", () => {
        const input = (/** @type {string} */ command) => ({
            tool_name: "Bash",
            session_id: "s1",
            tool_input: { command },
        });
        logSessionWrites(dir, input("gh issue comment 12 -b ok"), null, new Date("2026-10-04T12:00:00Z"));
        logSessionWrites(dir, input("gh issue view 13"), null, new Date("2026-10-04T12:00:00Z"));
        logSessionWrites(dir, { tool_name: "Edit", tool_input: {} }, null, new Date("2026-10-04T12:00:00Z"));
        expect(readFileSync(join(dir, SESSION_WRITES), "utf8").trim().split("\n")).toHaveLength(1);
        const wrote = sessionWriteCheck(dir);
        expect(wrote("issue:12", "2026-10-04T12:00:05Z")).toBe(true);
        expect(wrote("issue:13", "2026-10-04T12:00:05Z")).toBe(false);
        expect(wrote("#12", "2026-10-04T12:00:05Z")).toBe(true);
        expect(wrote("pr:", "2026-10-04T12:00:05Z")).toBe(false);
        // An event long after the write, or well before it, is someone else's.
        expect(wrote("issue:12", "2026-10-04T12:30:00Z")).toBe(false);
        expect(wrote("issue:12", "2026-10-04T11:50:00Z")).toBe(false);
        expect(sessionWriteCheck(join(dir, "missing"))("issue:12", "2026-10-04T12:00:05Z")).toBe(false);
    });
});
