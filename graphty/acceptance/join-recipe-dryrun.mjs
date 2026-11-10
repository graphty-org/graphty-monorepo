#!/usr/bin/env node
/**
 * Dry run of the join workspace's recipe build (the `join-workspace` feature): it drives a served
 * build of the graphty app with real clicks, keys and file choices, in Chromium and in WebKit, and
 * checks what a reader sees -- the Join + row, the step cards' counts and row fates, the header's
 * totals, Before and After, the table's fates, and after Done the graph (through graphty-element's
 * public API) and the per-source sections.
 *
 *   tools/with-browser.sh node graphty/acceptance/join-recipe-dryrun.mjs --url <served url>
 *     --data <dir>         the join data sets (default <main checkout>/tmp/join-builds/datasets)
 *     --only <text,text>   only the scenarios whose id holds one of these
 *     --browsers <list>    chromium,webkit (default both)
 *     --out <dir>          screenshots (default <main checkout>/tmp/join-builds/recipe-dryrun)
 *
 * Serve a build made with VITE_LOCAL_SAMPLE_DATA=true (`vite preview` then answers for the sample
 * datasets and their pictures from this machine): a plain build reads them from graphty.app, whose
 * copy can lag the build's catalog, and a missing picture there fails "no console errors".
 *
 * Every expected number is worked out here from the data set files, never read from the app.
 * Exit 0 when every check passed, 1 when one failed.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { isDeepStrictEqual, parseArgs } from "node:util";

import { chromium, webkit } from "playwright";

const main = dirname(
    execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
        cwd: dirname(new URL(import.meta.url).pathname),
    })
        .toString()
        .trim(),
);
const { values: args } = parseArgs({
    options: {
        url: { type: "string" },
        data: { type: "string", default: join(main, "tmp/join-builds/datasets") },
        only: { type: "string" },
        browsers: { type: "string", default: "chromium,webkit" },
        out: { type: "string", default: join(main, "tmp/join-builds/recipe-dryrun") },
    },
});
if (args.url === undefined) {
    console.error("--url is required");
    process.exit(2);
}
mkdirSync(args.out, { recursive: true });

// How long a reader's view may take to reach what is expected: a hang guard, never a wait.
const SETTLE = 30_000;
// As canary.graphty.app serves it: the Sources tab is the selection workspace's.
const FEATURES = "selection-workspace,join-workspace";

// ------------------------------------------------------------------------------------------------
// The data sets, read here, and what each scenario should show.
// ------------------------------------------------------------------------------------------------

function csv(name) {
    const text = readFileSync(join(args.data, name), "utf8");
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let at = 0; at < text.length; at++) {
        const ch = text[at];
        if (quoted) {
            if (ch === '"' && text[at + 1] === '"') {
                cell += '"';
                at++;
            } else if (ch === '"') {
                quoted = false;
            } else {
                cell += ch;
            }
        } else if (ch === '"') {
            quoted = true;
        } else if (ch === ",") {
            row.push(cell);
            cell = "";
        } else if (ch === "\n") {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = "";
        } else if (ch !== "\r") {
            cell += ch;
        }
    }
    if (cell !== "" || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }
    const [head, ...body] = rows;
    return body.map((cells) => Object.fromEntries(head.map((column, i) => [column, cells[i] ?? ""])));
}

function graphmlIds(name) {
    const text = readFileSync(join(args.data, name), "utf8");
    return {
        nodes: [...text.matchAll(/<node id="([^"]+)"/g)].map((m) => m[1]),
        edges: [...text.matchAll(/<edge /g)].length,
    };
}

const distinct = (values) => new Set(values).size;

// Door entries: people and buildings, door_entries.csv as edges person_id -> building_id.
function expectDoors() {
    const people = csv("people.csv");
    const buildings = csv("buildings.csv");
    const entries = csv("door_entries.csv");
    const ids = new Set([...people.map((p) => p.person_id), ...buildings.map((b) => b.id)]);
    const fates = { joined: 0, "new-end": 0, repeat: 0, "left-out": 0 };
    const pairs = new Set();
    const unknown = new Set();
    for (const row of entries) {
        const [s, t] = [row.person_id, row.building_id];
        if (s === "" || t === "") {
            fates["left-out"]++;
            continue;
        }
        const pair = `${s}\u0000${t}`;
        if (pairs.has(pair)) {
            fates.repeat++;
            continue;
        }
        pairs.add(pair);
        for (const end of [s, t]) {
            if (!ids.has(end)) {
                unknown.add(end);
            }
        }
        fates[ids.has(s) && ids.has(t) ? "joined" : "new-end"]++;
    }
    const withDept = people.filter((p) => p.dept !== "");
    const tagLists = people.map((p) => (p.tags === "" ? [] : [...new Set(p.tags.split(";"))]));
    return {
        before: { nodes: people.length + buildings.length, edges: 0 },
        rows: entries.length,
        fates,
        edges: { newNodes: unknown.size, newEdges: pairs.size },
        kind: { newNodes: distinct(withDept.map((p) => p.dept)), newEdges: withDept.length },
        split: { newNodes: distinct(tagLists.flat()), newEdges: tagLists.flat().length, rows: people.length },
        wrongKeyRows: entries.length,
        p002Tags: people.find((p) => p.person_id === "P002").tags.split(";"),
    };
}

// Shared identifiers: accounts linked by a shared phone, device or email (hub cap 10).
function expectFraud(cap = 10) {
    const accounts = new Set(csv("accounts.csv").map((a) => a.account_id));
    const rows = csv("account_identifiers.csv");
    const columns = ["phone", "device", "email"];
    const holders = new Map();
    for (const row of rows) {
        if (!accounts.has(row.account_id)) {
            continue;
        }
        for (const column of columns) {
            if (row[column] !== "") {
                const key = `${column}\u0000${row[column]}`;
                holders.set(key, (holders.get(key) ?? new Set()).add(row.account_id));
            }
        }
    }
    const used = [...holders].filter(([, ids]) => ids.size >= 2 && ids.size <= cap);
    const pairs = new Set();
    for (const [, ids] of used) {
        const list = [...ids].sort();
        list.forEach((a, i) => list.slice(i + 1).forEach((b) => pairs.add(`${a}|${b}`)));
    }
    const usedKeys = new Set(used.map(([key]) => key));
    const fates = { linked: 0, "over-cap": 0, "left-out": 0 };
    for (const row of rows) {
        const keys = columns.filter((c) => row[c] !== "").map((c) => `${c}\u0000${row[c]}`);
        if (!accounts.has(row.account_id)) {
            fates["left-out"]++;
        } else if (keys.some((k) => usedKeys.has(k))) {
            fates.linked++;
        } else if (keys.some((k) => (holders.get(k)?.size ?? 0) > cap)) {
            fates["over-cap"]++;
        } else {
            fates["left-out"]++;
        }
    }
    return {
        before: { nodes: accounts.size, edges: 0 },
        rows: rows.length,
        fates,
        asEdges: { newNodes: 0, newEdges: pairs.size },
        asNodes: { newNodes: used.length, newEdges: used.reduce((sum, [, ids]) => sum + ids.size, 0) },
    };
}

// Expression by symbol: expression.csv through ensembl_to_symbol.csv onto the protein network.
function expectGenes() {
    const graph = graphmlIds("string_tp53.graphml");
    const ids = new Set(graph.nodes);
    const map = new Map();
    for (const row of csv("ensembl_to_symbol.csv")) {
        if (ids.has(row.protein_id)) {
            map.set(row.symbol, [...(map.get(row.symbol) ?? []), row.protein_id]);
        }
    }
    const rows = csv("expression.csv");
    const joined = rows.filter((r) => map.has(r.symbol));
    const tp53 = rows.find((r) => r.symbol === "TP53");
    return {
        before: { nodes: graph.nodes.length, edges: graph.edges },
        rows: rows.length,
        joined: joined.length,
        leftOut: rows.length - joined.length,
        tp53: { id: map.get("TP53")[0], log2FC: Number(tp53.log2FC) },
    };
}

// Tumor vs normal: the two graphs compared by id.
function expectConditions() {
    const tumor = graphmlIds("tumor.graphml");
    const normal = graphmlIds("normal.graphml");
    const t = new Set(tumor.nodes);
    const n = new Set(normal.nodes);
    const both = [...t].filter((id) => n.has(id)).length;
    return {
        before: { nodes: t.size, edges: tumor.edges },
        regions: { onlyA: t.size - both, both, onlyB: n.size - both },
        union: t.size + n.size - both,
    };
}

// Two supplier lists merged on duns ignoring spaces, then purchase orders as vendor -> plant edges.
function expectSuppliers() {
    const a = csv("suppliers_a.csv");
    const b = csv("suppliers_b.csv");
    const byDuns = new Map(a.map((s) => [s.duns.replaceAll(/\s+/g, ""), s]));
    const seen = new Set();
    const fates = { merged: 0, "new-end": 0, repeat: 0 };
    const vendorNode = new Map();
    let clashedRating = null;
    for (const row of b) {
        const key = row.duns.replaceAll(/\s+/g, "");
        if (seen.has(key)) {
            fates.repeat++;
            continue;
        }
        seen.add(key);
        const onto = byDuns.get(key);
        if (onto === undefined) {
            fates["new-end"]++;
        } else {
            fates.merged++;
            vendorNode.set(row.vendor_no, onto.id);
            if (clashedRating === null && onto.rating !== row.rating) {
                clashedRating = { id: onto.id, max: Math.max(Number(onto.rating), Number(row.rating)) };
            }
        }
    }
    const orders = csv("purchase_orders.csv");
    const sums = new Map();
    for (const po of orders) {
        const pair = `${po.vendor_no}\u0000${po.plant}`;
        sums.set(pair, (sums.get(pair) ?? 0) + Number(po.amount));
    }
    const [firstPair, firstSum] = [...sums][0];
    const [vendor, plant] = firstPair.split("\u0000");
    const vendors = new Set(b.map((r) => r.vendor_no));
    const unknownVendors = distinct(orders.map((o) => o.vendor_no).filter((v) => !vendors.has(v)));
    return {
        before: { nodes: a.length, edges: 0 },
        fates,
        mergedNewNodes: fates["new-end"],
        orders: {
            rows: orders.length,
            newEdges: sums.size,
            newNodes: distinct(orders.map((o) => o.plant)) + unknownVendors,
            firstPair: { vendor, plant, sum: firstSum },
        },
        clashedRating,
        // A vendor with no clash to read back: the B row of a merged A node.
        vendorNode,
    };
}

// ------------------------------------------------------------------------------------------------
// One visit to the app.
// ------------------------------------------------------------------------------------------------

class Visit {
    constructor(page, scenario, browserName) {
        this.page = page;
        this.id = `${browserName}-${scenario}`;
        this.checks = [];
        this.errors = [];
        page.on("pageerror", (error) => this.errors.push(`pageerror: ${error.message}`));
        page.on("response", (response) => {
            if (response.status() >= 400) {
                this.errors.push(`http ${String(response.status())}: ${response.url()}`);
            }
        });
        page.on("console", (message) => {
            if (message.type() === "error") {
                this.errors.push(`console: ${message.text().slice(0, 300)}`);
            }
        });
    }

    get ws() {
        return this.page.getByRole("dialog", { name: "Join", exact: true });
    }

    card(at) {
        return this.page.locator("[data-step]").nth(at);
    }

    async shot(name) {
        const path = join(args.out, `${this.id}-${name}.png`);
        await this.page.screenshot({ path }).catch(() => undefined);
        return path;
    }

    // Records a check: a value the reader's view reaches (polled until it does, or SETTLE).
    async see(name, read, want) {
        const began = Date.now();
        let got;
        for (;;) {
            try {
                got = await read();
            } catch (error) {
                got = `error: ${String(error.message).split("\n")[0]}`;
            }
            if (isDeepStrictEqual(got, want) || Date.now() - began > SETTLE) {
                break;
            }
            await this.page.waitForFunction(() => new Promise((done) => requestAnimationFrame(() => done(true))));
        }
        const ok = isDeepStrictEqual(got, want);
        const check = {
            name,
            ok,
            detail: ok ? JSON.stringify(got) : `want ${JSON.stringify(want)}, got ${JSON.stringify(got)}`,
        };
        if (!ok) {
            check.shot = await this.shot(`fail-${this.checks.length}`);
        }
        this.checks.push(check);
        console.log(`  ${ok ? "pass" : "FAIL"} ${this.id}: ${name} -- ${check.detail}`);
        return ok;
    }

    // A check of a plain fact, with no waiting.
    async is(name, ok, detail) {
        const check = { name, ok, detail };
        if (!ok) {
            check.shot = await this.shot(`fail-${this.checks.length}`);
        }
        this.checks.push(check);
        console.log(`  ${ok ? "pass" : "FAIL"} ${this.id}: ${name} -- ${detail}`);
    }

    // The main graph, through graphty-element's public API.
    graph() {
        return this.page.evaluate(() => {
            const session =
                document.querySelector(".ws-body graphty-element:not(.jw-preview graphty-element)")?.session ??
                document.querySelector("graphty-element")?.session;
            return { nodes: session?.data.nodes().length ?? -1, edges: session?.data.edges().length ?? -1 };
        });
    }

    sourceCount() {
        return this.page.evaluate(
            () => document.querySelector("graphty-element")?.session?.data.sources().length ?? -1,
        );
    }

    async open() {
        const url = new URL(args.url);
        url.searchParams.set("features", FEATURES);
        await this.page.goto(url.toString());
        await this.page.getByRole("button", { name: /Open a file/ }).waitFor();
    }

    async choose(click, file) {
        const [chooser] = await Promise.all([this.page.waitForEvent("filechooser"), click()]);
        await chooser.setFiles(join(args.data, file));
    }

    async openFirst(file, nodes) {
        await this.choose(() => this.page.getByRole("button", { name: /Open a file/ }).click(), file);
        await this.page.waitForFunction(
            (n) => document.querySelector("graphty-element")?.session?.data.nodes().length === n,
            nodes,
        );
        await this.page.getByRole("button", { name: "Data", exact: true }).click();
        await this.page.getByRole("button", { name: "Add source" }).waitFor();
    }

    async addFile(file) {
        await this.page.getByRole("button", { name: "Add source" }).click();
        await this.choose(() => this.page.getByRole("menuitem", { name: /^File/ }).click(), file);
    }

    async addAsRows(file, sources) {
        await this.addFile(file);
        await this.page.getByRole("button", { name: "Add as rows" }).click();
        await this.page.waitForFunction(
            (n) => document.querySelector("graphty-element")?.session?.data.sources().length === n,
            sources,
        );
    }

    async toWorkspace(file) {
        await this.addFile(file);
        await this.page.getByRole("button", { name: "Join choices" }).click();
        await this.page.getByRole("menuitem", { name: "Join workspace" }).click();
        await this.ws.waitFor();
    }

    joinRow() {
        return this.page.locator(".jw-row").getByRole("button", { name: "Join", exact: true });
    }

    async openJoin() {
        await this.joinRow().click();
        await this.ws.waitFor();
    }

    async addTable(file) {
        await this.choose(() => this.ws.getByRole("button", { name: "Table", exact: true }).click(), file);
    }

    async addStep(label) {
        const before = await this.page.locator("[data-step]").count();
        await this.ws.getByRole("button", { name: /^Step/ }).click();
        await this.page.getByRole("button", { name: new RegExp(`^${label}`) }).click();
        await this.page.waitForFunction((n) => document.querySelectorAll("[data-step]").length === n + 1, before);
    }

    // Opens a card's matcher, picks a table column, then a graph value.
    async match(at, which, column, graph) {
        await this.card(at).getByRole("button", { name: which, exact: true }).click();
        await this.page
            .getByRole("group", { name: "Table columns" })
            .getByRole("button", { name: new RegExp(`^${column}`) })
            .click();
        await this.page
            .getByRole("group", { name: "Graph values" })
            .getByRole("button", { name: new RegExp(`^${graph},`) })
            .click();
        await this.page.keyboard.press("Escape");
        await this.page.getByRole("group", { name: "Table columns" }).waitFor({ state: "detached" });
    }

    async pick(at, label, option) {
        await this.card(at).locator(`input[aria-label="${label}"]`).click();
        await this.page.getByRole("option", { name: option, exact: true }).click();
    }

    // What the reader reads on a card: its header chips, and its fate buttons.
    async chips(at) {
        const texts = await this.card(at).locator(".jr-sum .mantine-Badge-root").allInnerTexts();
        return texts.map((t) => t.trim());
    }

    async fates(at) {
        const texts = await this.card(at).getByRole("group", { name: "Row fates" }).getByRole("button").allInnerTexts();
        return texts.map((t) => t.replaceAll(/\s+/g, " ").trim());
    }

    async titles() {
        const titles = await this.page
            .locator("[data-step]")
            .evaluateAll((cards) => cards.map((c) => c.getAttribute("data-op")));
        return titles;
    }

    // The header's totals: "N nodes", "N edges".
    async totals() {
        const texts = await this.ws.locator(".jr-head .mantine-Badge-root").allInnerTexts();
        const read = (unit) =>
            Number(texts.find((t) => new RegExp(`^\\d+ ${unit}$`).test(t.trim()))?.split(" ")[0] ?? -1);
        return { nodes: read("nodes"), edges: read("edges") };
    }

    async preview(side) {
        await this.ws
            .getByRole("radiogroup", { name: "Preview" })
            .getByText(side === "before" ? "Before" : "After", { exact: true })
            .click();
        return this.page.evaluate((want) => {
            const pane = document.querySelector(".jw-preview");
            const drawn = pane?.querySelector("graphty-element")?.session;
            return {
                side: pane?.getAttribute("data-side") === want,
                nodes: Number(pane?.getAttribute("data-nodes")),
                edges: Number(pane?.getAttribute("data-edges")),
                drawnNodes: drawn?.data.nodes().length ?? -1,
            };
        }, side);
    }

    async previewSettled(side, want) {
        await this.see(
            `${side} preview`,
            async () => {
                const got = await this.preview(side);
                return got;
            },
            { side: true, nodes: want.nodes, edges: want.edges, drawnNodes: want.nodes },
        );
    }

    async range() {
        return (await this.ws.locator(".jw-rows-range").innerText()).trim();
    }

    // The fate column of the table's drawn rows.
    async tableFates() {
        const grid = this.ws.getByRole("grid", { name: "Rows" });
        return grid
            .locator('[role="row"]')
            .evaluateAll((rows) => [
                ...new Set(
                    rows
                        .slice(1)
                        .map(
                            (r) => r.querySelector('[role="gridcell"], [role="rowheader"]')?.textContent?.trim() ?? "",
                        ),
                ),
            ]);
    }

    // Presses the key a button shows (its aria-keyshortcuts: Cmd on a Mac's WebKit, Ctrl elsewhere).
    async pressKeyOf(button) {
        const key = await button.getAttribute("aria-keyshortcuts");
        await this.page.keyboard.press(key);
    }

    async done() {
        await this.pressKeyOf(this.ws.getByRole("button", { name: /^Done/ }));
        await this.ws.waitFor({ state: "detached" });
    }

    // Nothing in the workspace runs past its box or its container at this size.
    async unclipped(width, height) {
        await this.page.setViewportSize({ width, height });
        await this.page.waitForFunction(
            () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true)))),
        );
        const clipped = await this.page.evaluate(() => {
            const box = document.querySelector(".jw-modal");
            if (box === null) {
                return ["no workspace"];
            }
            const frame = box.getBoundingClientRect();
            const out = [];
            const vw = document.documentElement.clientWidth;
            const vh = document.documentElement.clientHeight;
            if (frame.right > vw + 1 || frame.bottom > vh + 1 || frame.left < -1 || frame.top < -1) {
                out.push(`workspace ${Math.round(frame.width)}x${Math.round(frame.height)} past the window`);
            }
            // Every control, and every element holding its own text.
            const shown = [...box.querySelectorAll("*")].filter(
                (el) =>
                    el.matches("button, input, .mantine-Badge-root") ||
                    [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== ""),
            );
            for (const el of shown) {
                const r = el.getBoundingClientRect();
                // Screen-reader text, a matcher's sample values and the table's cells are cut by design.
                if (
                    r.width <= 1 ||
                    r.height <= 1 ||
                    el.closest(".jr-mc-samples, [role=grid], .mantine-VisuallyHidden-root") !== null
                ) {
                    continue;
                }
                // Past the side of the scroll box holding it.
                let holder = el.parentElement;
                while (holder !== null && holder !== box) {
                    const style = getComputedStyle(holder);
                    if (/(auto|scroll|hidden)/.test(style.overflowX)) {
                        break;
                    }
                    holder = holder.parentElement;
                }
                const h = (holder ?? box).getBoundingClientRect();
                const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40);
                if (r.right > h.right + 1 || r.left < h.left - 1) {
                    out.push(`${el.tagName.toLowerCase()} "${name}" past its box`);
                } else if (
                    el.tagName !== "INPUT" &&
                    el.scrollWidth > el.clientWidth + 1 &&
                    getComputedStyle(el).overflowX !== "visible"
                ) {
                    out.push(`${el.tagName.toLowerCase()} "${name}" cut short`);
                }
            }
            return [...new Set(out)];
        });
        await this.is(
            `nothing clipped at ${width}x${height}`,
            clipped.length === 0,
            clipped.length === 0 ? "none" : clipped.join("; "),
        );
        if (clipped.length > 0) {
            await this.shot(`clip-${width}x${height}`);
        }
        await this.page.setViewportSize({ width: 1440, height: 900 });
    }

    // No sentences in the workspace: every piece of text a reader sees is a word or a short label.
    async noSentences() {
        const long = await this.page.evaluate(() => {
            const box = document.querySelector(".jw-modal");
            const found = [];
            const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
            for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
                const text = node.textContent.trim();
                const parent = node.parentElement;
                if (text === "" || parent.closest("[role=grid]") !== null || parent.getClientRects().length === 0) {
                    continue;
                }
                if (text.split(/\s+/).length >= 6 || /[a-z]{2,}[.!?]$/.test(text)) {
                    found.push(text.slice(0, 80));
                }
            }
            return found;
        });
        await this.is("no sentences", long.length === 0, long.length === 0 ? "none" : long.join(" | "));
    }

    async noErrors() {
        await this.is(
            "no console errors",
            this.errors.length === 0,
            this.errors.length === 0 ? "none" : this.errors.slice(0, 5).join(" | "),
        );
    }

    // The Join + row sits above the per-source sections, in the Sources tab.
    async joinRowPlaced() {
        const placed = await this.page.evaluate(() => {
            const row = document.querySelector(".jw-row");
            const sections = document.querySelector(".dp-source-sections");
            return {
                inSourcesTab: row?.closest(".dp-tab-body") !== null && row !== null,
                above:
                    row !== null &&
                    sections !== null &&
                    (row.compareDocumentPosition(sections) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
            };
        });
        await this.is(
            "Join + in the Sources tab, above the per-source sections",
            placed.inSourcesTab && placed.above,
            JSON.stringify(placed),
        );
    }

    // The Data panel lists each source and join, and draws a per-source section for each.
    async sections(names, count) {
        await this.see(
            "per-source sections",
            () =>
                this.page.evaluate((want) => {
                    const listed = [...document.querySelectorAll(".dp-source-name")].map((el) => el.textContent.trim());
                    const titles = [...document.querySelectorAll(".dp-source-sections > * .cm-section-title")]
                        .map((el) => el.textContent.trim())
                        .filter((t) => t !== "Filters");
                    return {
                        listed: listed.length,
                        sections: titles.length,
                        named: want.every((name) => listed.includes(name) && titles.includes(name)),
                    };
                }, names),
            { listed: count, sections: count, named: true },
        );
    }
}

// ------------------------------------------------------------------------------------------------
// The scenarios.
// ------------------------------------------------------------------------------------------------

const fate = (count, word) => `${String(count)} ${word}`;

const SCENARIOS = {
    // Door entries: rows to edges, a column to node kind, a list split; wrong key, undo, remove, reorder.
    async doors(v) {
        const want = expectDoors();
        await v.open();
        await v.openFirst("people.csv", 60);
        await v.see("one source: no Join + row", () => v.page.locator(".jw-row").count(), 0);
        await v.addAsRows("buildings.csv", 2);
        await v.see("two sources: Join + row", () => v.joinRow().isVisible(), true);
        await v.joinRowPlaced();
        await v.openJoin();
        await v.see("starts empty", () => v.page.locator("[data-step]").count(), 0);
        await v.see("empty totals", () => v.totals(), want.before);
        await v.addTable("door_entries.csv");
        await v.addStep("Turn rows into edges");
        await v.match(0, "Source", "person_id", "id");
        await v.match(0, "Target", "building_id", "id");
        await v.see("edges chips", () => v.chips(0), [`+${want.edges.newEdges} e`, `+${want.edges.newNodes} n`]);
        await v.see(
            "edges fates",
            () => v.fates(0),
            [
                fate(want.fates.joined, "matched"),
                fate(want.fates["new-end"], "new end"),
                fate(want.fates.repeat, "repeat"),
                fate(want.fates["left-out"], "left out"),
            ].filter((t) => !t.startsWith("0 ")),
        );
        const afterEdges = { nodes: want.before.nodes + want.edges.newNodes, edges: want.edges.newEdges };
        await v.see("totals after edges", () => v.totals(), afterEdges);
        await v.previewSettled("before", want.before);
        await v.previewSettled("after", afterEdges);
        await v.see("rows table range", () => v.range(), `1-50 of ${want.rows}`);
        await v
            .card(0)
            .getByRole("group", { name: "Row fates" })
            .getByRole("button", { name: /left out/ })
            .click();
        await v.see(
            "left-out rows only",
            () => v.range(),
            `1-${Math.min(50, want.fates["left-out"])} of ${want.fates["left-out"]}`,
        );
        await v.see("table fates", () => v.tableFates(), ["Left out"]);
        await v
            .card(0)
            .getByRole("group", { name: "Row fates" })
            .getByRole("button", { name: /left out/ })
            .click();
        await v.see("every row again", () => v.range(), `1-50 of ${want.rows}`);

        // Column to node kind, by key: N opens the tiles, 8 picks one.
        await v.ws.focus();
        await v.page.keyboard.press("n");
        await v.page.getByRole("button", { name: /^Column to node kind/ }).waitFor();
        await v.page.keyboard.press("8");
        await v.see("N then 8 adds a step", () => v.page.locator("[data-step]").count(), 2);
        await v.pick(1, "From", "people");
        await v.pick(1, "Column", "dept");
        await v.see("kind chips", () => v.chips(1), [`+${want.kind.newEdges} e`, `+${want.kind.newNodes} n`]);

        await v.addStep("Split a list");
        await v.pick(2, "From", "people");
        await v.pick(2, "Column", "tags");
        await v.card(2).getByRole("radiogroup", { name: "Split as" }).getByText("nodes", { exact: true }).click();
        await v.see("split chips", () => v.chips(2), [`+${want.split.newEdges} e`, `+${want.split.newNodes} n`]);
        const full = {
            nodes: afterEdges.nodes + want.kind.newNodes + want.split.newNodes,
            edges: afterEdges.edges + want.kind.newEdges + want.split.newEdges,
        };
        await v.see("totals with three steps", () => v.totals(), full);

        // A wrong key: a values step on door_entries matched by `door` matches nothing, adds nothing.
        await v.addStep("Put values on nodes");
        await v.pick(3, "From", "door_entries");
        await v.match(3, "Match", "door", "id");
        await v.see("wrong key: zero matched", () => v.chips(3), [`0 / ${want.wrongKeyRows} rows`]);
        await v.see("wrong key adds nothing", () => v.totals(), full);
        await v.see("wrong key: every row left out", () => v.fates(3), [fate(want.wrongKeyRows, "left out")]);
        await v.unclipped(1440, 900);
        await v.unclipped(1280, 720);
        await v.noSentences();
        await v.card(3).getByRole("button", { name: "More for step 4" }).click();
        await v.page.getByRole("menuitem", { name: /^Remove/ }).click();
        await v.see("wrong-key step removed", () => v.page.locator("[data-step]").count(), 3);

        // Remove the kind step: the rest re-apply without it.
        const ops = await v.titles();
        await v.card(1).getByRole("button", { name: "More for step 2" }).click();
        await v.page.getByRole("menuitem", { name: /^Remove/ }).click();
        await v.see("kind removed: rest re-apply", () => v.totals(), {
            nodes: full.nodes - want.kind.newNodes,
            edges: full.edges - want.kind.newEdges,
        });
        await v.see("split still counts", () => v.chips(1), [`+${want.split.newEdges} e`, `+${want.split.newNodes} n`]);
        // Reorder: the split moves above the edges.
        await v.card(1).getByRole("button", { name: "More for step 2" }).click();
        await v.page.getByRole("menuitem", { name: /^Move up/ }).click();
        await v.see("reordered", () => v.titles(), ["split", "edges"]);
        await v.see("reorder keeps totals", () => v.totals(), {
            nodes: full.nodes - want.kind.newNodes,
            edges: full.edges - want.kind.newEdges,
        });
        // Undo the move and the removal; redo the removal; undo it again.
        await v.ws.getByRole("button", { name: "Undo" }).click();
        await v.see("undo move", () => v.titles(), ["edges", "split"]);
        await v.ws.focus();
        await v.pressKeyOf(v.ws.getByRole("button", { name: "Undo" }));
        await v.see("undo remove (key)", () => v.titles(), [ops[0], ops[1], ops[2]]);
        await v.see("undo restores totals", () => v.totals(), full);
        await v.ws.getByRole("button", { name: "Redo" }).click();
        await v.see("redo remove", () => v.page.locator("[data-step]").count(), 2);
        await v.ws.getByRole("button", { name: "Undo" }).click();
        await v.see("three steps again", () => v.totals(), full);

        await v.see("nothing applied before Done", () => v.graph(), want.before);
        await v.done();
        await v.see("graph after Done", () => v.graph(), full);
        await v.see("sources after Done", () => v.sourceCount(), 5);
        await v.sections(["people.csv", "buildings.csv", "door_entries.csv"], 5);
        await v.see(
            "P002 split into tag nodes",
            () =>
                v.page.evaluate(() => {
                    const s = document.querySelector("graphty-element").session;
                    const ids = new Set(
                        s.data
                            .edges()
                            .filter((e) => e.source === "P002")
                            .map((e) => e.target),
                    );
                    return s.data.nodes().filter((n) => ids.has(n.id) && n.kind === "tags").length;
                }),
            want.p002Tags.length,
        );
        await v.shot("done");
    },

    // Shared identifiers: link accounts by shared values, as edges then as value nodes.
    async fraud(v) {
        const want = expectFraud();
        await v.open();
        await v.openFirst("accounts.csv", want.before.nodes);
        await v.toWorkspace("account_identifiers.csv");
        await v.addStep("Link by shared value");
        await v.see(
            "link fates",
            () => v.fates(0),
            [
                fate(want.fates.linked, "linked"),
                fate(want.fates["left-out"], "left out"),
                fate(want.fates["over-cap"], "over cap"),
            ].filter((t) => !t.startsWith("0 ")),
        );
        await v.see("link as edges", () => v.totals(), {
            nodes: want.before.nodes + want.asEdges.newNodes,
            edges: want.asEdges.newEdges,
        });
        await v.card(0).getByRole("radiogroup", { name: "Link as" }).getByText("value nodes", { exact: true }).click();
        const after = { nodes: want.before.nodes + want.asNodes.newNodes, edges: want.asNodes.newEdges };
        await v.see("link as value nodes", () => v.totals(), after);
        await v.previewSettled("before", want.before);
        await v.previewSettled("after", after);
        await v
            .card(0)
            .getByRole("button", { name: /^Conflicts/ })
            .click();
        await v.see(
            "over-cap in the conflicts review",
            () => v.page.getByRole("dialog", { name: /^Conflicts/ }).isVisible(),
            true,
        );
        await v.page.keyboard.press("Escape");
        await v.unclipped(1440, 900);
        await v.unclipped(1280, 720);
        await v.noSentences();
        await v.done();
        await v.see("graph after Done", () => v.graph(), after);
        await v.sections(["accounts.csv", "account_identifiers.csv"], 2);
        await v.shot("done");
    },

    // Expression by symbol: values through a mapping table onto the protein network.
    async genes(v) {
        const want = expectGenes();
        await v.open();
        await v.openFirst("string_tp53.graphml", want.before.nodes);
        await v.toWorkspace("expression.csv");
        await v.addTable("ensembl_to_symbol.csv");
        await v.addStep("Map ids through a table");
        await v.pick(0, "From", "expression");
        await v.pick(0, "Via", "ensembl_to_symbol");
        await v.see("map chips", () => v.chips(0), [`${want.joined} / ${want.rows} rows`]);
        await v.see("map fates", () => v.fates(0), [fate(want.joined, "matched"), fate(want.leftOut, "left out")]);
        await v.previewSettled("after", want.before);
        await v.see("rows table range", () => v.range(), `1-50 of ${want.rows}`);
        await v.see("table fates", () => v.tableFates().then((f) => f.sort()), ["Joined", "Left out"]);
        await v.unclipped(1440, 900);
        await v.unclipped(1280, 720);
        await v.noSentences();
        await v.ws.getByRole("button", { name: /^Done/ }).click();
        await v.ws.waitFor({ state: "detached" });
        await v.see(
            "TP53 carries its log2FC",
            () =>
                v.page.evaluate(
                    (id) =>
                        document
                            .querySelector("graphty-element")
                            .session.data.nodes()
                            .find((n) => n.id === id)?.log2FC,
                    want.tp53.id,
                ),
            want.tp53.log2FC,
        );
        await v.see("graph after Done", () => v.graph(), want.before);
        await v.sections(["string_tp53.graphml", "expression.csv"], 2);
        await v.shot("done");
    },

    // Tumor vs normal: compare, the Venn kept to the intersection.
    async conditions(v) {
        const want = expectConditions();
        await v.open();
        await v.openFirst("tumor.graphml", want.before.nodes);
        await v.toWorkspace("normal.graphml");
        await v.addStep("Compare two graphs");
        const { onlyA, both, onlyB } = want.regions;
        await v.see("compare chips", () => v.chips(0), [`${onlyA} | ${both} | ${onlyB}`]);
        await v.see(
            "Venn regions",
            () =>
                v
                    .card(0)
                    .getByRole("group", { name: "Regions" })
                    .getByRole("button")
                    .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label"))),
            [`only A, ${onlyA} nodes`, `both, ${both} nodes`, `only B, ${onlyB} nodes`],
        );
        await v.see("union totals", () => v.totals().then((t) => t.nodes), want.union);
        await v
            .card(0)
            .getByRole("button", { name: /^only A,/ })
            .click();
        await v
            .card(0)
            .getByRole("button", { name: /^only B,/ })
            .click();
        await v.see(
            "intersection named",
            () =>
                v
                    .card(0)
                    .locator(".jr-venn-set")
                    .innerText()
                    .then((t) => t.trim()),
            "intersection",
        );
        await v.see(
            "preview keeps the intersection",
            () =>
                v.page.evaluate(
                    () => document.querySelector(".jw-preview graphty-element").session.visibility.summary.visibleNodes,
                ),
            both,
        );
        await v.unclipped(1440, 900);
        await v.unclipped(1280, 720);
        await v.noSentences();
        await v.done();
        await v.see(
            "graph after Done: intersection shown of the union",
            () =>
                v.page.evaluate(() => {
                    const s = document.querySelector("graphty-element").session;
                    return [s.visibility.summary.visibleNodes, s.data.nodes().length];
                }),
            [both, want.union],
        );
        await v.sections(["tumor.graphml", "normal.graphml"], 2);
        await v.shot("done");
    },

    // Two supplier lists merged on duns ignoring spaces, a fusion rule, then purchase orders as edges.
    async suppliers(v) {
        const want = expectSuppliers();
        await v.open();
        await v.openFirst("suppliers_a.csv", want.before.nodes);
        await v.toWorkspace("suppliers_b.csv");
        await v.addStep("Merge on a key");
        await v.match(0, "Match", "duns", "duns");
        await v.card(0).getByRole("button", { name: "Ignore spaces" }).click();
        await v.see(
            "merge fates",
            () => v.fates(0),
            [
                fate(want.fates.merged, "merged"),
                fate(want.fates["new-end"], "only suppliers_b"),
                fate(want.fates.repeat, "repeat"),
            ].filter((t) => !t.startsWith("0 ")),
        );
        await v.see("merge chips", () => v.chips(0), [`${want.fates.merged} merged`, `+${want.mergedNewNodes} n`]);
        await v
            .card(0)
            .getByRole("button", { name: /^Conflicts/ })
            .click();
        const review = v.page.getByRole("dialog", { name: /^Conflicts/ });
        await review.waitFor();
        await v.see("rating clashes listed", () => review.locator('input[aria-label="rating rule"]').count(), 1);
        await review.locator('input[aria-label="rating rule"]').click();
        await v.page.getByRole("option", { name: "max", exact: true }).click();
        await v.see("rating rule set", () => review.locator('input[aria-label="rating rule"]').inputValue(), "max");
        await v.shot("conflicts");
        await v.page.keyboard.press("Escape");
        await review.waitFor({ state: "detached" });

        await v.addTable("purchase_orders.csv");
        await v.addStep("Turn rows into edges");
        await v.pick(1, "From", "purchase_orders");
        await v.match(1, "Source", "vendor_no", "vendor_no");
        await v.match(1, "Target", "plant", "id");
        await v.card(1).locator('input[aria-label="New target kind"]').fill("plant");
        await v.page.keyboard.press("Enter");
        await v
            .card(1)
            .getByRole("button", { name: /^Conflicts/ })
            .click();
        await v.page.locator('input[aria-label="amount per pair"]').click();
        await v.page.getByRole("option", { name: "sum", exact: true }).click();
        await v.page.keyboard.press("Escape");
        await v.see("orders chips", () => v.chips(1), [`+${want.orders.newEdges} e`, `+${want.orders.newNodes} n`]);
        const after = {
            nodes: want.before.nodes + want.mergedNewNodes + want.orders.newNodes,
            edges: want.orders.newEdges,
        };
        await v.see("totals", () => v.totals(), after);
        await v.previewSettled("before", { nodes: want.before.nodes + want.mergedNewNodes, edges: 0 });
        await v.previewSettled("after", after);
        await v.unclipped(1440, 900);
        await v.unclipped(1280, 720);
        await v.noSentences();
        await v.done();
        await v.see("graph after Done", () => v.graph(), after);
        if (want.clashedRating !== null) {
            await v.see(
                `rating fused by max on ${want.clashedRating.id}`,
                () =>
                    v.page.evaluate(
                        (id) =>
                            document
                                .querySelector("graphty-element")
                                .session.data.nodes()
                                .find((n) => n.id === id)?.rating,
                        want.clashedRating.id,
                    ),
                want.clashedRating.max,
            );
        }
        const { vendor, plant, sum } = want.orders.firstPair;
        await v.see(
            `amount summed per pair ${vendor} -> ${plant}`,
            () =>
                v.page.evaluate(
                    ([vendorNo, plantName, nodeOf]) => {
                        const s = document.querySelector("graphty-element").session;
                        const from = nodeOf[vendorNo] ?? s.data.nodes().find((n) => n.vendor_no === vendorNo)?.id;
                        return s.data.edges().find((e) => e.source === from && String(e.target).endsWith(plantName))
                            ?.amount;
                    },
                    [vendor, plant, Object.fromEntries(want.vendorNode)],
                ),
            sum,
        );
        await v.sections(["suppliers_a.csv", "suppliers_b.csv", "purchase_orders.csv"], 3);
        await v.shot("done");
    },

    // Cancel discards everything: the graph, the sources and the next opening start as before.
    async cancel(v) {
        const want = expectDoors();
        await v.open();
        await v.openFirst("people.csv", 60);
        await v.addAsRows("buildings.csv", 2);
        await v.openJoin();
        await v.addTable("door_entries.csv");
        await v.addStep("Turn rows into edges");
        await v.page.keyboard.press("Escape");
        await v.ws.waitFor({ state: "detached" });
        await v.see("graph unchanged", () => v.graph(), want.before);
        await v.see("sources unchanged", () => v.sourceCount(), 2);
        await v.openJoin();
        await v.see("reopened empty", () => v.page.locator("[data-step]").count(), 0);
        await v.ws.getByRole("button", { name: "Cancel" }).click();
        await v.ws.waitFor({ state: "detached" });
        await v.see("graph still unchanged", () => v.graph(), want.before);
    },
};

// ------------------------------------------------------------------------------------------------
// The run.
// ------------------------------------------------------------------------------------------------

const LAUNCHERS = {
    chromium: () => chromium.launch({ args: ["--ignore-certificate-errors", "--use-gl=angle"] }),
    webkit: () => webkit.launch(),
};
const wanted = args.only?.split(",");
const names = Object.keys(SCENARIOS).filter((name) => wanted === undefined || wanted.some((w) => name.includes(w)));
const results = [];
for (const browserName of args.browsers.split(",")) {
    const browser = await LAUNCHERS[browserName]();
    for (const name of names) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
        const page = await context.newPage();
        page.setDefaultTimeout(SETTLE);
        const visit = new Visit(page, name, browserName);
        console.log(`${browserName} ${name}`);
        try {
            await SCENARIOS[name](visit);
            await visit.noErrors();
        } catch (error) {
            const where = /join-recipe-dryrun\.mjs:(\d+)/.exec(String(error.stack));
            await visit.is(
                "ran to the end",
                false,
                `${String(error.message).split("\n")[0].slice(0, 300)} (line ${where?.[1] ?? "?"})`,
            );
            await visit.noErrors();
        }
        results.push(...visit.checks.map((check) => ({ ...check, browser: browserName, scenario: name })));
        await context.close();
    }
    await browser.close();
}

const failed = results.filter((each) => !each.ok);
console.log(
    `\n${String(results.length - failed.length)} passed, ${String(failed.length)} failed of ${String(results.length)}`,
);
for (const each of failed) {
    console.log(`FAIL ${each.browser} ${each.scenario}: ${each.name} -- ${each.detail}\n    ${each.shot ?? ""}`);
}
process.exit(failed.length === 0 ? 0 : 1);
