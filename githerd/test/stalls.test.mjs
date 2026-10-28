import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { statusStep } from "../lib/asks.mjs";
import { move, newJob } from "../lib/board.mjs";
import { droppableItems, endItem, planPages } from "../lib/notify.mjs";
import { scanTranscripts } from "../lib/owners.mjs";
import { stallStep, usageBackStep, usageLimitStep } from "../lib/stalls.mjs";
import { tempDir } from "./helpers/temp-dir.mjs";

// The real stall of graphty-monorepo-2d (githerd's ledger, 2026-10-12): it claimed issue-2071 at
// 00:52 and issue-467 at 01:08, heard the status question about both at 02:45:21, never answered,
// and at 03:02 githerd released both claims. Its registry entry had shown a user dialog since 02:36.
// githerd then asked it for its capacity every 15 to 50 minutes for 22 hours and never told the owner.
const ID = "924bfbd5-3a48-4ab0-b79d-a24be0eb5108";
const NAME = "graphty-monorepo-2d";
const MINUTES = 15;
const at = (/** @type {string} */ hm) => new Date(`2026-10-12T${hm}Z`);

/**
 * The state before 03:02: both jobs held by 2d, the 02:45 question heard and unanswered.
 * @returns {any} the state
 */
function held() {
    /** @type {any} */
    const jobs = {};
    for (const [id, claimed] of [
        ["issue-2071", "00:52:04"],
        ["issue-467", "01:08:18"],
    ]) {
        const job = newJob({ kind: "issue", target: `#${id.slice(6)}`, id }, at(claimed));
        move(job, "starting", at(claimed), { holder: { session: ID, window: null, startedBy: "owner" } });
        move(job, "working", at(claimed));
        job.claim = { session: ID, at: at(claimed).toISOString() };
        job.statusAsk = { at: "2026-10-12T02:45:21.706Z", heard: true };
        jobs[id] = job;
    }
    // The MCP server's minute heartbeat keeps lastSeen fresh; the session itself last called at 01:08.
    return { jobs, sessions: { [ID]: { lastSeen: "2026-10-12T03:01:00.000Z", calledAt: "2026-10-12T01:08:18.000Z" } } };
}

/**
 * 2d's registry entry as githerd reads it.
 * @param {string} status the registry status
 * @returns {import("../lib/peers.mjs").PeerSession[]} the live sessions
 */
const live = (status) => [{ pid: 7, sessionId: ID, name: NAME, cwd: "/r", socket: "/2d.sock", status }];

/**
 * One poll: the status question, then the stall step, then the owner's pages (he is away).
 * @param {any} state the state
 * @param {Date} now the poll's time
 * @param {string} status 2d's registry status
 * @returns {Promise<{lines: any[], pages: import("../lib/notify.mjs").Page[]}>} what the poll did
 */
async function poll(state, now, status) {
    const transport = { send: async () => {} };
    const sessions = () => live(status);
    const asked = await statusStep(state, { now, acting: true, sessions, transport, minutes: MINUTES });
    const lines = [...asked, ...stallStep(state, { now, minutes: MINUTES, sessions: live(status), lines: asked })];
    return { lines, pages: planPages(state, now) };
}

describe("a session that stops answering githerd", () => {
    it("pages the owner once when the status question releases its claims, naming the session", async () => {
        const state = held();
        const { lines, pages } = await poll(state, at("03:02:05"), "busy");
        expect(lines.filter((l) => l.kind === "claim-released")).toHaveLength(2);
        expect(lines).toContainEqual(expect.objectContaining({ kind: "stall", session: NAME, stall: "silent" }));
        expect(pages).toHaveLength(1);
        expect(pages[0].message).toBe(
            "Session graphty-monorepo-2d stopped answering githerd's status questions (unanswered since 10-12 02:45 UTC); githerd released its claims. Look at that session.",
        );
        expect(pages[0].bypass).toBe(true);
        // The 22 hours of capacity questions that followed page nothing more.
        for (const hm of ["03:25:19", "04:14:31", "11:07:21", "21:23:09"]) {
            expect((await poll(state, at(hm), "busy")).pages).toEqual([]);
        }
    });

    it("pages again for a new stall after the session answered", async () => {
        const state = held();
        expect((await poll(state, at("03:02:05"), "busy")).pages).toHaveLength(1);
        state.sessions[ID].calledAt = at("05:00:00").toISOString();
        const recovered = await poll(state, at("05:01:00"), "idle");
        expect(recovered.lines).toContainEqual({ kind: "stall-ended", session: NAME, why: "recovered" });
        expect(state.ownerItems[`stalled:${ID}`].endedAt).toBe(at("05:01:00").toISOString());
        // It claims again and goes silent again.
        const job = state.jobs["issue-2071"];
        move(job, "starting", at("05:10:00"), { holder: { session: ID, window: null, startedBy: "owner" } });
        move(job, "working", at("05:10:00"));
        job.claim = { session: ID, at: at("05:10:00").toISOString() };
        job.statusAsk = { at: at("05:25:00").toISOString(), heard: true };
        expect((await poll(state, at("05:40:00"), "busy")).pages).toHaveLength(1);
    });

    it("neither releases nor pages when the session called githerd after the question it missed", async () => {
        const state = held();
        state.sessions[ID].calledAt = at("02:50:00").toISOString();
        const { lines, pages } = await poll(state, at("03:02:05"), "busy");
        // The call is the session at work, which answers the question (asks.mjs progress).
        expect(lines.filter((l) => l.kind === "claim-released")).toEqual([]);
        expect(lines.filter((l) => l.kind === "status-seen")).toHaveLength(2);
        expect(pages).toEqual([]);
    });

    it("ends the stall when the session ends", async () => {
        const state = held();
        await poll(state, at("03:02:05"), "busy");
        const lines = stallStep(state, { now: at("04:00:00"), minutes: MINUTES, sessions: [], lines: [] });
        expect(lines).toEqual([{ kind: "stall-ended", session: NAME, why: "session ended" }]);
    });
});

describe("a session waiting on a user dialog", () => {
    it("pages once after a full status cadence on the dialog, the way 2d sat from 02:36", async () => {
        const state = held();
        // 02:42: githerd first sees the dialog; 02:56 is still under one cadence.
        expect((await poll(state, at("02:42:21"), "waiting")).pages).toEqual([]);
        expect((await poll(state, at("02:56:00"), "waiting")).pages).toEqual([]);
        const { lines, pages } = await poll(state, at("02:57:30"), "waiting");
        expect(lines).toContainEqual(expect.objectContaining({ kind: "stall", stall: "dialog" }));
        expect(pages.map((p) => p.message)).toEqual([
            "Session graphty-monorepo-2d has sat on a dialog waiting for user input since 10-12 02:42 UTC; it cannot answer githerd. Answer it in that session.",
        ]);
        // The claims released at 03:02 and every later question page nothing more.
        for (const hm of ["03:02:05", "03:25:19", "12:11:15"]) {
            expect((await poll(state, at(hm), "waiting")).pages).toEqual([]);
        }
        // The owner answers the dialog: the stall ends.
        const after = await poll(state, at("13:00:00"), "idle");
        expect(after.lines).toContainEqual({ kind: "stall-ended", session: NAME, why: "recovered" });
    });

    it("names the dialog at once when a release finds the session on one", async () => {
        const state = held();
        const { pages } = await poll(state, at("03:02:05"), "waiting");
        expect(pages[0].message).toContain("has sat on a dialog waiting for user input since 10-12 03:02 UTC");
    });

    it("does not page for a dialog answered within a cadence", async () => {
        const state = { jobs: {} };
        stallStep(state, { now: at("10:00:00"), minutes: MINUTES, sessions: live("waiting"), lines: [] });
        stallStep(state, { now: at("10:05:00"), minutes: MINUTES, sessions: live("idle"), lines: [] });
        expect(stallStep(state, { now: at("10:30:00"), minutes: MINUTES, sessions: live("idle"), lines: [] })).toEqual(
            [],
        );
        expect(planPages(state, at("10:30:00"))).toEqual([]);
    });
});

describe("the usage limit", () => {
    /** @type {string[]} */
    const dirs = [];
    afterEach(() => {
        for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
    });

    /**
     * Writes a session transcript holding Claude Code's limit message, as d2b6bb9a's held it at
     * 2026-10-10 08:32:55, and scans it.
     * @param {any} [quota] the entry's quotaLimits
     * @returns {Promise<any>} the transcripts as the daemon keeps them
     */
    async function scanned(quota = { status: "rejected", resetsAt: 1791849600, rateLimitType: "seven_day" }) {
        const projects = tempDir("githerd-stalls-");
        dirs.push(projects);
        const cwd = "/home/u/repo";
        mkdirSync(join(projects, "-home-u-repo"));
        const entry = {
            type: "assistant",
            timestamp: "2026-10-10T08:32:55.983Z",
            message: {
                model: "<synthetic>",
                role: "assistant",
                content: [
                    { type: "text", text: "You've hit your weekly limit · resets Oct 12, 5pm (America/Los_Angeles)" },
                ],
            },
            quotaLimits: quota,
            error: "rate_limit",
            isApiErrorMessage: true,
            sessionId: "d2b6",
        };
        writeFileSync(join(projects, "-home-u-repo", "d2b6.jsonl"), `{"type":"user"}\n${JSON.stringify(entry)}\n`);
        const scans = {};
        await scanTranscripts(scans, [{ pid: 1, sessionId: "d2b6", name: "graphty-monorepo-d2", cwd }], {
            root: cwd,
            projectsDir: projects,
        });
        return scans;
    }

    it("pages the owner once, at once, with the reset time the message names", async () => {
        const state = { transcripts: await scanned() };
        const now = new Date("2026-10-10T08:35:00Z");
        expect(usageLimitStep(state, now)).toEqual([
            { kind: "usage-limit-seen", session: "graphty-monorepo-d2", resets: "2026-10-13T00:00:00.000Z" },
        ]);
        const pages = planPages(state, now);
        expect(pages.map((p) => p.message)).toEqual([
            `Claude's usage limit stopped the sessions: "You've hit your weekly limit - resets Oct 12, 5pm (America/Los_Angeles)" (seen in graphty-monorepo-d2 at 10-10 08:32 UTC). They resume after the reset, or when you raise the limit.`,
        ]);
        expect(pages[0].bypass).toBe(true);
        // The 286 more messages that day page nothing more.
        expect(usageLimitStep(state, new Date("2026-10-10T12:00:00Z"))).toEqual([]);
        expect(planPages(state, new Date("2026-10-10T12:00:00Z"))).toEqual([]);
        // Past the reset the item ends.
        expect(usageLimitStep(state, new Date("2026-10-13T00:01:00Z"))).toEqual([
            { kind: "usage-limit-reset", resets: "2026-10-13T00:00:00.000Z" },
        ]);
    });

    it("keeps a limit the owner answered until it resets, so it is not raised again, then lets it go", async () => {
        const state = { transcripts: await scanned() };
        usageLimitStep(state, new Date("2026-10-10T08:35:00Z"));
        const id = "usage-limit:2026-10-13T00:00:00.000Z";
        endItem(state, id, "record", new Date("2026-10-10T09:00:00Z"));
        expect(droppableItems(state)).toEqual([]);
        expect(usageLimitStep(state, new Date("2026-10-10T12:00:00Z"))).toEqual([]);
        expect(state.ownerItems[id].endedBy).toBe("record");
        expect(usageLimitStep(state, new Date("2026-10-13T00:01:00Z"))).toEqual([]);
        expect(droppableItems(state).map((i) => i.id)).toEqual([id]);
    });

    it("reads the reset from the message when the API gave none", async () => {
        const state = { transcripts: await scanned(null) };
        const lines = usageLimitStep(state, new Date("2026-10-10T08:35:00Z"));
        expect(lines).toEqual([
            expect.objectContaining({ kind: "usage-limit-seen", resets: "2026-10-11T00:00:00.000Z" }),
        ]);
    });

    it("ignores a limit that already reset", async () => {
        const state = { transcripts: await scanned() };
        expect(usageLimitStep(state, new Date("2026-10-14T00:00:00Z"))).toEqual([]);
    });

    // 2026-10-13: the owner topped up credits at about 21:45 PDT, hours before the reset; the
    // sessions stayed parked on "Usage limit reached - Continuing automatically at 1:30am" and the
    // background agents that died with HTTP 429 waited until someone messaged each session.
    it("tells the limited sessions and ends the owner item when usage comes back before the reset", async () => {
        const state = { transcripts: await scanned() };
        const id = "usage-limit:2026-10-13T00:00:00.000Z";
        /** @type {{socket: string, text: string}[]} */
        const sent = [];
        const transport = {
            send: async (/** @type {string} */ socket, /** @type {string} */ text) => void sent.push({ socket, text }),
        };
        const sessions = [
            {
                pid: 1,
                sessionId: "d2b6",
                name: "graphty-monorepo-d2",
                cwd: "/home/u/repo",
                socket: "/s/d2",
                status: "idle",
            },
            {
                pid: 2,
                sessionId: "e7",
                name: "graphty-monorepo-e7",
                cwd: "/home/u/repo",
                socket: "/s/e7",
                status: "idle",
            },
        ];
        let usable = false;
        let probes = 0;
        const probe = async () => (probes++, usable);
        const step = (/** @type {string} */ iso, acting = true) =>
            usageBackStep(state, { now: new Date(iso), minutes: MINUTES, sessions, transport, acting, probe });

        usageLimitStep(state, new Date("2026-10-10T08:35:00Z"));
        // Still limited: the probe fails, nothing is told, the item stays open.
        expect(await step("2026-10-10T08:35:00Z")).toEqual([{ kind: "usage-probe", back: false }]);
        // No second probe within the status cadence.
        expect(await step("2026-10-10T08:45:00Z")).toEqual([]);
        expect(probes).toBe(1);
        expect(state.ownerItems[id].endedAt).toBeUndefined();

        // The owner restores usage; the next probe succeeds hours before the reset.
        usable = true;
        expect(await step("2026-10-10T08:51:00Z")).toEqual([
            { kind: "usage-back", resets: ["2026-10-13T00:00:00.000Z"], sent: ["graphty-monorepo-d2"], failed: [] },
        ]);
        expect(sent).toEqual([{ socket: "/s/d2", text: expect.stringContaining("usage limit is over") }]);
        expect(state.ownerItems[id]).toMatchObject({ endedBy: "cleared" });
        expect(droppableItems(state).map((i) => i.id)).toEqual([id]);

        // The same limit is not raised or told again, even once its item is dropped.
        delete state.ownerItems[id];
        expect(usageLimitStep(state, new Date("2026-10-10T09:30:00Z"))).toEqual([]);
        expect(await step("2026-10-10T09:30:00Z")).toEqual([]);
        expect(probes).toBe(2);

        // A new limit later pages again and is probed again.
        state.transcripts.d2b6.limit = { ...state.transcripts.d2b6.limit, at: "2026-10-11T10:00:00.000Z" };
        expect(usageLimitStep(state, new Date("2026-10-11T10:01:00Z"))).toEqual([
            { kind: "usage-limit-seen", session: "graphty-monorepo-d2", resets: "2026-10-13T00:00:00.000Z" },
        ]);
        usable = false;
        expect(await step("2026-10-11T10:01:00Z")).toEqual([{ kind: "usage-probe", back: false }]);
    });

    it("only says whom it would tell in dry-run", async () => {
        const state = { transcripts: await scanned() };
        usageLimitStep(state, new Date("2026-10-10T08:35:00Z"));
        const transport = { send: async () => expect.unreachable() };
        const sessions = [
            { pid: 1, sessionId: "d2b6", name: "graphty-monorepo-d2", cwd: "/r", socket: "/s", status: null },
        ];
        const lines = await usageBackStep(state, {
            now: new Date("2026-10-10T08:40:00Z"),
            minutes: MINUTES,
            sessions,
            transport,
            acting: false,
            probe: async () => true,
        });
        expect(lines).toEqual([
            { kind: "would-do", group: "workers", op: "tell 1 session(s) the usage limit is over" },
            { kind: "usage-back", resets: ["2026-10-13T00:00:00.000Z"], sent: [], failed: [] },
        ]);
    });

    it("raises no stall for a session silenced by the limit", async () => {
        const state = {
            ...held(),
            transcripts: await scanned({ resetsAt: Date.parse("2026-10-12T20:00:00Z") / 1000 }),
        };
        usageLimitStep(state, at("03:00:00"));
        planPages(state, at("03:00:00"));
        const { lines, pages } = await poll(state, at("03:12:05"), "idle");
        expect(lines.filter((l) => l.kind === "claim-released")).toHaveLength(2);
        expect(lines.some((l) => l.kind === "stall")).toBe(false);
        expect(pages).toEqual([]);
    });
});
