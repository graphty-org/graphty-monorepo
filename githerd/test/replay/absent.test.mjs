import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { startDaemon } from "../../lib/daemon.mjs";
import { ownerItemsPoll, endItem, raiseItem } from "../../lib/notify.mjs";
import { readLedger } from "../../lib/store.mjs";
import { createFakeGh, httpOutput } from "../helpers/fake-gh.mjs";

const DATA = new URL("data/", import.meta.url);
const FROM = Date.parse("2026-09-26T00:00:00Z");
const TO = Date.parse("2026-10-03T00:00:00Z");
const STEP = 5 * 60_000;

/**
 * The owner items of the recorded week 09-26 to 10-02, as events in time order: every pull
 * request the owner opened waits on his visual review from its creation until it merged or
 * closed, and every failed job of master's GPU lane waits on him (a failed urgent job blocks the
 * release) until the lane's next failure of another step replaces it.
 * @returns {{at: number, raise?: any, end?: string}[]} the events
 */
function weekEvents() {
    const prs = JSON.parse(readFileSync(new URL("prs.json", DATA), "utf8"));
    /** @type {{at: number, raise?: any, end?: string}[]} */
    const events = [];
    for (const pr of prs) {
        const created = Date.parse(pr.createdAt);
        if (pr.author?.login !== "apowers313" || created < FROM || created >= TO) continue;
        const id = `visual-${pr.number}`;
        events.push({
            at: created,
            raise: { id, kind: "visual", question: `Review ${pr.title}`, target: `pr:${pr.number}` },
        });
        const closed = pr.mergedAt ?? pr.closedAt;
        if (closed) events.push({ at: Date.parse(closed), end: id });
    }
    const gpu = readFileSync(new URL("failed-jobs.jsonl", DATA), "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
        .filter((j) => j.wf === "GPU" && Date.parse(j.ts) >= FROM && Date.parse(j.ts) < TO);
    for (const j of gpu) {
        events.push({
            at: Date.parse(j.ts),
            raise: {
                id: "gpu-lane",
                kind: "failed-urgent-job",
                question: `GPU lane failed: ${j.steps.join(", ")}`,
                blocks: "release",
            },
        });
    }
    return events.sort((a, b) => a.at - b.at);
}

describe("an absent week", () => {
    it("sends at most one digest a day and pages only what blocks the release, once per text", async () => {
        const events = weekEvents();
        expect(events.filter((e) => e.raise?.kind === "visual").length).toBeGreaterThan(100);
        const state = {};
        /** @type {any[]} */
        const sent = [];
        const notifier = { send: (/** @type {any} */ p) => sent.push(p) > 0 };
        let next = 0;
        for (let t = FROM; t < TO; t += STEP) {
            for (; next < events.length && events[next].at <= t; next++) {
                const e = events[next];
                if (e.raise) raiseItem(state, e.raise, new Date(e.at));
                else endItem(state, /** @type {string} */ (e.end), "cleared", new Date(e.at));
            }
            await ownerItemsPoll({ state, notifier, acting: false, now: new Date(t) });
        }

        const digests = sent.filter((p) => p.key.startsWith("digest:"));
        const days = digests.map((p) => p.key.slice(7));
        // one digest on each day of the week, each after the digest hour, never two on a day
        expect(days).toEqual([
            "2026-09-26",
            "2026-09-27",
            "2026-09-28",
            "2026-09-29",
            "2026-09-30",
            "2026-10-01",
            "2026-10-02",
        ]);

        const pages = sent.filter((p) => p.key.startsWith("owner:"));
        // every page is about the blocking GPU item; no visual review pages while he is away
        expect(pages.every((p) => p.message.startsWith("GPU lane failed"))).toBe(true);
        expect(new Set(pages.map((p) => p.message)).size).toBe(pages.length);
        const texts = new Set(events.filter((e) => e.raise?.blocks).map((e) => e.raise.question));
        // the record holds three different GPU failures that week (five runs of one step on 09-27,
        // one on 09-28, six of another on 09-29): one page each, never a repeat
        expect(texts.size).toBe(3);
        expect(pages).toHaveLength(3);
        expect(sent.length).toBe(digests.length + pages.length);
    });
});

describe("an absent week, through the whole daemon", () => {
    it("every page it sends is a digest or a blocking item: no alive notice, no reminder, no recovery", async () => {
        const dir = mkdtempSync(join(tmpdir(), "githerd-absent-"));
        const config = join(dir, "githerd.config.json");
        writeFileSync(
            config,
            JSON.stringify({
                repo: "o/r",
                lanes: { ci: { workflow: "ci.yml", gating: "required" } },
                notify: { command: ["true"] },
            }),
        );
        const sha = "a".repeat(40);
        const ok = (/** @type {unknown} */ body) => httpOutput({ status: 200, body });
        const gh = createFakeGh(({ args, input }) => {
            const path = args.at(-1);
            if (input?.includes("pullRequests(")) {
                return ok({
                    data: {
                        repository: {
                            defaultBranchRef: { name: "master", target: { oid: sha } },
                            pullRequests: { nodes: [] },
                        },
                    },
                });
            }
            if (input?.includes("search(")) return ok({ data: { search: { issueCount: 0, nodes: [] } } });
            if (path === "user") return ok({ login: "apowers313" });
            if (path.includes("/actions/workflows/ci.yml/runs?")) {
                return ok({
                    workflow_runs: [
                        {
                            id: 1,
                            run_attempt: 1,
                            head_sha: sha,
                            status: "completed",
                            conclusion: "success",
                            updated_at: "2026-09-25T12:00:00Z",
                        },
                    ],
                });
            }
            if (path.includes("/commits?sha=master")) {
                return ok([
                    { sha, parents: [], commit: { message: "first", committer: { date: "2026-09-25T12:00:00Z" } } },
                ]);
            }
            if (path.includes("/issues?")) return ok([]);
            return ok([]);
        });
        let clock = new Date(FROM);
        const daemon = await startDaemon({
            root: dir,
            port: 0,
            fetch: gh.fetch,
            token: gh.token,
            git: async () => ({ code: 0, stdout: "", stderr: "" }),
            now: () => clock,
            env: { GITHERD_CONFIG: config, PATH: process.env.PATH, HOME: dir },
            stateDir: join(dir, ".githerd"),
            autoPoll: false,
            workers: false,
            log: () => {},
        });
        try {
            const events = weekEvents();
            let next = 0;
            for (let t = FROM; t < TO; t += 30 * 60_000) {
                clock = new Date(t);
                for (; next < events.length && events[next].at <= t; next++) {
                    const e = events[next];
                    if (e.raise) raiseItem(daemon.state, e.raise, new Date(e.at));
                    else endItem(daemon.state, /** @type {string} */ (e.end), "cleared", new Date(e.at));
                }
                await daemon.poll();
                await daemon.flushNotifications();
            }
            await daemon.shutdown();
            const sent = (await readLedger(join(dir, ".githerd"))).filter((e) => e.kind === "notify");
            const digests = sent.filter((e) => e.keys[0].startsWith("digest:"));
            const owner = sent.filter((e) => e.keys[0].startsWith("owner:"));
            expect(sent).toHaveLength(digests.length + owner.length);
            expect(new Set(digests.map((e) => e.keys[0])).size).toBe(digests.length);
            expect(digests.length).toBeLessThanOrEqual(7);
            expect(owner.every((e) => e.message.startsWith("GPU lane failed"))).toBe(true);
            expect(owner).toHaveLength(3);
        } finally {
            if (!daemon.fenced) await daemon.shutdown();
            rmSync(dir, { recursive: true, force: true });
        }
        // A week of polls through the real daemon is 4.6 s of work on an idle machine, too close to
        // vitest's 5 s default to pass while other suites run.
    }, 30_000);
});
