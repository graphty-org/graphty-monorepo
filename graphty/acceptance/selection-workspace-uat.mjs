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
        return this.ws.locator(".cm-card-list > .cm-card").nth(at);
    }

    step(at, index) {
        return this.card(at).locator(".sel-card-step[data-row]").nth(index);
    }

    async open(url = args.url) {
        await this.page.goto(url);
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
            cards: [...box.querySelectorAll(".cm-card-list > .cm-card")].map(
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
                    const seen = [...box.querySelectorAll(".cm-card-list > .cm-card")].map(
                        (c) => c.querySelector(".cm-card-head .sel-count")?.textContent ?? "",
                    );
                    const grid = box.querySelector("[role=grid]");
                    return (
                        box.querySelector(".sel-ws-head > .sel-count")?.textContent === w.title &&
                        JSON.stringify(seen) === JSON.stringify(w.cards) &&
                        grid !== null &&
                        Number(grid.getAttribute("aria-rowcount")) - 1 === w.rows
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
            const seen = await this.ws.evaluate((box) =>
                [...box.querySelectorAll("[data-testid=data-table-row]")]
                    .slice(0, 6)
                    .map(
                        (r) => `${r.innerText.replaceAll("\n", "|")} ${r.style.getPropertyValue("--cm-dt-row-color")}`,
                    ),
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
        await this.ws.getByRole("button", { name: "Done", exact: true }).click();
        await this.ws.waitFor({ state: "detached" });
        if (this.host === "filter") {
            await this.page
                .waitForFunction(
                    ([side, n]) => {
                        const v = document.querySelector("graphty-element").session.visibility;
                        return (side === "node" ? v.nodes.size : v.edges.size) === n;
                    },
                    [this.side, total.size],
                    { timeout: SETTLE },
                )
                .catch(async () => {
                    const seen = await inPage(this.page, () => {
                        const v = document.querySelector("graphty-element").session.visibility;
                        return `${String(v.nodes.size)} nodes, ${String(v.edges.size)} edges, ${String(v.conditions.length)} conditions`;
                    });
                    fail(`Done: expected ${String(total.size)} ${this.many} visible, session holds ${seen}`);
                });
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

    // Done keeps the runs the final cards read, as ordinary runs in Data > Runs.
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
        const rows = this.page.getByRole("list", { name: "Runs" }).getByRole("listitem");
        await rows.first().waitFor();
        if ((await rows.count()) !== runs.length) {
            fail(`Done: Data > Runs lists ${String(await rows.count())} rows for ${String(runs.length)} runs`);
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
            await v.reference(step, "Source Node", from);
            await v.reference(step, "Target Node", to);
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
        for (const card of box.querySelectorAll(".cm-card-list > .cm-card")) {
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

const order = (v) => v.ws.locator(".cm-card-list > .cm-card").evaluateAll((cs) => cs.map((c) => c.dataset.cardId));

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
                    [...document.querySelectorAll(".sel-ws .cm-card-list > .cm-card")].map((c) => c.dataset.cardId),
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

// A setting changed, then groups ticked and unticked: the counts follow every tick.
const retune = (dataset, entry, kind, settings, run) => async (page) => {
    const v = await visit(page, dataset, entry);
    if (v.cards[0].start !== "none") {
        await v.flipStart(0);
    }
    const step = await v.firstStep(kind, { pick: [1] });
    const box = v.step(0, 0);
    for (const [label, value] of Object.entries(settings)) {
        await v.setting(box, label, value);
    }
    step.params.run = run;
    step.params.groups = [];
    await v.page.waitForFunction(
        () => document.querySelectorAll(".sel-ws .cm-card-list input[type=checkbox]").length > 0,
    );
    await v.page
        .waitForFunction(
            () =>
                [...document.querySelectorAll(".sel-ws .cm-card-list input[type=checkbox]")].every(
                    (each) => !each.checked,
                ),
            null,
            { timeout: SETTLE },
        )
        .catch(() => fail("the ticks of the old run stayed after its setting changed"));
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
    await v.leave("done");
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
                [...document.querySelectorAll(".sel-ws .cm-card-list > .cm-card")].map((c) => c.dataset.cardId),
            ) === want,
        JSON.stringify(v.cards.map((c) => c.id)),
        { timeout: SETTLE },
    );
    await v.check("drag down");
    await v.leave("done");
    await reopenSame(v);
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
    await page.getByRole("button", { name: /^Edit Which nodes/ }).click();
    await page.locator(".sel-ws").waitFor();
    if ((await page.locator(".sel-ws.sel-modal").count()) > 0) {
        fail("the modal opened with the feature off");
    }
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
        retune("karate", "style-nodes", KINDS.leiden, { "Random seed": "7" }, { randomSeed: 7 }),
    ],
    [
        "settings: Leiden seed then ticks, Data filter",
        retune("lesmis", "filter-nodes", KINDS.leiden, { "Random seed": "11" }, { randomSeed: 11 }),
    ],
    [
        "settings: Label propagation seed then ticks",
        retune(
            "lesmis",
            "style-nodes",
            community("Label propagation", "label-propagation"),
            { "Random seed": "7" },
            { randomSeed: 7 },
        ),
    ],
    [
        "settings: Leiden resolution then ticks",
        retune("lesmis", "style-nodes", KINDS.leiden, { Resolution: "1.4" }, { resolution: 1.4 }),
    ],
    ["popovers: outside clicks, style layer", outsideClick("style-nodes")],
    ["popovers: outside clicks, Data filter", outsideClick("filter-nodes")],
    ["escape: a list and a panel take their own Escape", escapeLevels],
    ["order: delete the first card then add", deleteThenAdd(0)],
    ["order: delete the middle card then add", deleteThenAdd(1)],
    ["order: delete the last card then add", deleteThenAdd(2)],
    ["titles: every length, open and folded", longTitles],
    ["drag: by the grip, up then down", dragBothWays],
    ["fold: adding a card folds the others and keeps ticks", addFolds],
    ["cancel: a cancelled visit leaves nothing, the next one works", cancelThenDone],
    ["flag: off keeps the old editor", flagOff],
    ["columns: category and number, Add", dataColumns("add")],
    ["columns: category and number, Keep", dataColumns("keep")],
    ["columns: category and number, Except", dataColumns("except")],
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
