import { describe, expect, it } from "vitest";

import { createGitHub } from "../lib/github.mjs";
import {
    BATCH_MS,
    endItem,
    isPresent,
    itemText,
    LABEL,
    lastTypedAt,
    notePresence,
    ownerItemsPoll,
    planPages,
    postItems,
    presentDays,
    PRESENT_MS,
    raiseItem,
    readAnswers,
} from "../lib/notify.mjs";
import { createFakeGh, httpOutput } from "./helpers/fake-gh.mjs";

const REPO = "graphty-org/graphty-monorepo";
const T0 = Date.parse("2026-10-05T17:00:00Z");
const MIN = 60_000;
const at = (/** @type {number} */ ms) => new Date(T0 + ms);
const LOGIN = "apowers313";

/** @type {import("../lib/notify.mjs").ItemInput} */
const GPU = {
    id: "paid-gpu",
    kind: "money",
    question: "The GPU lane is out of balance.",
    options: [{ choice: "top up", undo: "nothing to undo" }],
    blocks: "release",
};
const VISUAL = { id: "visual-412", kind: "visual", question: "Review the stories of #412.", target: "pr:412" };
const DOOR = { id: "door-9", kind: "one-way-door", question: "Rename the package?", target: "issue:9" };

describe("owner item records", () => {
    it("raises, keeps, changes on a new text, and raises an ended item again as new", () => {
        const state = {};
        expect(raiseItem(state, GPU, at(0))).toBe("raised");
        expect(raiseItem(state, GPU, at(MIN))).toBe("same");
        expect(state.ownerItems["paid-gpu"]).toMatchObject({ raisedAt: at(0).toISOString(), target: null });
        expect(raiseItem(state, { ...GPU, question: "Balance is negative." }, at(2 * MIN))).toBe("changed");
        expect(state.ownerItems["paid-gpu"].updatedAt).toBe(at(2 * MIN).toISOString());
        expect(endItem(state, "paid-gpu", "cleared", at(3 * MIN))).toBe(true);
        expect(endItem(state, "paid-gpu", "cleared", at(3 * MIN))).toBe(false);
        expect(endItem(state, "nope", "cleared", at(3 * MIN))).toBe(false);
        expect(raiseItem(state, GPU, at(4 * MIN))).toBe("raised");
        expect(state.ownerItems["paid-gpu"].endedAt).toBeUndefined();
        expect(() => raiseItem(state, /** @type {any} */ ({ id: "x", kind: "y" }), at(0))).toThrow(/needs id/);
    });

    it("words an item with its options and what undoing each costs", () => {
        expect(itemText({ question: "Q?", options: [{ choice: "a", undo: "a revert" }] })).toBe(
            "Q? Options: a (undo: a revert)",
        );
        expect(itemText({ question: "Q?" })).toBe("Q?");
    });
});

describe("presence", () => {
    it("is present for 2 hours after the last sign, and counts present days", () => {
        const state = {};
        expect(isPresent(state, at(0))).toBe(false);
        notePresence(state, "cli", at(0).toISOString());
        notePresence(state, "session", at(-MIN).toISOString());
        expect(state.presence).toMatchObject({ lastAt: at(0).toISOString(), source: "cli" });
        expect(isPresent(state, at(PRESENT_MS - 1))).toBe(true);
        expect(isPresent(state, at(PRESENT_MS))).toBe(false);
        notePresence(state, "github", "2026-10-07T01:00:00Z");
        expect(presentDays(state, "2026-10-05T00:00:00Z")).toBe(2);
        expect(presentDays(state, "2026-10-06")).toBe(1);
        for (let d = 1; d <= 70; d++) notePresence(state, "cli", new Date(T0 - d * 86_400_000).toISOString());
        expect(state.presence.days).toHaveLength(60);
        expect(state.presence.days.at(-1)).toBe("2026-10-07");
    });

    it("reads the newest typed record of a transcript and ignores everything else", () => {
        const rec = (/** @type {object} */ r) => JSON.stringify({ type: "user", ...r });
        const transcript = [
            rec({ timestamp: "2026-10-05T10:00:00Z", origin: { kind: "human" }, message: { content: "go" } }),
            rec({
                timestamp: "2026-10-05T11:00:00Z",
                origin: { kind: "task-notification" },
                message: { content: "<task-notification>" },
            }),
            rec({
                timestamp: "2026-10-05T12:00:00Z",
                toolUseResult: {},
                message: { content: [{ type: "tool_result" }] },
            }),
            JSON.stringify({ type: "assistant", timestamp: "2026-10-05T13:00:00Z" }),
            '{not json with "user"',
            rec({ timestamp: "2026-10-05T09:00:00Z", origin: { kind: "human" }, message: { content: "older" } }),
        ].join("\n");
        expect(lastTypedAt(transcript)).toBe("2026-10-05T10:00:00Z");
        const legacy = [
            rec({ timestamp: "2026-10-05T08:00:00Z", message: { content: "typed" } }),
            rec({ timestamp: "2026-10-05T09:00:00Z", isMeta: true, message: { content: "meta" } }),
            rec({ timestamp: "2026-10-05T09:30:00Z", message: { content: "<local-command-stdout>x" } }),
        ].join("\n");
        expect(lastTypedAt(legacy)).toBe("2026-10-05T08:00:00Z");
        expect(lastTypedAt("")).toBeNull();
    });
});

describe("planPages", () => {
    it("pages a due item once while present, again only when its text changes", () => {
        const state = {};
        notePresence(state, "cli", at(0).toISOString());
        raiseItem(state, VISUAL, at(0));
        expect(planPages(state, at(0))).toEqual([
            expect.objectContaining({ status: "waiting", message: "#412: Review the stories of #412.", bypass: false }),
        ]);
        expect(planPages(state, at(BATCH_MS))).toEqual([]);
        raiseItem(state, { ...VISUAL, question: "Review #412 again." }, at(BATCH_MS));
        expect(planPages(state, at(BATCH_MS)).map((p) => p.message)).toEqual(["#412: Review #412 again."]);
        endItem(state, VISUAL.id, "answer", at(BATCH_MS));
        raiseItem(state, DOOR, at(BATCH_MS));
        endItem(state, DOOR.id, "cleared", at(BATCH_MS));
        expect(planPages(state, at(3 * BATCH_MS))).toEqual([]);
    });

    it("holds items due within 10 minutes of a page and sends them together as one", () => {
        const state = {};
        notePresence(state, "cli", at(0).toISOString());
        raiseItem(state, VISUAL, at(0));
        expect(planPages(state, at(0))).toHaveLength(1);
        raiseItem(state, DOOR, at(MIN));
        raiseItem(state, GPU, at(2 * MIN));
        expect(planPages(state, at(2 * MIN))).toEqual([]);
        const [page] = planPages(state, at(BATCH_MS));
        expect(page.message).toBe("2 items wait on you: #9: Rename the package?; The GPU lane is out of balance.");
        expect(page.bypass).toBe(true);
        expect(state.ownerItems[DOOR.id].paged).toMatchObject({ via: "page" });
    });

    it("while absent pages only blocking items and puts the rest in one digest a day after its hour", () => {
        const state = {};
        raiseItem(state, VISUAL, at(-2 * 60 * MIN));
        raiseItem(state, GPU, at(-2 * 60 * MIN));
        // 15:00 UTC, before the 16:00 digest hour: only the blocking item pages
        expect(planPages(state, at(-2 * 60 * MIN)).map((p) => p.key.split(":")[0])).toEqual(["owner"]);
        // 17:00: the digest
        const pages = planPages(state, at(0));
        expect(pages).toEqual([
            expect.objectContaining({
                key: "digest:2026-10-05",
                status: "info",
                message: "githerd digest: 1 item wait on you: #412: Review the stories of #412.",
            }),
        ]);
        raiseItem(state, DOOR, at(MIN));
        expect(planPages(state, at(60 * MIN))).toEqual([]);
        const next = planPages(state, new Date("2026-10-06T16:00:00Z"));
        expect(next.map((p) => [p.key, p.message])).toEqual([
            ["digest:2026-10-06", "githerd digest: 1 item wait on you: #9: Rename the package?"],
        ]);
        // the owner returns: nothing he already got pages again
        notePresence(state, "session", "2026-10-06T17:00:00Z");
        expect(planPages(state, new Date("2026-10-06T17:00:00Z"))).toEqual([]);
    });
});

/**
 * A fake GitHub that keeps labels and comments per issue and answers the owner-item calls.
 * @param {{failLabels?: boolean, deleteStatus?: number}} [options] make the label write fail, or
 *   answer the label delete with this status
 * @returns {{gh: ReturnType<typeof createFakeGh>, labels: Record<number, string[]>,
 *   comments: Record<number, any[]>}} the fake and its records
 */
function fakeRepo({ failLabels = false, deleteStatus = 204 } = {}) {
    /** @type {Record<number, string[]>} */
    const labels = {};
    /** @type {Record<number, any[]>} */
    const comments = {};
    let id = 100;
    const gh = createFakeGh(({ args, input }) => {
        const x = args.indexOf("-X");
        const method = x === -1 ? "GET" : args[x + 1];
        const path = args.find((a) => a.startsWith("repos/")) ?? "";
        const n = Number(/issues\/(\d+)/.exec(path)?.[1]);
        if (method === "POST" && path.endsWith("/comments")) {
            id += 1;
            comments[n] = [...(comments[n] ?? []), { id, body: JSON.parse(input ?? "{}").body }];
            return httpOutput({
                status: 201,
                body: { id, url: `https://api.github.com/repos/${REPO}/issues/comments/${id}` },
            });
        }
        if (method === "POST" && path.endsWith("/labels")) {
            if (failLabels) return httpOutput({ status: 422, body: { message: "no" } });
            labels[n] = [...new Set([...(labels[n] ?? []), ...JSON.parse(input ?? "{}").labels])];
            return httpOutput({ status: 200, body: labels[n].map((name) => ({ name })) });
        }
        if (method === "DELETE") {
            labels[n] = (labels[n] ?? []).filter((l) => l !== LABEL);
            return httpOutput({
                status: deleteStatus,
                body: deleteStatus === 404 ? { message: "Not Found" } : undefined,
            });
        }
        if (/issues\/comments\/\d+$/.test(path))
            return httpOutput({ status: 200, body: { id: Number(path.split("/").pop()) } });
        if (path.includes("/comments")) return httpOutput({ status: 200, body: comments[n] ?? [] });
        if (path.endsWith("/labels"))
            return httpOutput({ status: 200, body: (labels[n] ?? []).map((name) => ({ name })) });
        return httpOutput({ status: 404, body: { message: "Not Found" } });
    });
    return { gh, labels, comments };
}

/**
 * A client over the fake.
 * @param {ReturnType<typeof createFakeGh>} gh the fake
 * @param {string} mode the owner-items group's mode
 * @returns {{api: ReturnType<typeof createGitHub>, ledger: any[]}} the client and its ledger
 */
function client(gh, mode) {
    /** @type {any[]} */
    const ledger = [];
    const api = createGitHub({
        repo: REPO,
        exec: gh.exec,
        mode: () => mode,
        ledger: (e) => ledger.push(e),
        env: {},
        now: () => T0,
    });
    return { api, ledger };
}

describe("owner items on GitHub", () => {
    it("in dry-run records one would-do per text and writes nothing", async () => {
        const { gh } = fakeRepo();
        const { api, ledger } = client(gh, "dry-run");
        const state = {};
        raiseItem(state, VISUAL, at(0));
        raiseItem(state, GPU, at(0));
        await postItems({ api, repo: REPO, state, acting: false, now: at(0) });
        await postItems({ api, repo: REPO, state, acting: false, now: at(MIN) });
        expect(gh.writes()).toEqual([]);
        expect(ledger.filter((e) => e.kind === "would-do").map((e) => [e.op, e.group, e.situation])).toEqual([
            ["POST issues/412/comments", "owner-items", "owner-item:visual"],
            ["POST issues/412/labels", "owner-items", "owner-item:visual"],
        ]);
        expect(state.ownerItems[VISUAL.id].github).toMatchObject({ performed: false });
    });

    it("acting, posts a marked comment and the label, posts again on a text change, and unlabels when it ends", async () => {
        const { gh, labels, comments } = fakeRepo();
        const { api } = client(gh, "acting");
        const state = {};
        raiseItem(state, { ...DOOR, options: [{ choice: "rename", undo: "a major release" }] }, at(0));
        // a would-do from before the group acted is posted for real now
        state.ownerItems[DOOR.id].github = { text: itemText(state.ownerItems[DOOR.id]), performed: false, at: "x" };
        await postItems({ api, repo: REPO, state, acting: true, now: at(0) });
        await postItems({ api, repo: REPO, state, acting: true, now: at(MIN) });
        expect(labels[9]).toEqual([LABEL]);
        expect(comments[9]).toHaveLength(1);
        expect(comments[9][0].body).toContain("<!-- githerd:owner-item door-9 -->");
        expect(comments[9][0].body).toContain("- **rename**: to undo, a major release");
        raiseItem(state, { ...DOOR, question: "Rename it now?" }, at(2 * MIN));
        await postItems({ api, repo: REPO, state, acting: true, now: at(2 * MIN) });
        expect(comments[9]).toHaveLength(2);
        endItem(state, DOOR.id, "answer", at(3 * MIN));
        await postItems({ api, repo: REPO, state, acting: true, now: at(3 * MIN) });
        await postItems({ api, repo: REPO, state, acting: true, now: at(4 * MIN) });
        expect(labels[9]).toEqual([]);
        expect(gh.writes().filter((w) => w.args.includes("DELETE"))).toHaveLength(1);
    });

    it("keeps the label while another item on the same target is open, takes a 404 as already gone, and retries a failed post", async () => {
        const repo = fakeRepo({ deleteStatus: 404 });
        const { api } = client(repo.gh, "acting");
        const state = {};
        raiseItem(state, VISUAL, at(0));
        raiseItem(state, { ...VISUAL, id: "second" }, at(0));
        await postItems({ api, repo: REPO, state, acting: true, now: at(0) });
        endItem(state, "second", "answer", at(MIN));
        await postItems({ api, repo: REPO, state, acting: true, now: at(MIN) });
        expect(repo.gh.writes().filter((w) => w.args.includes("DELETE"))).toEqual([]);
        endItem(state, VISUAL.id, "answer", at(MIN));
        await postItems({ api, repo: REPO, state, acting: true, now: at(2 * MIN) });
        expect(state.ownerItems[VISUAL.id].github.unlabeled).toBe(true);

        const failing = fakeRepo({ failLabels: true });
        const f = client(failing.gh, "acting");
        const s2 = {};
        raiseItem(s2, DOOR, at(0));
        await postItems({ api: f.api, repo: REPO, state: s2, acting: true, now: at(0) });
        expect(s2.ownerItems[DOOR.id].github).toBeUndefined();
    });

    it("ends an item on the owner's own comment or a removed label, never on githerd's or a stranger's", async () => {
        const { gh, labels, comments } = fakeRepo();
        const { api } = client(gh, "acting");
        const state = {};
        raiseItem(state, VISUAL, at(0));
        raiseItem(state, DOOR, at(0));
        raiseItem(state, GPU, at(0));
        await postItems({ api, repo: REPO, state, acting: true, now: at(0) });
        const posted = state.ownerItems[VISUAL.id].github.at;
        const later = new Date(Date.parse(posted) + MIN).toISOString();
        comments[412].push(
            { user: { login: LOGIN }, created_at: later, body: "<!-- githerd:incident x --> not an answer" },
            { user: { login: "stranger" }, created_at: later, body: "approve" },
        );
        expect(await readAnswers({ api, repo: REPO, state, login: LOGIN, now: at(MIN) })).toEqual([]);
        comments[412].push({ user: { login: LOGIN }, created_at: later, body: "looked, fine" });
        labels[9] = [];
        expect(await readAnswers({ api, repo: REPO, state, login: LOGIN, now: at(MIN) })).toEqual([VISUAL.id, DOOR.id]);
        expect(state.ownerItems[VISUAL.id].endedBy).toBe("comment");
        expect(state.ownerItems[DOOR.id].endedBy).toBe("label-removed");
        expect(state.presence.lastAt).toBe(later);
    });

    it("leaves an item open when the read fails", async () => {
        const gh = createFakeGh(() => httpOutput({ status: 500, body: {} }));
        const { api } = client(gh, "acting");
        const state = {};
        raiseItem(state, VISUAL, at(0));
        state.ownerItems[VISUAL.id].github = { text: "t", performed: true, at: at(0).toISOString() };
        expect(await readAnswers({ api, repo: REPO, state, login: LOGIN, now: at(MIN) })).toEqual([]);
    });
});

describe("ownerItemsPoll", () => {
    it("reads answers, posts, pages, and ledgers what ended", async () => {
        const { gh, comments } = fakeRepo();
        const { api } = client(gh, "acting");
        const state = {};
        notePresence(state, "cli", at(0).toISOString());
        raiseItem(state, VISUAL, at(0));
        /** @type {any[]} */
        const sent = [];
        /** @type {any[]} */
        const ledger = [];
        const notifier = { send: (/** @type {any} */ p) => sent.push(p) > 0 };
        const poll = (/** @type {number} */ ms) =>
            ownerItemsPoll({
                api,
                repo: REPO,
                state,
                notifier,
                acting: true,
                login: LOGIN,
                now: at(ms),
                ledger: (e) => ledger.push(e),
            });
        expect((await poll(0)).pages).toHaveLength(1);
        comments[412].push({ user: { login: LOGIN }, created_at: "2099-01-01T00:00:00Z", body: "done" });
        expect(await poll(MIN)).toEqual({ ended: [VISUAL.id], pages: [] });
        expect(ledger).toEqual([{ kind: "owner-item", item: VISUAL.id, event: "ended", by: "comment" }]);
        expect(sent).toHaveLength(1);
        // without a client only the pages are planned
        raiseItem(state, GPU, at(2 * MIN));
        expect((await ownerItemsPoll({ state, notifier, acting: false, now: at(BATCH_MS) })).pages).toHaveLength(1);
    });
});
