#!/usr/bin/env node
/**
 * User acceptance test of the selection workspace (the `selection-workspace` feature): a pairwise matrix
 * of card kinds, verbs, starts, card shapes, entry points, datasets, edits and ways of leaving, plus named
 * scenarios for what the matrix cannot reach. It drives a served build with real clicks, drags and keys
 * and checks what a reader sees (the counts on the title bar and the cards, the table's rows and tints,
 * the drawing through graphty-element's public API, the layer or filter saved, the run list).
 *
 *   tools/with-browser.sh node graphty/acceptance/selection-workspace-uat.mjs --url <served url>
 *     --only <text,text>   only the scenarios whose id or description holds one of these
 *     --workers <n>        scenarios at once, each in its own browser context (default 3)
 *     --out <dir>          where a failed scenario's screenshot goes (default tmp/selection-workspace-uat)
 *     --list               print the matrix and run nothing
 *
 * What a selection should hold is worked out here from the graph and the runs' results, not read from
 * the editor: each step's own set, then the verbs folded in order (Add is a union, Keep an intersection,
 * Except a difference), then the cards unioned. Exit 0 when every scenario passed, 1 when one failed.
 * See README.md beside this file.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

const { values: args } = parseArgs({
    options: {
        url: { type: "string" },
        only: { type: "string" },
        workers: { type: "string", default: "3" },
        out: { type: "string", default: "tmp/selection-workspace-uat" },
        list: { type: "boolean", default: false },
    },
});

// How long a reader's view may take to reach what is expected: a hang guard, never a wait.
const SETTLE = 30_000;
const SAMPLES = { lesmis: "Les Miserables", karate: "Zachary's karate club", papers: "Paper citations" };
const NODES = { lesmis: ["Valjean", "Napoleon"], karate: ["1", "34"] };
const fail = (message) => {
    throw new Error(message);
};
const sample = (set, n = 6) => [...set].slice(0, n).join(",");

// Runs in the page: the session of the page's one element.
const inPage = (page, fn, arg) => page.evaluate(fn, arg);

// One visit to the app: its page, the graph's records, and the cards the reader has built so far.
class Visit {
    constructor(page, dataset, entry) {
        this.page = page;
        this.dataset = dataset;
        this.side = entry.endsWith("edges") ? "edge" : "node";
        this.host = entry.startsWith("filter") ? "filter" : "style";
        this.cards = [];
        this.errors = [];
        page.on("pageerror", (error) => this.errors.push(error.message));
    }

    get many() {
        return `${this.side}s`;
    }

    get ws() {
        return this.page.locator(".sel-ws.sel-modal");
    }

    card(at) {
        return this.ws.locator(".cm-card-list > .cm-list-card").nth(at);
    }

    step(at, index) {
        return this.card(at).locator(".sel-card-step[data-row]").nth(index);
    }

    async open(url = args.url) {
        // Paper citations is a timed sample, offered only with the timeline experiment on.
        const page = new URL(url);
        if (this.dataset === "papers") {
            page.searchParams.set("features", `${page.searchParams.get("features") ?? ""},timeline`);
        }
        await this.page.goto(page.href);
        await this.page.getByRole("button", { name: `Open the ${SAMPLES[this.dataset]} sample` }).click();
        await this.page.getByRole("button", { name: "Add a layer or a folder" }).waitFor();
        await this.page.waitForFunction(
            () => document.querySelector("graphty-element")?.session?.data.nodes().length > 0,
        );
        const graph = await inPage(this.page, () => {
            const s = document.querySelector("graphty-element").session;
            return { nodes: s.data.nodes().map((r) => ({ ...r })), edges: s.data.edges().map((r) => ({ ...r })) };
        });
        this.nodes = graph.nodes;
        this.edges = graph.edges;
        this.all = new Set((this.side === "node" ? graph.nodes : graph.edges).map((r) => String(r.id)));
        this.neighbors = new Map(graph.nodes.map((r) => [String(r.id), new Set()]));
        for (const e of graph.edges) {
            this.neighbors.get(String(e.source)).add(String(e.target));
            this.neighbors.get(String(e.target)).add(String(e.source));
        }
    }

    // Opens the workspace from this visit's entry point.
    async enter() {
        this.saved = await this.held();
        this.runsBefore = await this.runIds();
        if (this.host === "style") {
            if (this.layer === undefined) {
                await this.page.getByRole("button", { name: "Add a layer or a folder" }).click();
                await this.page.getByRole("menuitem", { name: "Layer", exact: true }).click();
                const name = this.page.getByRole("textbox", { name: "Layer name" });
                await name.waitFor();
                this.layer = await name.inputValue();
                await this.page.keyboard.press("Escape");
                this.saved = await this.held();
            }
            if (this.side === "edge") {
                await this.page.getByRole("tab", { name: /^Edge/ }).first().click();
            }
            await this.page.getByRole("button", { name: new RegExp(`^Edit Which ${this.many}`) }).click();
            await this.ws.waitFor();
        } else {
            await this.page.getByRole("button", { name: "Data", exact: true }).click();
            await this.page.getByRole("button", { name: "Add filter" }).click();
            await this.ws.waitFor();
            if (this.side === "edge") {
                await this.ws.locator("label", { hasText: "Edges" }).first().click();
            }
            this.filterOpening = true;
        }
        if (this.cards.length === 0) {
            this.cards.push(await this.newCard(0));
        }
    }

    async newCard(at) {
        const head = this.card(at);
        const start = await head.locator(".sel-card-start").getAttribute("data-start");
        const id = await head.getAttribute("data-card-id");
        return { id, start, steps: [], color: await this.colorOf(at) };
    }

    async colorOf(at) {
        return this.card(at).evaluate((c) => c.style.getPropertyValue("--cm-card-color").toUpperCase());
    }

    // What the session holds for this visit: the layer's selector or the filter conditions.
    held() {
        return inPage(
            this.page,
            ([host, layer]) => {
                const s = document.querySelector("graphty-element").session;
                const held =
                    host === "filter"
                        ? s.visibility.conditions
                        : s.styles
                              .list()
                              .filter((l) => l.name === layer)
                              .map((l) => l.selector);
                return JSON.stringify(held);
            },
            [this.host, this.layer],
        );
    }

    runIds() {
        return inPage(this.page, () =>
            document
                .querySelector("graphty-element")
                .session.runs.list()
                .filter((r) => r.status !== "removed")
                .map((r) => r.id),
        );
    }

    // Opens a value list and picks an entry; the list may already be open.
    async choose(name) {
        const option = this.page.getByRole("option", { name: new RegExp(`^${name}(,|$)`) }).first();
        await option.click();
    }

    async pickFirst(at, name) {
        const box = this.card(at).getByRole("button", { name: "Value", exact: true });
        const listed = this.page.getByRole("option", { name: new RegExp(`^${name}(,|$)`) }).first();
        if (!(await listed.isVisible())) {
            await box.click();
        }
        await this.choose(name);
    }

    async unfold(at) {
        const expand = this.card(at).getByRole("button", { name: /^Expand / });
        if (await expand.isVisible()) {
            await expand.click();
        }
    }

    // Flips a card's All / No start.
    async flipStart(at) {
        await this.unfold(at);
        await this.card(at).locator(".sel-card-start").click();
        this.cards[at].start = this.cards[at].start === "all" ? "none" : "all";
    }

    // Gives a card its first step, or a new card to hold it.
    async addCard(kind, params = {}) {
        const at = this.cards.length;
        await this.ws.locator("[data-or]").click();
        await this.choose(kind.label(this));
        await this.card(at).waitFor();
        const card = await this.newCard(at);
        this.cards.push(card);
        return this.fillStep(at, kind, this.natural(card), params);
    }

    natural(card) {
        return card.start === "all" ? "keep" : "add";
    }

    async firstStep(kind, params = {}, at = 0) {
        await this.pickFirst(at, kind.label(this));
        return this.fillStep(at, kind, this.natural(this.cards[at]), params);
    }

    async addStep(at, verb, kind, params = {}) {
        await this.unfold(at);
        await this.card(at).locator(`[data-verb="${verb}"]`).click();
        await this.pickFirst(at, kind.label(this));
        return this.fillStep(at, kind, verb, params);
    }

    async fillStep(at, kind, op, params) {
        const index = this.cards[at].steps.length;
        const step = { kind, op, params: { ...params } };
        this.cards[at].steps.push(step);
        await this.step(at, index).waitFor();
        await kind.fill(this, this.step(at, index), step);
        await this.check(`after ${op} ${kind.name}`);
        return step;
    }

    // The latest finished run of an algorithm with these settings, as `{ id: value }` for one field.
    async runValues(algorithm, field, params = {}) {
        const handle = await this.page.waitForFunction(
            ([algorithm, field, params, side]) => {
                const s = document.querySelector("graphty-element").session;
                const run = s.runs
                    .list()
                    .findLast(
                        (r) =>
                            r.algorithm === algorithm &&
                            r.status === "succeeded" &&
                            Object.entries(params).every(([k, v]) => r.params[k] === v),
                    );
                if (run?.result === undefined) {
                    return false;
                }
                const read = (id) => run.result[side](id)?.[field] ?? null;
                const records = side === "node" ? s.data.nodes() : s.data.edges();
                return Object.fromEntries(records.map((r) => [String(r.id), read(r.id)]));
            },
            [algorithm, field, params, this.side],
            { timeout: SETTLE },
        );
        return handle.jsonValue();
    }

    // What a card holds: its steps' sets folded in order from its start.
    async foldCard(card) {
        let held = card.start === "all" ? new Set(this.all) : new Set();
        for (const step of card.steps) {
            const leaf = await step.kind.leaf(this, step);
            if (step.op === "add") {
                held = new Set([...held, ...leaf]);
            } else if (step.op === "keep") {
                held = new Set([...held].filter((id) => leaf.has(id)));
            } else {
                held = new Set([...held].filter((id) => !leaf.has(id)));
            }
        }
        return held;
    }

    // Each card's set and their union.
    async expected() {
        const cards = [];
        for (const card of this.cards) {
            cards.push({ card, held: await this.foldCard(card) });
        }
        return { cards, total: new Set(cards.flatMap((each) => [...each.held])) };
    }

    // The title bar's count and each card's own, as the reader sees them.
    shown() {
        return this.ws.evaluate((box) => ({
            title: box.querySelector(":scope .sel-ws-head > .sel-count")?.textContent ?? "",
            cards: [...box.querySelectorAll(".cm-card-list > .cm-list-card")].map(
                (c) => c.querySelector(".cm-card-head .sel-count")?.textContent ?? "(waits)",
            ),
            rows: Number(box.querySelector("[role=grid]")?.getAttribute("aria-rowcount") ?? 1) - 1,
        }));
    }

    // Waits until the screen says what the model expects, and says so if it never does.
    async check(when) {
        const { cards, total } = await this.expected();
        const of = this.all.size;
        const want = {
            title: `${total.size} of ${of}`,
            cards: cards.map((each) => `${each.held.size} of ${of}`),
            rows: total.size,
        };
        const handle = await this.page
            .waitForFunction(
                (w) => {
                    const box = document.querySelector(".sel-ws.sel-modal");
                    const seen = [...box.querySelectorAll(".cm-card-list > .cm-list-card")].map(
                        (c) => c.querySelector(".cm-card-head .sel-count")?.textContent ?? "",
                    );
                    const grid = box.querySelector("[role=grid]");
                    return (
                        box.querySelector(".sel-ws-head > .sel-count")?.textContent === w.title &&
                        JSON.stringify(seen) === JSON.stringify(w.cards) &&
                        (w.rows === 0 ? grid === null : Number(grid?.getAttribute("aria-rowcount")) - 1 === w.rows)
                    );
                },
                want,
                { timeout: SETTLE },
            )
            .catch(() => null);
        if (handle === null) {
            const seen = await this.shown();
            fail(`${when}: expected ${JSON.stringify(want)}, screen says ${JSON.stringify(seen)}`);
        }
        await this.checkRows(when, cards, total);
        await this.checkDrawing(when, cards);
    }

    // The rows drawn are all in the selection, in the first holding card's color.
    async checkRows(when, cards, total) {
        if (this.side !== "node" || total.size === 0) {
            return;
        }
        const colorOf = (id) => cards.find((each) => each.held.has(id))?.card.color;
        const want = Object.fromEntries([...total].map((id) => [id, colorOf(id)]));
        const handle = await this.page
            .waitForFunction(
                (w) => {
                    const rows = [...document.querySelectorAll(".sel-ws [data-testid=data-table-row]")];
                    return (
                        rows.length > 0 &&
                        rows.every((row) => {
                            const id = row.querySelector("[role=gridcell],[role=rowheader]")?.textContent ?? "";
                            return w[id] === row.style.getPropertyValue("--cm-dt-row-color").toUpperCase();
                        })
                    );
                },
                want,
                { timeout: SETTLE },
            )
            .catch(() => null);
        if (handle === null) {
            const seen = await this.ws.evaluate(
                (box, w) =>
                    [...box.querySelectorAll("[data-testid=data-table-row]")]
                        .map((row) => ({
                            id: row.querySelector("[role=gridcell],[role=rowheader]")?.textContent ?? "",
                            color: row.style.getPropertyValue("--cm-dt-row-color").toUpperCase(),
                        }))
                        .filter((row) => w[row.id] !== row.color)
                        .map((row) => `${row.id} is ${row.color} and should be ${String(w[row.id])}`),
                want,
            );
            fail(`${when}: a table row is not in the selection or has the wrong tint: ${seen.join("; ")}`);
        }
    }

    // While Card colors is on, the drawing paints each member in its card's color and no one else.
    async checkDrawing(when, cards) {
        if (this.side !== "node" || this.styledPreview === true) {
            return;
        }
        const want = {};
        for (const id of this.all) {
            want[id] = cards.find((each) => each.held.has(id))?.card.color ?? null;
        }
        const colors = cards.map((each) => each.card.color);
        const handle = await this.page
            .waitForFunction(
                ([w, colors]) => {
                    const s = document.querySelector("graphty-element").session;
                    return s.data.nodes().every((r) => {
                        const hex = s.styles.explain({ node: r.id }).merged["node.color"]?.hex?.toUpperCase();
                        const expected = w[String(r.id)];
                        return expected === null ? !colors.includes(hex) : hex === expected;
                    });
                },
                [want, colors],
                { timeout: SETTLE },
            )
            .catch(() => null);
        if (handle === null) {
            const drawn = await inPage(this.page, () => {
                const s = document.querySelector("graphty-element").session;
                return s.data
                    .nodes()
                    .slice(0, 5)
                    .map((r) => `${String(r.id)}=${s.styles.explain({ node: r.id }).merged["node.color"]?.hex}`);
            });
            fail(
                `${when}: the drawing does not show the cards' colors: ${drawn.join(" ")}; want ${JSON.stringify(want).slice(0, 120)}`,
            );
        }
    }

    // Leaves with Done and checks what was saved.
    async done() {
        const { total } = await this.expected();
        const inert = this.cards.every((card) => card.steps.every((step) => step.params.groups?.length === 0));
        await this.ws.getByRole("button", { name: "Done", exact: true }).click();
        await this.ws.waitFor({ state: "detached" });
        if (this.host === "filter") {
            await this.page
                .waitForFunction(
                    ([side, n]) => {
                        const v = document.querySelector("graphty-element").session.visibility;
                        return (side === "node" ? v.nodes.size : v.edges.size) === n;
                    },
                    // A filter with nothing picked yet filters nothing (graphty-element's inert condition).
                    [this.side, inert ? this.all.size : total.size],
                    { timeout: SETTLE },
                )
                .catch(async () => {
                    const seen = await inPage(this.page, () => {
                        const v = document.querySelector("graphty-element").session.visibility;
                        return `${String(v.nodes.size)} nodes, ${String(v.edges.size)} edges, ${String(v.conditions.length)} conditions`;
                    });
                    fail(`Done: expected ${String(total.size)} ${this.many} visible, session holds ${seen}`);
                });
            // Filters live in the Data place's Sources tab, under Data sources.
            await this.page.getByRole("tab", { name: "Sources", exact: true }).click();
            await this.page.getByRole("list", { name: "Filters" }).getByRole("listitem").first().waitFor();
        } else {
            const handle = await this.page
                .waitForFunction(
                    ([layer, side, n]) => {
                        const s = document.querySelector("graphty-element").session;
                        const where = s.styles.list().find((l) => l.name === layer && l.selector.where?.side === side)
                            ?.selector.where;
                        if (where === undefined) {
                            return false;
                        }
                        const watch = s.scope.watchSteps(where, () => undefined);
                        const { total, pending } = watch.current;
                        watch.end();
                        return pending.length === 0 && total.count === n;
                    },
                    [this.layer, this.many, total.size],
                    { timeout: SETTLE },
                )
                .catch(() => null);
            if (handle === null) {
                fail(
                    `Done: the layer does not hold ${String(total.size)} ${this.many}: ${(await this.held()).slice(0, 400)}`,
                );
            }
        }
        await this.checkRunsAfterDone();
    }

    // Done keeps the runs the final cards read, as ordinary results in Data > Calculated.
    async checkRunsAfterDone() {
        const read = new Set(
            this.cards.flatMap((c) =>
                c.steps.flatMap((s) => (s.kind.algorithm === undefined ? [] : [s.kind.algorithm])),
            ),
        );
        if (read.size === 0) {
            return;
        }
        const runs = await inPage(this.page, () =>
            document
                .querySelector("graphty-element")
                .session.runs.list()
                .filter((r) => r.status !== "removed")
                .map((r) => r.algorithm),
        );
        const missing = [...read].filter((algorithm) => !runs.includes(algorithm));
        if (missing.length > 0) {
            fail(`Done: runs ${missing.join(",")} are gone; session holds ${runs.join(",")}`);
        }
        await this.page.getByRole("button", { name: "Data", exact: true }).click();
        await this.page.getByRole("tab", { name: "Calculated" }).click();
        const rows = this.page.getByRole("list", { name: "Results" }).getByRole("listitem");
        await rows.first().waitFor();
        if ((await rows.count()) !== runs.length) {
            fail(`Done: Data > Calculated lists ${String(await rows.count())} rows for ${String(runs.length)} runs`);
        }
    }

    // Leaves with Cancel or Escape and checks nothing stayed.
    async cancel(how) {
        if (how === "escape") {
            await this.ws.locator(".sel-ws-head").click({ position: { x: 300, y: 8 } });
            await this.page.keyboard.press("Escape");
        } else {
            await this.ws.getByRole("button", { name: /^Cancel/ }).click();
        }
        await this.ws.waitFor({ state: "detached" });
        // A layer that selected everything reads the same as one card with All and no step.
        const plain = (held) =>
            held.replaceAll(
                /\{"match":"rule","where":\{"kind":"union","side":"\w+","within":"\w+","branches":\[\{"start":"all","steps":\[\],"id":"\w+","color":"#\w+"\}\]\}\}/g,
                '{"match":"everything"}',
            );
        const now = await this.held();
        if (plain(now) !== plain(this.saved)) {
            fail(`${how}: what was saved changed: ${now.slice(0, 300)} (was ${this.saved.slice(0, 300)})`);
        }
        const before = JSON.stringify(this.runsBefore);
        const handle = await this.page
            .waitForFunction(
                (want) =>
                    JSON.stringify(
                        document
                            .querySelector("graphty-element")
                            .session.runs.list()
                            .filter((r) => r.status !== "removed")
                            .map((r) => r.id),
                    ) === want,
                before,
                { timeout: SETTLE },
            )
            .catch(() => null);
        if (handle === null) {
            fail(`${how}: the visit's runs stayed: ${(await this.runIds()).join(",")} (was ${before})`);
        }
    }

    async leave(how) {
        await (how === "done" ? this.done() : this.cancel(how));
    }

    // Types into a number or text box the way a reader does.
    async type(box, text) {
        await box.click();
        await this.page.keyboard.press("ControlOrMeta+a");
        await this.page.keyboard.type(text);
        await this.page.keyboard.press("Tab");
    }

    // Picks a node into a reference box by search.
    async reference(step, name, node) {
        await step.getByRole("button", { name, exact: true }).click();
        await this.page.locator('input[placeholder="Find a node, a set"]:visible').fill(node);
        await this.page.getByRole("option", { name: node, exact: true }).first().click();
    }

    // Opens a card step's settings and sets one option.
    async setting(step, label, value) {
        await step.getByRole("button", { name: /^Settings for / }).click();
        const box = this.page.locator("[data-portal]").getByLabel(label, { exact: true }).first();
        await this.type(box, value);
        await this.closeSettings();
    }

    async closeSettings() {
        await this.page.mouse.click(1000, 300);
        await this.page.locator("[data-portal] [data-testid=panel-field]").first().waitFor({ state: "hidden" });
    }

    // Drags a thumb by real pointer to an x, past the track's end when asked.
    async drag(handle, x) {
        const box = await handle.boundingBox();
        await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await this.page.mouse.down();
        await this.page.mouse.move(x, box.y + box.height / 2, { steps: 8 });
        await this.page.mouse.up();
    }
}

// ------------------------------------------------------------------------------------------------
// Card kinds: how a reader fills one, and the set it should hold, worked out without the editor.
// ------------------------------------------------------------------------------------------------

// A number card: its "from" box set near the 60th percentile of the run's values.
const rank = (name, algorithm, field) => ({
    name,
    algorithm,
    label: () => name,
    async fill(v, step, s) {
        const values = Object.values(await v.runValues(algorithm, field))
            .filter((x) => x !== null)
            .sort((a, b) => a - b);
        s.params.from = Number(values[Math.floor(values.length * 0.6)].toFixed(3));
        await v.type(step.getByRole("textbox", { name: `${name} from, number` }), String(s.params.from));
    },
    async leaf(v, s) {
        const values = await v.runValues(algorithm, field);
        return new Set(Object.keys(values).filter((id) => values[id] !== null && values[id] >= s.params.from));
    },
});

// A community card: the settings first when the step asks, then Group 1 and Group 3 ticked.
const community = (name, algorithm) => ({
    name,
    algorithm,
    label: () => name,
    async fill(v, step, s) {
        for (const [label, value] of Object.entries(s.params.settings ?? {})) {
            await v.setting(step, label, value);
        }
        s.params.groups = [];
        for (const group of s.params.pick ?? [1, 3]) {
            await step.getByRole("checkbox", { name: new RegExp(`^Group ${String(group)},`) }).click();
            s.params.groups.push(group);
        }
    },
    async leaf(v, s) {
        const values = await v.runValues(algorithm, "group", s.params.run ?? {});
        // "Group 1" is the largest community, and ties go by the community's number.
        const sizes = new Map();
        Object.values(values).forEach((group) => sizes.set(group, (sizes.get(group) ?? 0) + 1));
        const ranked = [...sizes.keys()].sort((a, b) => sizes.get(b) - sizes.get(a) || a - b);
        return new Set(Object.keys(values).filter((id) => s.params.groups.includes(ranked.indexOf(values[id]) + 1)));
    },
});

const within = (v, from, hops) => {
    const seen = new Set([from]);
    let edge = [from];
    for (let at = 0; at < hops; at++) {
        edge = edge.flatMap((id) => [...v.neighbors.get(id)].filter((n) => !seen.has(n)));
        edge.forEach((id) => seen.add(id));
    }
    return seen;
};

const KINDS = {
    data: {
        name: "data text",
        label: (v) => (v.dataset === "lesmis" ? "name" : "Node id"),
        async fill(v, step) {
            const name = this.label(v);
            await v.type(
                step.getByRole("combobox", { name: `${name}: text to match` }),
                v.dataset === "lesmis" ? "e" : "1",
            );
        },
        leaf: (v) =>
            new Set(
                v.nodes
                    .filter((r) => (v.dataset === "lesmis" ? /e/i.test(r.name) : String(r.id).includes("1")))
                    .map((r) => String(r.id)),
            ),
    },
    betweenness: rank("Betweenness", "betweenness", "value"),
    pagerank: rank("PageRank", "pagerank", "value"),
    degree: {
        name: "Degree",
        label: () => "Degree",
        async fill(v, step, s) {
            const values = [...v.neighbors.values()].map((set) => set.size).sort((a, b) => a - b);
            s.params.from = values[Math.floor(values.length * 0.6)];
            await v.type(step.getByRole("textbox", { name: "Degree from, number" }), String(s.params.from));
        },
        leaf: (v, s) => new Set([...v.neighbors].filter(([, set]) => set.size >= s.params.from).map(([id]) => id)),
    },
    louvain: community("Louvain", "louvain"),
    leiden: community("Leiden", "leiden"),
    path: {
        name: "Shortest path",
        algorithm: "shortest-path",
        label: () => "Shortest path",
        async fill(v, step) {
            const [from, to] = NODES[v.dataset];
            await v.reference(step, "From", from);
            await v.reference(step, "To", to);
            await step.getByRole("combobox", { name: "On the route is" }).click();
            await v.page.getByRole("option", { name: /^(Yes|true)$/i }).click();
        },
        async leaf(v) {
            const values = await v.runValues(this.algorithm, "onPath");
            const route = new Set(Object.keys(values).filter((id) => values[id] === true));
            const [from, to] = NODES[v.dataset];
            let hops = 0;
            while (!within(v, from, hops).has(to)) {
                hops++;
            }
            if (route.size !== hops + 1 || !route.has(from) || !route.has(to)) {
                fail(`the route holds ${sample(route, 12)}; a shortest route has ${String(hops + 1)} nodes`);
            }
            return route;
        },
    },
    hops: {
        name: "within 2 hops",
        label: () => "Within hops of",
        fill: (v, step) => v.reference(step, "Reference", NODES[v.dataset][0]),
        leaf: (v) => within(v, NODES[v.dataset][0], 2),
    },
    touching: {
        name: "connected to",
        label: () => "Connected to",
        fill: (v, step) => v.reference(step, "Reference", NODES[v.dataset][1]),
        leaf: (v) => within(v, NODES[v.dataset][1], v.all.size),
    },
    reference: {
        name: "is in",
        label: () => "Is in",
        fill: (v, step) => v.reference(step, "Reference", NODES[v.dataset][1]),
        leaf: (v) => new Set([NODES[v.dataset][1]]),
    },
};

// An edge's ends, as ids.
const ends = (edge) => [String(edge.source), String(edge.target)];
const edgeIds = (v, test) => new Set(v.edges.filter(test).map((edge) => String(edge.id)));

const EDGE_KINDS = {
    data: {
        name: "shared_chapters",
        label: () => "shared_chapters",
        async fill(v, step) {
            await v.type(step.getByRole("textbox", { name: "shared_chapters from, number" }), "3");
        },
        leaf: (v) => edgeIds(v, (edge) => edge.shared_chapters >= 3),
    },
    betweenness: rank("Edge betweenness", "edge-betweenness", "value"),
    touching: {
        name: "edges touching",
        label: () => "Edges touching",
        fill: (v, step) => v.reference(step, "Reference", NODES[v.dataset][0]),
        leaf: (v) => edgeIds(v, (edge) => ends(edge).includes(NODES[v.dataset][0])),
    },
    within: {
        name: "edges within",
        label: () => "Edges within",
        fill: (v, step) => v.reference(step, "Reference", NODES[v.dataset][0]),
        leaf: (v) => edgeIds(v, (edge) => ends(edge).every((end) => end === NODES[v.dataset][0])),
    },
};

// ------------------------------------------------------------------------------------------------
// Edits a reader makes once the cards are built.
// ------------------------------------------------------------------------------------------------

const LONG_TITLE = "Characters who meet Valjean in the first volume of the novel";

// Nothing in a card's head overlaps, and the head stays inside the card.
async function checkHeads(v, when) {
    const clash = await v.ws.evaluate((box) => {
        const out = [];
        for (const card of box.querySelectorAll(".cm-card-list > .cm-list-card")) {
            const edge = card.getBoundingClientRect();
            const parts = [...card.querySelector(".cm-card-head").children]
                .flatMap((each) => (each.classList.contains("cm-card-slot") ? [...each.children] : [each]))
                .filter((each) => each.getBoundingClientRect().width > 0);
            parts.forEach((part, at) => {
                const r = part.getBoundingClientRect();
                const next = parts[at + 1]?.getBoundingClientRect();
                if (r.right > edge.right + 0.5 || (next !== undefined && r.right > next.left + 0.5)) {
                    out.push(
                        `${part.className || part.tagName} ends at ${String(r.right)}, next ${String(next?.left)}`,
                    );
                }
            });
        }
        return out;
    });
    if (clash.length > 0) {
        fail(`${when}: a card head overlaps: ${clash.join("; ")}`);
    }
}

const rename = async (v, at, title) => {
    await v.unfold(at);
    await v.card(at).locator(".cm-card-name").click();
    await v.page.keyboard.press("ControlOrMeta+a");
    await v.page.keyboard.type(title);
    await v.page.keyboard.press("Enter");
    await v.card(at).locator(".cm-card-title", { hasText: title }).waitFor();
    await checkHeads(v, `rename to ${title.slice(0, 12)}`);
    await v.check("rename");
};

const order = (v) => v.ws.locator(".cm-card-list > .cm-list-card").evaluateAll((cs) => cs.map((c) => c.dataset.cardId));

const assertOrder = async (v, when) => {
    const want = v.cards.map((c) => c.id);
    const seen = await order(v);
    if (JSON.stringify(seen) !== JSON.stringify(want)) {
        fail(`${when}: cards are in the order ${seen.join(",")}, expected ${want.join(",")}`);
    }
};

const EDITS = {
    none: async () => undefined,
    rename: (v) => rename(v, v.cards.length - 1, "Hi"),
    longTitle: (v) => rename(v, 0, LONG_TITLE),
    collapse: async (v) => {
        const at = v.cards.length - 1;
        await v.unfold(at);
        await v
            .card(at)
            .getByRole("button", { name: /^Collapse / })
            .click();
        await v.card(at).locator(".cm-card-body").waitFor({ state: "detached" });
        const words = await v.card(at).locator(".sel-card-summary").innerText();
        if (words.trim() === "") {
            fail("collapse: a folded card says nothing about what it holds");
        }
        await v.check("collapse");
        await v
            .card(at)
            .getByRole("button", { name: /^Expand / })
            .click();
        await v.card(at).locator(".cm-card-body").waitFor();
        await v.check("expand");
    },
    drag: async (v) => {
        if (v.cards.length < 2) {
            return;
        }
        const last = v.cards.length - 1;
        const grip = v.card(last).locator(".cm-card-grip");
        const top = await v.card(0).boundingBox();
        await v.drag2(grip, top.y - 6);
        v.cards.unshift(v.cards.pop());
        await v.page.waitForFunction(
            (want) =>
                JSON.stringify(
                    [...document.querySelectorAll(".sel-ws .cm-card-list > .cm-list-card")].map(
                        (c) => c.dataset.cardId,
                    ),
                ) === want,
            JSON.stringify(v.cards.map((c) => c.id)),
            { timeout: SETTLE },
        );
        await v.check("drag");
    },
    deleteAdd: async (v) => {
        if (v.cards.length < 2) {
            return;
        }
        await v.card(0).locator("[data-card-remove]").click();
        v.cards.shift();
        await v.check("delete");
        await v.addCard(KINDS.reference);
        await assertOrder(v, "add after delete");
    },
    flipStart: async (v) => {
        await v.flipStart(v.cards.length - 1);
        await v.check("flip start");
    },
    styled: async (v) => {
        await v.ws.locator("label", { hasText: "Styled" }).click();
        v.styledPreview = true;
        await v.page.waitForFunction(() => document.querySelector(".sel-ws [data-row-color]") === null);
        const shown = await v.shown();
        const { total } = await v.expected();
        if (shown.title !== `${String(total.size)} of ${String(v.all.size)}`) {
            fail(`styled: the count changed to ${shown.title}`);
        }
        await v.ws.locator("label", { hasText: "Card colors" }).click();
        v.styledPreview = false;
        await v.check("back to card colors");
    },
};

Visit.prototype.drag2 = async function drag2(grip, y) {
    const box = await grip.boundingBox();
    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(box.x + box.width / 2, y, { steps: 10 });
    await this.page.mouse.up();
};

// ------------------------------------------------------------------------------------------------
// The matrix: every pair of factor values in at least one row.
// ------------------------------------------------------------------------------------------------

// A small seeded generator, so a run's matrix is the same every time.
function seeded(seed) {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

// Rows covering every pair of values of the factors, given as `{ name: values }`.
function pairwise(factors) {
    const random = seeded(7);
    const names = Object.keys(factors);
    const key = (a, x, b, y) => (a < b ? `${a}=${x}&${b}=${y}` : `${b}=${y}&${a}=${x}`);
    const open = new Set();
    names.forEach((a, i) => {
        for (const b of names.slice(i + 1)) {
            factors[a].forEach((x) => factors[b].forEach((y) => open.add(key(a, x, b, y))));
        }
    });
    const gain = (row, name, value) =>
        Object.entries(row).filter(([other, x]) => open.has(key(name, value, other, x))).length;
    const rows = [];
    while (open.size > 0) {
        let best = null;
        let bestScore = -1;
        for (let attempt = 0; attempt < 40; attempt++) {
            const row = {};
            const first = [...open][Math.floor(random() * open.size)].split("&").map((each) => each.split("="));
            first.forEach(([name, value]) => (row[name] = value));
            let score = 1;
            for (const name of [...names].sort(() => random() - 0.5)) {
                if (row[name] === undefined) {
                    const value = [...factors[name]].sort(
                        (a, b) => gain(row, name, b) - gain(row, name, a) || random() - 0.5,
                    )[0];
                    score += gain(row, name, value);
                    row[name] = value;
                }
            }
            if (score > bestScore) {
                best = row;
                bestScore = score;
            }
        }
        const picked = Object.entries(best);
        picked.forEach(([a, x], i) => picked.slice(i + 1).forEach(([b, y]) => open.delete(key(a, x, b, y))));
        rows.push(best);
    }
    return rows;
}

const MATRIX = pairwise({
    k1: ["data", "betweenness", "pagerank", "degree", "louvain", "leiden", "path", "hops", "touching", "reference"],
    k2: ["data", "pagerank", "louvain", "hops", "touching", "reference"],
    entry: ["style-nodes", "filter-nodes"],
    dataset: ["lesmis", "karate"],
    start: ["none", "all"],
    shape: ["1card-2steps", "1card-3steps", "2cards", "3cards", "2cards-narrowed"],
    verb: ["add", "keep", "except"],
    verb2: ["add", "keep", "except"],
    edit: Object.keys(EDITS),
    leave: ["done", "cancel", "escape"],
});

const EDGE_MATRIX = pairwise({
    k1: ["data", "betweenness", "touching", "within"],
    k2: ["data", "betweenness", "touching"],
    entry: ["style-edges", "filter-edges"],
    dataset: ["lesmis", "karate"],
    start: ["none", "all"],
    shape: ["1card-2steps", "2cards", "2cards-narrowed"],
    verb: ["add", "keep", "except"],
    edit: ["none", "rename", "collapse", "drag", "flipStart"],
    leave: ["done", "cancel", "escape"],
});

// Walks one edge row: Karate Club's edges have no column, so its data card is Edge betweenness.
async function walkEdgeRow(page, row) {
    const v = new Visit(page, row.dataset, row.entry);
    await v.open();
    await v.enter();
    if (row.start !== v.cards[0].start) {
        await v.flipStart(0);
        await v.check("the start of an empty card");
    }
    const kind = (name) => EDGE_KINDS[name === "data" && row.dataset === "karate" ? "betweenness" : name];
    await v.firstStep(kind(row.k1));
    if (row.shape === "1card-2steps") {
        await v.addStep(0, row.verb, kind(row.k2));
    } else {
        await v.addCard(kind(row.k2));
    }
    if (row.shape === "2cards-narrowed") {
        await v.addStep(1, row.verb, EDGE_KINDS.touching);
    }
    await EDITS[row.edit](v);
    await v.leave(row.leave);
    if (v.errors.length > 0) {
        fail(`page errors: ${v.errors.join("; ")}`);
    }
}

// Walks one matrix row.
async function walkRow(page, row) {
    const v = new Visit(page, row.dataset, row.entry);
    await v.open();
    await v.enter();
    if (row.start !== v.cards[0].start) {
        await v.flipStart(0);
        await v.check("the start of an empty card");
    }
    const third = row.k1 === "reference" ? KINDS.touching : KINDS.reference;
    await v.firstStep(KINDS[row.k1]);
    if (row.shape === "1card-2steps" || row.shape === "1card-3steps") {
        await v.addStep(0, row.verb, KINDS[row.k2]);
    } else {
        await v.addCard(KINDS[row.k2]);
    }
    if (row.shape === "1card-3steps") {
        await v.addStep(0, row.verb2, third);
    } else if (row.shape === "3cards") {
        await v.addCard(third);
        await v.addStep(2, row.verb, KINDS.hops);
    } else if (row.shape === "2cards-narrowed") {
        await v.addStep(1, row.verb, third);
    }
    await EDITS[row.edit](v);
    await v.leave(row.leave);
    if (v.errors.length > 0) {
        fail(`page errors: ${v.errors.join("; ")}`);
    }
    if (row.leave === "done" && row.entry === "style-nodes") {
        await reopenSame(v);
    }
}

// A layer saved by Done opens again as the same cards with the same counts.
async function reopenSame(v) {
    await v.page.getByRole("button", { name: "Graph", exact: true }).click();
    await v.page.getByRole("button", { name: /^Edit Which nodes/ }).click();
    await v.ws.waitFor();
    await v.check("reopen");
    await assertOrder(v, "reopen");
    await v.ws.getByRole("button", { name: /^Cancel/ }).click();
    await v.ws.waitFor({ state: "detached" });
}

// ------------------------------------------------------------------------------------------------
// Named scenarios.
// ------------------------------------------------------------------------------------------------

const visit = async (page, dataset, entry) => {
    const v = new Visit(page, dataset, entry);
    await v.open();
    await v.enter();
    return v;
};

// A slider dragged past both ends reaches them exactly; the last node can be picked alone.
const sliderEnds = (dataset, entry, kind, algorithm) => async (page) => {
    const v = await visit(page, dataset, entry);
    await v.pickFirst(0, kind);
    const start = v.card(0).getByRole("slider", { name: `${kind} range start` });
    const end = v.card(0).getByRole("slider", { name: `${kind} range end` });
    await start.waitFor();
    const track = await v
        .card(0)
        .getByRole("slider", { name: `${kind} range`, exact: true })
        .boundingBox();
    const now = async (thumb) => Number(await thumb.getAttribute("aria-valuenow"));
    const says = (want) =>
        v.page.waitForFunction((n) => document.querySelector(".sel-ws-head > .sel-count").textContent === n, want, {
            timeout: SETTLE,
        });
    const whole = `${String(v.all.size)} of ${String(v.all.size)}`;
    const leaves = () =>
        v.page.waitForFunction((n) => document.querySelector(".sel-ws-head > .sel-count").textContent !== n, whole, {
            timeout: SETTLE,
        });
    await v.drag(end, track.x + track.width / 2);
    await leaves();
    await v.drag(end, track.x + track.width + 200);
    await says(whole);
    if ((await now(end)) !== Number(await end.getAttribute("aria-valuemax"))) {
        fail(
            `end thumb stops at ${String(await now(end))}, the scale ends at ${String(await end.getAttribute("aria-valuemax"))}`,
        );
    }
    await v.drag(start, track.x + track.width / 2);
    await leaves();
    await v.drag(start, track.x - 200);
    await says(whole);
    if ((await now(start)) !== Number(await start.getAttribute("aria-valuemin"))) {
        fail(
            `start thumb stops at ${String(await now(start))}, the scale starts at ${String(await start.getAttribute("aria-valuemin"))}`,
        );
    }
    await v.drag(start, track.x + track.width + 200);
    await leaves();
    const values = await valuesOf(v, algorithm);
    const top = values.filter((each) => each === Math.max(...values)).length;
    await says(`${String(top)} of ${String(v.all.size)}`).catch(async () =>
        fail(
            `the start thumb at the far end leaves ${(await v.shown()).title}; the highest value is on ${String(top)}`,
        ),
    );
};

const valuesOf = async (v, algorithm) =>
    algorithm === "degree"
        ? [...v.neighbors.values()].map((set) => set.size)
        : Object.values(await v.runValues(algorithm, "value"));

// Which groups the card shows ticked, by number.
const tickedGroups = (box) =>
    box.evaluate((step) =>
        [...step.querySelectorAll("input[type=checkbox]:checked")].flatMap((each) => {
            const found = /^Group (\d+),/u.exec(each.getAttribute("aria-label") ?? "");
            return found === null ? [] : [Number(found[1])];
        }),
    );

// The best-connected node of a community, as a run's values and the graph's edges say.
const hubOf = (v, values, group) => {
    const sizes = new Map();
    Object.values(values).forEach((each) => sizes.set(each, (sizes.get(each) ?? 0) + 1));
    const ranked = [...sizes.keys()].sort((a, b) => sizes.get(b) - sizes.get(a) || a - b);
    const members = Object.keys(values).filter((id) => values[id] === ranked[group - 1]);
    return members.reduce((a, b) => (v.neighbors.get(b).size > v.neighbors.get(a).size ? b : a));
};

// A setting changed, then groups ticked and unticked: a tick follows its group's best-connected
// node into the new run, the counts follow every tick, and the last tick off holds nothing.
const retune = (dataset, entry, kind, settings, run) => async (page) => {
    const v = await visit(page, dataset, entry);
    if (v.cards[0].start !== "none") {
        await v.flipStart(0);
    }
    const step = await v.firstStep(kind, { pick: [1] });
    const box = v.step(0, 0);
    const hub = hubOf(v, await v.runValues(kind.algorithm, "group"), 1);
    for (const [label, value] of Object.entries(settings)) {
        await v.setting(box, label, value);
    }
    step.params.run = run;
    const values = await v.runValues(kind.algorithm, "group", run);
    // The tick is on the group that now holds the old group's best-connected node.
    await v.page
        .waitForFunction(
            () => document.querySelectorAll(".sel-ws .cm-card-list input[type=checkbox]:checked").length === 1,
            null,
            { timeout: SETTLE },
        )
        .catch(() => fail("the old group's tick did not follow it into the new run"));
    [step.params.groups[0]] = await tickedGroups(box);
    const held = await kind.leaf(v, step);
    if (!held.has(hub) || values[hub] === undefined) {
        fail(`the tick is on group ${String(step.params.groups[0])}, which does not hold ${hub}`);
    }
    await v.check("after the setting");
    const ticks = await box.getByRole("checkbox").count();
    const moves = [1, 2, 1, Math.min(3, ticks), 2];
    for (const group of moves) {
        await box.getByRole("checkbox", { name: new RegExp(`^Group ${String(group)},`) }).click();
        const at = step.params.groups.indexOf(group);
        if (at === -1) {
            step.params.groups.push(group);
        } else {
            step.params.groups.splice(at, 1);
        }
        await v.check(`toggle group ${String(group)}`);
    }
    // Every tick off, one by one: nothing ticked selects nothing, as a fresh card does.
    for (const group of [...step.params.groups]) {
        await box.getByRole("checkbox", { name: new RegExp(`^Group ${String(group)},`) }).click();
        step.params.groups.splice(step.params.groups.indexOf(group), 1);
        await v.check(`untick group ${String(group)}`);
    }
    await box.getByRole("checkbox", { name: /^Group 1,/ }).click();
    step.params.groups.push(1);
    await v.check("tick again after none");
    await box.getByRole("checkbox", { name: /^Group 1,/ }).click();
    step.params.groups.length = 0;
    await v.check("none ticked again");
    await v.leave("done");
    const saved = await v.held();
    if (v.host === "style" && !saved.includes('"test":{"kind":"categories","values":[]')) {
        fail(`Done saved the unticked card without its empty test: ${saved.slice(0, 300)}`);
    }
};

// A card with nothing changed: the last tick off holds nothing, from either start, and Done saves that.
const untickToZero = (dataset, entry, kind, start) => async (page) => {
    const v = await visit(page, dataset, entry);
    if (v.cards[0].start !== start) {
        await v.flipStart(0);
    }
    const step = await v.firstStep(kind, { pick: [1] });
    await v
        .step(0, 0)
        .getByRole("checkbox", { name: /^Group 1,/ })
        .click();
    step.params.groups.length = 0;
    await v.check("the last tick off");
    await v.leave("done");
};

// Typing the end the slider's label shows takes that end, however the label rounds it.
const typedEnds = (dataset, kind, algorithm) => async (page) => {
    const v = await visit(page, dataset, "style-nodes");
    await v.pickFirst(0, kind);
    const card = v.step(0, 0);
    const from = card.getByRole("textbox", { name: `${kind} from, number` });
    await from.waitFor();
    const end = await card.getByRole("slider", { name: `${kind} range end` }).getAttribute("aria-valuemax");
    const maximum = await card.getByRole("textbox", { name: `${kind} to, number` }).getAttribute("placeholder");
    await v.type(from, maximum);
    const values = await valuesOf(v, algorithm);
    const top = values.filter((each) => each === Math.max(...values)).length;
    await v.page
        .waitForFunction(
            (n) => document.querySelector(".sel-ws-head > .sel-count").textContent === n,
            `${String(top)} of ${String(v.all.size)}`,
            { timeout: SETTLE },
        )
        .catch(async () =>
            fail(`typing ${String(maximum)} (the scale ends at ${String(end)}) leaves ${(await v.shown()).title}`),
        );
    if ((await card.locator("[role=alert]").count()) > 0) {
        fail(`typing the shown maximum was refused: ${await card.locator("[role=alert]").innerText()}`);
    }
    const lit = await card.locator('[data-testid="histogram-chart"] [data-highlighted="true"]').count();
    if (lit === 0) {
        fail("both thumbs on the last value light no bar");
    }
};

// Settings that give the same groups keep the same ticks.
const sameGroupsKeepTicks = async (page) => {
    const v = await visit(page, "karate", "style-nodes");
    const step = await v.firstStep(KINDS.louvain, { pick: [1, 3] });
    const box = v.step(0, 0);
    // Iterations past what Karate Club needs leave the communities as they were.
    await v.setting(box, "Max iterations", "150");
    step.params.run = { maxIterations: 150 };
    await v.page.waitForFunction(
        () => document.querySelectorAll(".sel-ws .cm-card-list input[type=checkbox]:checked").length === 2,
        null,
        { timeout: SETTLE },
    );
    const now = await tickedGroups(box);
    if (JSON.stringify([...now].sort()) !== JSON.stringify([1, 3])) {
        fail(`the same groups were ticked as ${now.join(",")}`);
    }
    await v.check("the same groups");
    await v.leave("done");
};

// A saved card reads as it did: its list stays largest first whatever is ticked.
const reopenOrder = async (page) => {
    const v = await visit(page, "lesmis", "style-nodes");
    await v.firstStep(KINDS.louvain, { pick: [2, 3] });
    const names = () =>
        v
            .step(0, 0)
            .getByRole("checkbox")
            .evaluateAll((all) => all.map((each) => each.getAttribute("aria-label").split(",")[0]));
    const before = await names();
    // A press on the drawing leaves focus there, as a reader's does.
    await v.page.mouse.click(520, 80);
    await v.leave("done");
    await v.page.getByRole("button", { name: "Graph", exact: true }).click();
    await v.page.getByRole("button", { name: /^Edit Which nodes/ }).click();
    await v.ws.waitFor();
    await v.unfold(0);
    await v.step(0, 0).getByRole("checkbox").first().waitFor();
    const after = await names();
    if (JSON.stringify(before) !== JSON.stringify(after)) {
        fail(`reopening moved the groups: ${after.join(",")} (was ${before.join(",")})`);
    }
    const ring = await v.page.evaluate(() => {
        const at = document.activeElement;
        return at?.closest("graphty-element, .ws-canvas-surface") === null ? null : (at?.tagName ?? null);
    });
    if (ring !== null) {
        fail(`opening left focus, and its ring, on the drawing (${String(ring)})`);
    }
    await v.ws.getByRole("button", { name: /^Cancel/ }).click();
};

// A workspace opened while the graph is still being framed leaves it framed.
const quickOpen = (how) => async (page) => {
    const v = await visit(page, "lesmis", "style-nodes");
    await v.pickFirst(0, "Degree");
    await v.step(0, 0).getByRole("textbox", { name: "Degree from, number" }).waitFor();
    await (how === "done"
        ? v.ws.getByRole("button", { name: "Done", exact: true }).click()
        : v.ws.getByRole("button", { name: /^Cancel/ }).click());
    await v.ws.waitFor({ state: "detached" });
    const zoomed = await inPage(page, async () => {
        const element = document.querySelector("graphty-element");
        await element.waitForSettled();
        await element.waitForPainted();
        const near = () => {
            const { position, target } = element.getCameraState();
            return Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z);
        };
        const left = near();
        element.zoomToFit();
        await element.waitForSettled();
        await element.waitForPainted();
        return left / near();
    });
    if (zoomed < 0.9) {
        fail(`the drawing was left over-zoomed: its camera stands at ${zoomed.toFixed(2)} of a fit's distance`);
    }
};

// The edge condition sits on the card, not in its settings, and the card keeps its checklist.
const edgesOnCard = async (page) => {
    const v = await visit(page, "lesmis", "style-nodes");
    await v.firstStep(KINDS.louvain, { pick: [1] });
    const box = v.step(0, 0);
    await box.getByRole("button", { name: /^Settings for / }).click();
    await v.page.locator("label", { hasText: "Edges where" }).first().click();
    const field = box.getByRole("button", { name: /^Edge value/ });
    await field.waitFor();
    if ((await v.page.locator("[data-popout-id]").count()) > 0) {
        fail("the settings stayed open over the edge condition");
    }
    await field.click();
    await v.page
        .getByRole("option", { name: /^shared_chapters/ })
        .first()
        .click();
    await box.getByRole("textbox", { name: "shared_chapters from, number" }).waitFor();
    await v.page.waitForFunction(
        () => document.querySelectorAll(".sel-ws .cm-card-list input[type=checkbox]").length > 1,
        null,
        { timeout: SETTLE },
    );
    const lone = await box.getByRole("checkbox", { name: /^\(no value\)/ }).count();
    if (lone > 0) {
        fail("the card's groups became a lone (no value) row");
    }
    await v.ws.getByRole("button", { name: /^Cancel/ }).click();
};

// Every key a card's menu shows does what it says on the card's grip.
const cardKeys = async (page) => {
    const v = await visit(page, "karate", "style-nodes");
    await v.firstStep(KINDS.reference);
    await v.addCard(KINDS.touching);
    await v
        .card(0)
        .getByRole("button", { name: /^More for / })
        .click();
    for (const key of ["F2", "Ctrl+D", "Ctrl+]", "Ctrl+[", "Del"]) {
        const shown = await v.page.getByRole("menu").innerText();
        if (!shown.includes(key)) {
            fail(`the card's menu shows no ${key}: ${shown.replaceAll("\n", " ")}`);
        }
    }
    await v.page.keyboard.press("Escape");
    const grip = (at) => v.card(at).locator(".cm-card-grip");
    await grip(1).focus();
    await v.page.keyboard.press("ControlOrMeta+]");
    v.cards.unshift(v.cards.pop());
    await v.page.waitForFunction(
        (want) =>
            JSON.stringify(
                [...document.querySelectorAll(".sel-ws .cm-card-list > .cm-list-card")].map((c) => c.dataset.cardId),
            ) === want,
        JSON.stringify(v.cards.map((c) => c.id)),
        { timeout: SETTLE },
    );
    await grip(0).focus();
    await v.page.keyboard.press("F2");
    await v.card(0).getByRole("textbox").waitFor();
    await v.page.keyboard.press("Escape");
    await grip(0).focus();
    await v.page.keyboard.press("ControlOrMeta+d");
    await v.ws.locator(".cm-card-list > .cm-list-card").nth(2).waitFor();
    await grip(1).focus();
    await v.page.keyboard.press("Delete");
    await v.ws.locator(".cm-card-list > .cm-list-card").nth(2).waitFor({ state: "detached" });
    await v.check("after the keys");
};

// A click on the Export dialog's backdrop with its settings open closes only the settings.
const exportBackdrop = async (page) => {
    const v = new Visit(page, "karate", "style-nodes");
    await v.open();
    await page.getByRole("button", { name: "Main menu" }).click();
    await page.getByRole("menuitem", { name: /^Export/ }).click();
    const dialog = page.getByRole("dialog", { name: "Export" });
    await dialog.waitFor();
    await dialog.getByRole("grid", { name: "What to export" }).getByText("Data").click();
    await dialog.getByRole("combobox", { name: "Format" }).click();
    await page.getByRole("option", { name: /CSV/ }).first().click();
    await dialog.getByRole("button", { name: /^Format settings/ }).click();
    const panel = page.locator("[data-popout-id]");
    await panel.first().waitFor();
    await page.mouse.click(8, 450);
    await panel.first().waitFor({ state: "hidden" });
    if (!(await dialog.isVisible())) {
        fail("one click on the backdrop closed the settings and the dialog");
    }
    await page.mouse.click(8, 450);
    await dialog.waitFor({ state: "hidden" });
};

// Analyze is a calm list: the chosen row's settings at its end, Run at the bottom.
const analyzeList = async (page) => {
    const v = new Visit(page, "karate", "style-nodes");
    await v.open();
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    const leiden = page.getByRole("option", { name: "Leiden" }).first();
    await leiden.click();
    await page.getByRole("button", { name: "Settings for Leiden" }).click();
    const panel = page.locator('[data-settings="leiden"]');
    await panel.waitFor();
    await v.type(panel.getByLabel("Seed", { exact: true }), "7");
    await page.getByRole("button", { name: "Run Leiden" }).click();
    await page.waitForFunction(
        () => {
            const s = document.querySelector("graphty-element").session;
            return s.runs
                .list()
                .some((r) => r.algorithm === "leiden" && r.params.randomSeed === 7 && r.status === "succeeded");
        },
        null,
        { timeout: SETTLE },
    );
};

// Every popover closes on an outside click and leaves the workspace open.
const outsideClick = (entry) => async (page) => {
    const v = await visit(page, "karate", entry);
    await v.firstStep(KINDS.hops);
    const step = v.step(0, 0);
    const outside = [
        ["the drawing", 1000, 300],
        ["the table", 1000, 700],
        ["the cards column", 250, 800],
        ["the title bar", 600, 48],
    ];
    const popovers = [
        [
            "settings",
            () => step.getByRole("button", { name: /^Settings for / }).click(),
            v.page.locator("[data-portal] .cm-caption").first(),
        ],
        [
            "card menu",
            () =>
                v
                    .card(0)
                    .getByRole("button", { name: /^More for / })
                    .click(),
            v.page.getByRole("menu"),
        ],
        ["value list", () => step.getByRole("button", { name: /^Value/ }).click(), v.page.getByRole("option").first()],
        [
            "reference list",
            () => step.getByRole("button", { name: /^Reference/ }).click(),
            v.page.getByRole("option").first(),
        ],
        ["+ Card list", () => v.ws.locator("[data-or]").click(), v.page.getByRole("option").first()],
        [
            "title menu",
            () =>
                v.ws
                    .locator(".sel-ws-head")
                    .getByRole("button", { name: /^More for / })
                    .click(),
            v.page.getByRole("menu"),
        ],
    ];
    for (const [name, open, shown] of popovers) {
        for (const [where, x, y] of outside) {
            await open();
            await shown.waitFor();
            await v.page.mouse.click(x, y);
            await shown
                .waitFor({ state: "hidden", timeout: SETTLE })
                .catch(() => fail(`${name} stayed open after a click on ${where}`));
            if (!(await v.ws.isVisible())) {
                fail(`a click on ${where} closed the workspace with ${name} open`);
            }
        }
    }
    await v.check("after every popover");
};

// Escape in a list or a panel closes only that; Escape on the workspace cancels it.
const escapeLevels = async (page) => {
    const v = await visit(page, "karate", "style-nodes");
    await v.firstStep(KINDS.louvain);
    const step = v.step(0, 0);
    await step.getByRole("button", { name: /^Settings for / }).click();
    const panel = v.page.locator("[data-portal] [data-testid=panel-field]").first();
    await panel.waitFor();
    await v.page.locator("[data-portal]").getByLabel("Resolution").first().click();
    await v.page.keyboard.press("Escape");
    await panel.waitFor({ state: "hidden" });
    if (!(await v.ws.isVisible())) {
        fail("Escape in the settings closed the workspace");
    }
    await step.getByRole("button", { name: /^Value/ }).click();
    await v.page.getByRole("option").first().waitFor();
    await v.page.keyboard.press("Escape");
    await v.page.getByRole("option").first().waitFor({ state: "hidden" });
    if (!(await v.ws.isVisible())) {
        fail("Escape in the value list closed the workspace");
    }
    await v.check("after the Escapes");
    await v.leave("escape");
};

// Deleting any card then adding one puts the new card last, every time.
const deleteThenAdd = (gone) => async (page) => {
    const v = await visit(page, "karate", "style-nodes");
    await v.firstStep(KINDS.reference);
    await v.addCard(KINDS.touching);
    await v.addCard(KINDS.hops);
    await v.card(gone).locator("[data-card-remove]").click();
    v.cards.splice(gone, 1);
    await v.check("delete");
    await assertOrder(v, "delete");
    await v.addCard(KINDS.data);
    await assertOrder(v, "add");
    await v.addCard(KINDS.degree);
    await assertOrder(v, "add again");
    await v.leave("done");
    await reopenSame(v);
};

// Long titles at every length keep the head's controls apart, open and folded.
const longTitles = async (page) => {
    const v = await visit(page, "lesmis", "style-nodes");
    await v.firstStep(KINDS.reference);
    await v.addCard(KINDS.hops);
    for (const title of ["AB", "Two words", "Three words here", LONG_TITLE, `${LONG_TITLE} ${LONG_TITLE}`]) {
        await rename(v, 0, title);
        await rename(v, 1, title);
        await v
            .card(0)
            .getByRole("button", { name: /^Collapse / })
            .click();
        await checkHeads(v, `folded, ${title.slice(0, 16)}`);
        await v
            .card(0)
            .getByRole("button", { name: /^Expand / })
            .click();
    }
    await v.leave("done");
};

// Dragging by the grip moves a card both ways; the order survives Done.
const dragBothWays = async (page) => {
    const v = await visit(page, "karate", "style-nodes");
    await v.firstStep(KINDS.reference);
    await v.addCard(KINDS.touching);
    await v.addCard(KINDS.hops);
    await EDITS.drag(v);
    await assertOrder(v, "drag up");
    const box = await v.card(2).boundingBox();
    await v.drag2(v.card(0).locator(".cm-card-grip"), box.y + box.height + 6);
    v.cards.push(v.cards.shift());
    await v.page.waitForFunction(
        (want) =>
            JSON.stringify(
                [...document.querySelectorAll(".sel-ws .cm-card-list > .cm-list-card")].map((c) => c.dataset.cardId),
            ) === want,
        JSON.stringify(v.cards.map((c) => c.id)),
        { timeout: SETTLE },
    );
    await v.check("drag down");
    await v.leave("done");
    await reopenSame(v);
};

// A Degree card shows its values in the table, and the Add, Keep, Except row waits for a test.
const degreeColumn = async (page) => {
    const v = await visit(page, "lesmis", "style-nodes");
    await v.firstStep(KINDS.degree);
    const table = await v.ws.locator(".sel-ws-strip").innerText();
    if (!table.includes("Degree")) {
        fail(`the table has no Degree column: ${table.slice(0, 120)}`);
    }
    await v.addCard(KINDS.louvain, { pick: [] });
    if ((await v.card(1).locator("[data-verb]").count()) !== 0) {
        fail("Add, Keep and Except show on a card with nothing ticked");
    }
    await v.leave("cancel");
};

// Adding a card folds the others.
const addFolds = async (page) => {
    const v = await visit(page, "karate", "style-nodes");
    await v.firstStep(KINDS.louvain);
    await v.addCard(KINDS.reference);
    if ((await v.card(0).getAttribute("data-folded")) === null) {
        fail("adding a card left the earlier card open");
    }
    await v.unfold(0);
    await v
        .card(0)
        .getByRole("checkbox", { name: /^Group 1,/ })
        .waitFor();
    if (
        !(await v
            .card(0)
            .getByRole("checkbox", { name: /^Group 1,/ })
            .isChecked())
    ) {
        fail("folding lost a card's ticks");
    }
    await v.leave("cancel");
};

// A Cancel keeps a layer as it was, and the same cards can be built again.
const cancelThenDone = async (page) => {
    const v = await visit(page, "karate", "style-nodes");
    await v.firstStep(KINDS.betweenness);
    await v.leave("cancel");
    v.cards = [];
    await v.enter();
    await v.firstStep(KINDS.pagerank);
    await v.leave("done");
};

// A category and a number column of the data, in every verb order, on a graph that has them.
const dataColumns = (verb) => async (page) => {
    const v = await visit(page, "papers", "style-nodes");
    const topic = {
        name: "topic",
        label: () => "topic",
        async fill(_, step, s) {
            const first = step.getByRole("checkbox").first();
            s.params.value = (await first.getAttribute("aria-label")).split(",")[0];
            await first.click();
        },
        leaf: (_, s) => new Set(v.nodes.filter((r) => r.topic === s.params.value).map((r) => String(r.id))),
    };
    const year = {
        name: "year",
        label: () => "year",
        fill: (_, step) => v.type(step.getByRole("textbox", { name: "year from, number" }), "2005"),
        leaf: () => new Set(v.nodes.filter((r) => r.year >= 2005).map((r) => String(r.id))),
    };
    await v.firstStep(topic);
    await v.addStep(0, verb, year);
    await v.addCard(year);
    // The table shows what the cards test.
    const table = await v.ws.locator(".sel-ws-strip").innerText();
    for (const name of ["topic", "year"]) {
        if (!table.includes(name)) {
            fail(`the table has no ${name} column: ${table.slice(0, 120)}`);
        }
    }
    await v.leave("done");
    await reopenSame(v);
};

// With the feature off, Which nodes opens the old editor and no modal.
const flagOff = async (page) => {
    const v = new Visit(page, "karate", "style-nodes");
    const url = new URL(args.url);
    url.searchParams.delete("features");
    await v.open(url.href);
    await page.getByRole("button", { name: "Add a layer or a folder" }).click();
    await page.getByRole("menuitem", { name: "Layer", exact: true }).click();
    await page.getByRole("textbox", { name: "Layer name" }).waitFor();
    await page.keyboard.press("Escape");
    const edit = page.getByRole("button", { name: /^Edit Which nodes/ });
    await page.mouse.move(0, 0);
    const opacity = await edit.evaluate((each) => getComputedStyle(each).opacity);
    if (opacity !== "0") {
        fail(`with the feature off Edit is drawn at rest (opacity ${opacity}): it stays a hover control`);
    }
    await edit.click({ force: true });
    await page.locator(".sel-ws").waitFor();
    if ((await page.locator(".sel-ws.sel-modal").count()) > 0) {
        fail("the modal opened with the feature off");
    }
};

// A picture of a scenario's end state, for the reader to look at, beside the failure shots.
const shot = (page, name) => page.screenshot({ path: join(args.out, `${name}.png`) });

// Every histogram bar is whole and inside the plot, the end ones included, and the thumbs sit on the
// end bars' outer edges.
const wholeBars = (dataset, kind) => async (page) => {
    const v = await visit(page, dataset, "style-nodes");
    await v.pickFirst(0, kind);
    await v
        .card(0)
        .getByRole("slider", { name: `${kind} range start` })
        .waitFor();
    const found = await v.card(0).evaluate((card) => {
        const plot = card.querySelector('[data-testid="histogram-plot"]').getBoundingClientRect();
        const bars = [...card.querySelectorAll('[data-testid="histogram-bar"]')].map((bar) =>
            bar.getBoundingClientRect(),
        );
        return {
            plot: { left: plot.left, right: plot.right },
            widths: bars.map((bar) => bar.width),
            first: { left: bars[0].left, width: bars[0].width },
            last: { right: bars.at(-1).right, width: bars.at(-1).width },
        };
    });
    const { plot, widths, first, last } = found;
    if (first.left < plot.left - 0.5 || last.right > plot.right + 0.5) {
        fail(
            `a bar runs outside the plot: first at ${String(first.left)}, last ends ${String(last.right)}, plot ${JSON.stringify(plot)}`,
        );
    }
    const widest = Math.max(...widths);
    if (first.width < widest - 1 || last.width < widest - 1) {
        fail(
            `the end bars are cut: first ${String(first.width)}, last ${String(last.width)}, others up to ${String(widest)}`,
        );
    }
    const centerOf = async (name) => {
        const box = await v.card(0).getByRole("slider", { name }).boundingBox();
        return box.x + box.width / 2;
    };
    const start = await centerOf(`${kind} range start`);
    const end = await centerOf(`${kind} range end`);
    if (Math.abs(start - (first.left - 1)) > 1.5 || Math.abs(end - (last.right + 1)) > 1.5) {
        fail(
            `the thumbs sit at ${String(start)} and ${String(end)}, the end bars' outer edges at ${String(first.left)} and ${String(last.right)}`,
        );
    }
    await shot(page, `whole-bars-${dataset}-${kind}`);
};

// Analyze's chosen row opens its settings in the one settings popover, outside the list; a press in
// it keeps Analyze open, Escape closes only it, and Run is still there.
const analyzePopover = async (page) => {
    const v = new Visit(page, "karate", "style-nodes");
    await v.open();
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await page.getByRole("option", { name: "Louvain" }).first().click();
    await page.getByRole("button", { name: "Settings for Louvain" }).click();
    const panel = page.locator('[data-settings="louvain"]');
    await panel.waitFor();
    const inPopover = await panel.evaluate(
        (form) => form.closest("[data-popout-id]") !== null && form.closest('[role="listbox"]') === null,
    );
    if (!inPopover) {
        fail("Louvain's settings are drawn in the list, not in the settings popover");
    }
    await v.type(panel.getByLabel("Resolution", { exact: true }), "1.3");
    await panel.click({ position: { x: 4, y: 4 } });
    const analyze = page.getByRole("dialog", { name: "Analyze" }).or(page.locator('[aria-label="Analyze"]'));
    if (!(await analyze.first().isVisible())) {
        fail("a press in the settings popover closed Analyze");
    }
    await shot(page, "analyze-settings-popover");
    await page.keyboard.press("Escape");
    await panel.waitFor({ state: "hidden" });
    if (!(await analyze.first().isVisible())) {
        fail("Escape in the settings popover closed Analyze too");
    }
    await page.getByRole("button", { name: "Run Louvain" }).click();
    await page.waitForFunction(
        () =>
            document
                .querySelector("graphty-element")
                .session.runs.list()
                .some((r) => r.algorithm === "louvain" && r.params.resolution === 1.3 && r.status === "succeeded"),
        null,
        { timeout: SETTLE },
    );
};

// "+ Card" goes past six: the seventh and eighth cards get colors of their own from the element's
// largest categorical palette.
const pastSix = async (page) => {
    const v = await visit(page, "lesmis", "style-nodes");
    await v.firstStep(KINDS.reference);
    for (let at = 1; at < 8; at++) {
        await v.addCard(KINDS.reference);
    }
    const colors = v.cards.map((card) => card.color);
    if (new Set(colors).size !== 8) {
        fail(`eight cards hold ${String(new Set(colors).size)} colors: ${colors.join(" ")}`);
    }
    const kelly = await inPage(page, () =>
        document
            .querySelector("graphty-element")
            .session.catalog.palettes()
            .find((p) => p.id === "kelly")
            .colors.map((c) => c.toUpperCase()),
    );
    for (const color of colors.slice(6)) {
        if (!kelly.includes(color)) {
            fail(`card color ${color} past six is not one of the element's palettes`);
        }
    }
    if (!(await v.ws.locator("[data-or]").isEnabled())) {
        fail("+ Card is off after eight cards");
    }
    await shot(page, "cards-past-six");
    await v.leave("done");
};

// A group's swatch is the color the graph draws it in: in Styled, the Louvain layers Analyze added
// paint each group, and the checklist shows those colors; in Card colors no swatch shows.
const groupSwatches = async (page) => {
    const v = new Visit(page, "lesmis", "style-nodes");
    await v.open();
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await page.getByRole("option", { name: "Louvain" }).first().click();
    await page.getByRole("button", { name: "Run Louvain" }).click();
    await page.waitForFunction(
        () =>
            document
                .querySelector("graphty-element")
                .session.runs.list()
                .some((r) => r.algorithm === "louvain" && r.status === "succeeded"),
        null,
        { timeout: SETTLE },
    );
    await v.enter();
    await v.firstStep(KINDS.louvain, { pick: [1] });
    const step = v.step(0, 0);
    const rows = () =>
        step.evaluate((box) =>
            [...box.querySelectorAll("input[type=checkbox]")].map((input) => ({
                group: input.getAttribute("aria-label"),
                color:
                    input.closest(".mantine-Checkbox-root")?.querySelector(".ws-value-swatch")?.dataset.swatch ?? null,
            })),
        );
    await v.ws.locator("label", { hasText: "Card colors" }).click();
    if ((await rows()).some((row) => row.color !== null)) {
        fail("Card colors shows a group swatch");
    }
    await v.ws.locator("label", { hasText: "Styled" }).click();
    await step.locator(".ws-value-swatch").first().waitFor();
    const groups = (await rows()).filter((row) => /^Group /.test(row.group ?? ""));
    // What the graph draws each group's nodes in, read through the element, as Analyze's layers paint it.
    const drawn = await inPage(page, () => {
        const s = document.querySelector("graphty-element").session;
        const run = s.runs.list().findLast((r) => r.algorithm === "louvain" && r.status === "succeeded");
        const byGroup = new Map();
        for (const node of s.data.nodes()) {
            const group = run.result.node(node.id)?.group;
            byGroup.set(group, [...(byGroup.get(group) ?? []), node.id]);
        }
        // Each group's nodes by id: one color when all of them are drawn in it.
        return [...byGroup.values()].map((nodes) => {
            const [color] = s.styles.agreement({ nodes }, "node.color").channels;
            return color?.state === "agree" ? [String(color.value?.hex ?? color.value)] : [];
        });
    });
    const drawnColors = new Set(drawn.filter((colors) => colors.length === 1).map(([color]) => color.toLowerCase()));
    if (groups.some((row) => row.color === null || !drawnColors.has(row.color.toLowerCase()))) {
        fail(
            `a group swatch is not a drawn color: ${JSON.stringify(groups.slice(0, 4))} vs ${[...drawnColors].slice(0, 6).join(" ")}`,
        );
    }
    if (new Set(groups.map((row) => row.color)).size < 2) {
        fail("every group shows the same swatch");
    }
    await shot(page, "group-swatches-styled");
    await v.leave("done");
};

const SCENARIOS = [
    [
        "slider: Betweenness, Karate Club, both exact ends",
        sliderEnds("karate", "style-nodes", "Betweenness", "betweenness"),
    ],
    ["slider: Degree, Les Miserables, both exact ends", sliderEnds("lesmis", "style-nodes", "Degree", "degree")],
    [
        "slider: PageRank in a Data filter, both exact ends",
        sliderEnds("karate", "filter-nodes", "PageRank", "pagerank"),
    ],
    [
        "settings: Louvain resolution then ticks, style layer",
        retune("karate", "style-nodes", KINDS.louvain, { Resolution: "1.4" }, { resolution: 1.4 }),
    ],
    [
        "settings: Louvain resolution then ticks, Les Miserables",
        retune("lesmis", "style-nodes", KINDS.louvain, { Resolution: "0.7" }, { resolution: 0.7 }),
    ],
    [
        "settings: Louvain resolution then ticks, Data filter",
        retune("lesmis", "filter-nodes", KINDS.louvain, { Resolution: "1.4" }, { resolution: 1.4 }),
    ],
    [
        "settings: Leiden seed then ticks",
        retune("karate", "style-nodes", KINDS.leiden, { Seed: "7" }, { randomSeed: 7 }),
    ],
    [
        "settings: Leiden seed then ticks, Data filter",
        retune("lesmis", "filter-nodes", KINDS.leiden, { Seed: "11" }, { randomSeed: 11 }),
    ],
    [
        "settings: Label propagation seed then ticks",
        retune(
            "lesmis",
            "style-nodes",
            community("Label propagation", "label-propagation"),
            { Seed: "7" },
            { randomSeed: 7 },
        ),
    ],
    [
        "settings: Leiden resolution then ticks",
        retune("lesmis", "style-nodes", KINDS.leiden, { Resolution: "1.4" }, { resolution: 1.4 }),
    ],
    ["ticks: the last tick off, Louvain, No nodes", untickToZero("karate", "style-nodes", KINDS.louvain, "none")],
    ["ticks: the last tick off, Leiden, Data filter", untickToZero("lesmis", "filter-nodes", KINDS.leiden, "none")],
    ["ticks: same groups keep their ticks", sameGroupsKeepTicks],
    ["reopen: a saved card's list keeps its order, no ring on the drawing", reopenOrder],
    ["typed: the shown maximum, Betweenness, Karate Club", typedEnds("karate", "Betweenness", "betweenness")],
    ["typed: the shown maximum, Degree, Les Miserables", typedEnds("lesmis", "Degree", "degree")],
    ["camera: a quick visit, Cancel", quickOpen("cancel")],
    ["camera: a quick visit, Done", quickOpen("done")],
    ["keys: a card's menu keys work on its grip", cardKeys],
    ["settings: the edge condition sits on the card, which keeps its groups", edgesOnCard],
    ["popovers: the Export backdrop closes the settings first", exportBackdrop],
    ["analyze: chosen row, its settings, Run", analyzeList],
    ["popovers: outside clicks, style layer", outsideClick("style-nodes")],
    ["popovers: outside clicks, Data filter", outsideClick("filter-nodes")],
    ["escape: a list and a panel take their own Escape", escapeLevels],
    ["order: delete the first card then add", deleteThenAdd(0)],
    ["order: delete the middle card then add", deleteThenAdd(1)],
    ["order: delete the last card then add", deleteThenAdd(2)],
    ["titles: every length, open and folded", longTitles],
    ["drag: by the grip, up then down", dragBothWays],
    ["fold: adding a card folds the others and keeps ticks", addFolds],
    ["table: a Degree column, and no actions before a test", degreeColumn],
    ["cancel: a cancelled visit leaves nothing, the next one works", cancelThenDone],
    ["flag: off keeps the old editor", flagOff],
    ["columns: category and number, Add", dataColumns("add")],
    ["columns: category and number, Keep", dataColumns("keep")],
    ["columns: category and number, Except", dataColumns("except")],
    ["histogram: whole end bars, Degree, Karate Club", wholeBars("karate", "Degree")],
    ["histogram: whole end bars, Degree, Les Miserables", wholeBars("lesmis", "Degree")],
    ["histogram: whole end bars, Betweenness, Karate Club", wholeBars("karate", "Betweenness")],
    ["analyze: settings in the settings popover, Escape, Run", analyzePopover],
    ["cards: + Card past six, colors from the element", pastSix],
    ["swatches: Styled shows drawn group colors, Card colors none", groupSwatches],
];

const rowWords = (row) =>
    `${row.entry} ${row.dataset} start:${row.start} ${row.shape} ${row.k1}+${row.k2} ${row.verb}/${row.verb2} ${row.edit} ${row.leave}`;

const scenarios = [
    ...MATRIX.map((row, at) => ({
        id: `m${String(at + 1).padStart(3, "0")}`,
        words: rowWords(row),
        run: (page) => walkRow(page, row),
    })),
    ...EDGE_MATRIX.map((row, at) => ({
        id: `e${String(at + 1).padStart(3, "0")}`,
        words: `${row.entry} ${row.dataset} start:${row.start} ${row.shape} ${row.k1}+${row.k2} ${row.verb} ${row.edit} ${row.leave}`,
        run: (page) => walkEdgeRow(page, row),
    })),
    ...SCENARIOS.map(([words, run], at) => ({ id: `s${String(at + 1).padStart(2, "0")}`, words, run })),
];

// ------------------------------------------------------------------------------------------------
// The run.
// ------------------------------------------------------------------------------------------------

if (args.list) {
    for (const each of scenarios) {
        console.log(`${each.id}  ${each.words}`);
    }
    console.log(
        `${String(MATRIX.length)} node rows, ${String(EDGE_MATRIX.length)} edge rows, ${String(SCENARIOS.length)} named scenarios`,
    );
    process.exit(0);
}
if (args.url === undefined) {
    console.error("--url is required");
    process.exit(2);
}

const wanted = args.only?.split(",");
const queue = scenarios.filter(
    (each) => wanted === undefined || wanted.some((text) => each.id === text || each.words.includes(text)),
);
mkdirSync(args.out, { recursive: true });
const browser = await chromium.launch({ args: ["--ignore-certificate-errors", "--use-gl=angle"] });
const results = [];

async function runOne(scenario) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    page.setDefaultTimeout(60_000);
    const began = Date.now();
    const result = { id: scenario.id, words: scenario.words, status: "pass", message: "" };
    try {
        await scenario.run(page);
    } catch (error) {
        result.status = "FAIL";
        const where = /selection-workspace-uat\.mjs:(\d+)/.exec(String(error.stack).split("\n").slice(1).join("\n"));
        result.message = `${String(error.message).split("\n").slice(0, 2).join(" ").slice(0, 400)} (line ${where?.[1] ?? "?"})`;
        result.shot = join(args.out, `${scenario.id}.png`);
        await page.screenshot({ path: result.shot }).catch(() => undefined);
    }
    result.seconds = Math.round((Date.now() - began) / 1000);
    results.push(result);
    console.log(`${result.status}  ${result.id}  ${String(result.seconds).padStart(3)}s  ${result.words}`);
    if (result.message !== "") {
        console.log(`      ${result.message}`);
    }
    await context.close();
}

await Promise.all(
    Array.from({ length: Number(args.workers) }, async () => {
        for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
            await runOne(next);
        }
    }),
);
await browser.close();

const failed = results.filter((each) => each.status === "FAIL");
console.log(`\n${"id".padEnd(6)}${"result".padEnd(8)}${"secs".padEnd(6)}scenario`);
for (const each of [...results].sort((a, b) => a.id.localeCompare(b.id))) {
    console.log(`${each.id.padEnd(6)}${each.status.padEnd(8)}${String(each.seconds).padEnd(6)}${each.words}`);
}
console.log(
    `\n${String(results.length - failed.length)} passed, ${String(failed.length)} failed of ${String(results.length)}`,
);
for (const each of failed) {
    console.log(`${each.id}: ${each.message}\n    ${each.shot}`);
}
process.exit(failed.length === 0 ? 0 : 1);
