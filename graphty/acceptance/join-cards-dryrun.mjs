#!/usr/bin/env node
/**
 * Dry run of the join workspace's cards (the `join-workspace` feature): one card per join, each
 * asking what every row of its table becomes. Seven stories (door entries as edges and as nodes
 * with edges, account identifiers as lists and as links, a watchlist flag, tumor against normal,
 * two supplier lists, ids translated through a mapping table, and editing joins before and after
 * Done), each from an empty app with every file loaded through Load from URL, driven by real
 * clicks and typing in Chromium and WebKit. It checks what a reader sees -- each card's answer
 * starting unpicked with one "suggested" tag, the live match counts, the card's chips and result
 * counts, the counts outside the workspace staying put until Done -- and after Done the graph,
 * through graphty-element's public API, and one Undo taking it back.
 *
 *   tools/with-browser.sh node graphty/acceptance/join-cards-dryrun.mjs --url <served url>
 *     --data-url <url>     where the data set files are served (people.csv, door_entries.csv, ...)
 *     --only <A1,B>        only these stories
 *     --browsers <list>    chromium,webkit (default both)
 *     --out <dir>          screenshots and results.json (default <main checkout>/tmp/join-cards-v2)
 *
 * Serve a build made with VITE_LOCAL_SAMPLE_DATA=true. Every expected number is worked out here
 * from the files fetched from --data-url, never read from the app. Polling (one animation frame at
 * a time) waits on conditions; SETTLE is only a hang guard. Exit 0 when every check passed.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
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
        "data-url": { type: "string", default: "https://dev.ato.ms:9565/" },
        only: { type: "string" },
        browsers: { type: "string", default: "chromium,webkit" },
        out: { type: "string", default: join(main, "tmp/join-cards-v2") },
    },
});
if (args.url === undefined) {
    console.error("usage: join-cards-dryrun.mjs --url <served url> [--data-url <url>]");
    process.exit(2);
}
const HERE = args.out;
const DATA = args["data-url"];
const SETTLE = 30_000;

// ---------------------------------------------------------------------------------------------
// Data and expectations
// ---------------------------------------------------------------------------------------------

const files = {};
async function fetchText(name) {
    const response = await fetch(DATA + name);
    if (!response.ok) {
        throw new Error(`fetch ${name}: ${response.status}`);
    }
    return response.text();
}
function parseCsv(text) {
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
            } else if (ch === '"') quoted = false;
            else cell += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ",") {
            row.push(cell);
            cell = "";
        } else if (ch === "\n") {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = "";
        } else if (ch !== "\r") cell += ch;
    }
    if (cell !== "" || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }
    const [head, ...body] = rows;
    return body.map((cells) => Object.fromEntries(head.map((c, i) => [c, cells[i] ?? ""])));
}
const csv = (name) => parseCsv(files[name]);
const graphmlIds = (name) => [...files[name].matchAll(/<node id="([^"]+)"/g)].map((m) => m[1]);
const graphmlEdges = (name) => [...files[name].matchAll(/<edge /g)].length;
const distinct = (values) => new Set(values).size;
const loose = (v) => v.toLowerCase().replaceAll(/\s+/g, "");
const nospace = (v) => v.replaceAll(/\s+/g, "");

function expectDoors() {
    const people = csv("people.csv");
    const buildings = csv("buildings.csv");
    const entries = csv("door_entries.csv");
    const personIds = new Set(people.map((p) => p.person_id));
    const buildingIds = new Set(buildings.map((b) => b.id));
    const ids = new Set([...personIds, ...buildingIds]);
    const personMatch = entries.filter((r) => personIds.has(r.person_id)).length;
    const buildingMatch = entries.filter((r) => buildingIds.has(r.building_id)).length;
    const looseB = new Set([...buildingIds].map(loose));
    const buildingLoose = entries.filter((r) => looseB.has(loose(r.building_id))).length - buildingMatch;
    const both = entries.filter((r) => r.person_id !== "" && r.building_id !== "");
    const pairs = new Set(both.map((r) => `${r.person_id}|${r.building_id}`));
    const unknown = new Set(both.flatMap((r) => [r.person_id, r.building_id]).filter((v) => !ids.has(v)));
    const doors = entries.filter((r) => r.door !== "");
    return {
        before: { nodes: people.length + buildings.length, edges: 0 },
        rows: entries.length,
        personMatch,
        buildingMatch,
        buildingLoose,
        edges: { pairs: pairs.size, rows: both.length, newNodes: unknown.size, leftOut: entries.length - both.length },
        rowNodes: {
            // With door added as new from values, every row with a door names something.
            rows: entries.filter((r) => r.door !== "" || personIds.has(r.person_id) || buildingIds.has(r.building_id))
                .length,
            doorNodes: distinct(doors.map((r) => r.door)),
            edges: personMatch + buildingMatch + doors.length,
        },
    };
}

function expectFraud(columns, cap) {
    const accounts = csv("accounts.csv");
    const ids = new Set(accounts.map((a) => a.account_id));
    const rows = csv("account_identifiers.csv");
    const holders = new Map();
    for (const row of rows) {
        if (!ids.has(row.account_id)) continue;
        for (const c of columns) {
            if (row[c] !== "") {
                const key = `${c}|${row[c]}`;
                holders.set(key, (holders.get(key) ?? new Set()).add(row.account_id));
            }
        }
    }
    const used = [...holders].filter(([, s]) => s.size >= 2 && s.size <= cap);
    const pairs = new Set();
    for (const [, s] of used) {
        const list = [...s].sort();
        list.forEach((a, i) => list.slice(i + 1).forEach((b) => pairs.add(`${a}|${b}`)));
    }
    const over = new Set([...holders].filter(([, s]) => s.size > cap).map(([k]) => k));
    const usedKeys = new Set(used.map(([k]) => k));
    // Row fates: a row whose shared values are only over the cap.
    const overCapRows = rows.filter((r) => {
        const keys = columns.filter((c) => r[c] !== "").map((c) => `${c}|${r[c]}`);
        return ids.has(r.account_id) && !keys.some((k) => usedKeys.has(k)) && keys.some((k) => over.has(k));
    }).length;
    return { links: pairs.size, overCapValues: over.size, overCapRows };
}

function expectAccounts() {
    const accounts = csv("accounts.csv");
    const ids = new Set(accounts.map((a) => a.account_id));
    const rows = csv("account_identifiers.csv");
    const matched = rows.filter((r) => ids.has(r.account_id));
    return {
        before: { nodes: accounts.length, edges: 0 },
        rows: rows.length,
        matched: matched.length,
        leftOut: rows.length - matched.length,
        accountsWithRows: distinct(matched.map((r) => r.account_id)),
        cap10: expectFraud(["phone"], 10),
        cap5: expectFraud(["phone"], 5),
    };
}

function expectWatchlist() {
    const accounts = csv("accounts.csv");
    const rows = csv("watchlist.csv");
    const names = new Set(accounts.map((a) => a.name));
    const looseNames = new Map();
    for (const a of accounts) looseNames.set(loose(a.name), [...(looseNames.get(loose(a.name)) ?? []), a.account_id]);
    const exact = rows.filter((r) => names.has(r.value)).length;
    const lrows = rows.filter((r) => looseNames.has(loose(r.value)));
    return {
        before: { nodes: accounts.length, edges: 0 },
        rows: rows.length,
        exact,
        loose: lrows.length,
        marked: distinct(lrows.flatMap((r) => looseNames.get(loose(r.value)))),
    };
}

function expectConditions() {
    const t = new Set(graphmlIds("tumor.graphml"));
    const n = new Set(graphmlIds("normal.graphml"));
    const both = [...t].filter((id) => n.has(id)).length;
    return {
        before: { nodes: t.size, edges: graphmlEdges("tumor.graphml") },
        both,
        onlyTumor: t.size - both,
        onlyNormal: n.size - both,
        union: t.size + n.size - both,
        rows: n.size,
    };
}

function expectSuppliers() {
    const a = csv("suppliers_a.csv");
    const b = csv("suppliers_b.csv");
    const aDuns = new Set(a.map((s) => s.duns));
    const aNoSpace = new Map(a.map((s) => [nospace(s.duns), s]));
    const exact = b.filter((r) => aDuns.has(r.duns)).length;
    const spaced = b.filter((r) => aNoSpace.has(nospace(r.duns))).length;
    // A merged node whose rating and updated differ from its first B row.
    const seen = new Set();
    let probe = null;
    for (const row of b) {
        const key = nospace(row.duns);
        if (seen.has(key)) continue;
        seen.add(key);
        const onto = aNoSpace.get(key);
        if (probe === null && onto !== undefined && onto.rating !== row.rating && onto.updated !== row.updated) {
            probe = { id: onto.id, rating: onto.rating, updated: row.updated };
        }
    }
    return { before: { nodes: a.length, edges: 0 }, rows: b.length, exact, spaced, probe };
}

function expectGenes() {
    const ids = graphmlIds("string_tp53.graphml");
    const idSet = new Set(ids);
    const map = csv("ensembl_to_symbol.csv");
    const mapped = map.filter((r) => idSet.has(r.protein_id));
    const firstSymbol = new Map();
    for (const r of mapped) if (!firstSymbol.has(r.protein_id)) firstSymbol.set(r.protein_id, r.symbol);
    const symbols = new Set(firstSymbol.values());
    const looseSymbols = new Set([...symbols].map((s) => s.toLowerCase()));
    const expr = csv("expression.csv");
    const exact = expr.filter((r) => symbols.has(r.symbol)).length;
    const ci = expr.filter((r) => looseSymbols.has(r.symbol.toLowerCase())).length;
    const tp53Id = [...firstSymbol].find(([, s]) => s === "TP53")?.[0];
    const tp53 = expr.find((r) => r.symbol === "TP53");
    return {
        before: { nodes: ids.length, edges: graphmlEdges("string_tp53.graphml") },
        mapRows: map.length,
        mapMatched: mapped.length,
        exprRows: expr.length,
        exact,
        ci,
        tp53: { id: tp53Id, log2FC: Number(tp53.log2FC) },
    };
}

// ---------------------------------------------------------------------------------------------
// One visit
// ---------------------------------------------------------------------------------------------

const esc = (s) => s.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");

class Visit {
    constructor(page, story, browserName) {
        this.page = page;
        this.story = story;
        this.browser = browserName;
        this.dir = join(HERE, "shots", browserName);
        this.checks = [];
        this.errors = [];
        this.n = 0;
        page.on("pageerror", (e) => this.errors.push(`pageerror: ${e.message}`));
        page.on("console", (m) => m.type() === "error" && this.errors.push(`console: ${m.text().slice(0, 300)}`));
        page.on("response", (r) => r.status() >= 400 && this.errors.push(`http ${r.status()}: ${r.url()}`));
    }

    get ws() {
        return this.page.getByRole("dialog", { name: "Join", exact: true });
    }
    card(n) {
        return this.ws.getByRole("region", { name: new RegExp(`^Join ${n} `) });
    }

    async shot(name) {
        const path = join(this.dir, `${this.story}-${String(++this.n).padStart(2, "0")}-${name}.png`);
        await this.page.screenshot({ path }).catch(() => undefined);
        return path;
    }

    async frame() {
        await this.page.waitForFunction(() => new Promise((done) => requestAnimationFrame(() => done(true))));
    }

    record(name, ok, detail, shot) {
        const check = { story: this.story, browser: this.browser, name, ok, detail, shot };
        this.checks.push(check);
        console.log(`  ${ok ? "pass" : "FAIL"} ${this.browser} ${this.story}: ${name} -- ${detail}`);
        return ok;
    }

    // Polls read() until it equals want (or SETTLE passes).
    async see(name, read, want) {
        const began = Date.now();
        let got;
        for (;;) {
            try {
                got = await read();
            } catch (error) {
                got = `error: ${String(error.message).split("\n")[0]}`;
            }
            if (isDeepStrictEqual(got, want) || Date.now() - began > SETTLE) break;
            await this.frame();
        }
        const ok = isDeepStrictEqual(got, want);
        const shot = ok ? undefined : await this.shot(`fail-${name.replaceAll(/[^a-z0-9]+/gi, "_").slice(0, 40)}`);
        return this.record(
            name,
            ok,
            ok ? JSON.stringify(got) : `want ${JSON.stringify(want)}, saw ${JSON.stringify(got)}`,
            shot,
        );
    }

    async is(name, ok, detail) {
        const shot = ok ? undefined : await this.shot(`fail-${name.replaceAll(/[^a-z0-9]+/gi, "_").slice(0, 40)}`);
        return this.record(name, ok, detail, shot);
    }

    // ---- outside the workspace ----
    graph() {
        return this.page.evaluate(() => {
            const d = document.querySelector("graphty-element:not(.jw-preview graphty-element)")?.session?.data;
            return { nodes: d?.nodes().length ?? -1, edges: d?.edges().length ?? -1 };
        });
    }
    joins() {
        return this.page.evaluate(
            () =>
                document.querySelector("graphty-element:not(.jw-preview graphty-element)")?.session?.data.joins()
                    .length ?? -1,
        );
    }
    nodeRecords(ids) {
        return this.page.evaluate((list) => {
            const d = document.querySelector("graphty-element:not(.jw-preview graphty-element)").session.data;
            return list === null ? d.nodes().map((n) => ({ ...n })) : list.map((id) => ({ ...(d.node(id) ?? {}) }));
        }, ids);
    }
    // What a reader sees outside the workspace: the status bar, the Data sources list, the graph.
    async outside() {
        const status = (
            await this.page.getByRole("contentinfo", { name: "Status" }).getByRole("status").first().innerText()
        ).trim();
        const sources = await this.page
            .getByRole("list", { name: "Data sources" })
            .getByRole("listitem")
            .allInnerTexts();
        return { status, sources: sources.map((s) => s.replaceAll(/\s+/g, " ").trim()), graph: await this.graph() };
    }
    async snapshotOutside() {
        this.outsideBefore = await this.outside();
    }
    async outsideUnchanged(when) {
        const now = await this.outside();
        await this.is(
            `counts outside the workspace unchanged ${when}`,
            isDeepStrictEqual(now, this.outsideBefore),
            JSON.stringify(now),
        );
    }

    // ---- loading ----
    async open() {
        const url = new URL(args.url);
        url.searchParams.set("features", "join-workspace");
        await this.page.goto(url.toString());
        await this.page.getByRole("button", { name: /Open network data/ }).waitFor();
    }
    async typeUrl(file) {
        const box = this.page.getByRole("textbox", { name: "URL" });
        await box.click();
        await box.pressSequentially(DATA + file);
        await this.page.getByRole("button", { name: "Load", exact: true }).click();
    }
    async loadFirst(file, nodes) {
        await this.page.getByRole("button", { name: /Open network data/ }).click();
        await this.page.getByRole("button", { name: /^Load from URL/ }).click();
        await this.typeUrl(file);
        await this.page.waitForFunction(
            (n) => document.querySelector("graphty-element")?.session?.data.nodes().length === n,
            nodes,
        );
        await this.page.getByRole("button", { name: "Add source" }).waitFor();
    }
    async loadMore(file) {
        await this.page.getByRole("button", { name: "Add source" }).click();
        await this.page.getByRole("menuitem", { name: /^Network data/ }).click();
        await this.page.getByRole("combobox", { name: "Kind" }).click();
        await this.page.getByRole("option", { name: "Load from URL" }).click();
        await this.typeUrl(file);
        await this.page.getByRole("region", { name: `Join ${file}` }).waitFor();
    }
    async addAsRows(file, sources) {
        await this.loadMore(file);
        await this.page.getByRole("button", { name: "Add as rows" }).click();
        await this.page.waitForFunction(
            (n) => document.querySelector("graphty-element")?.session?.data.sources().length === n,
            sources,
        );
    }
    async toWorkspace(file) {
        await this.loadMore(file);
        await this.snapshotOutside();
        await this.page.getByRole("button", { name: "Join choices" }).click();
        await this.page.getByRole("menuitem", { name: "Join workspace" }).click();
        await this.ws.waitFor();
    }
    async addTableUrl(file) {
        await this.ws.getByRole("button", { name: "Table", exact: true }).click();
        const box = this.page.getByRole("textbox", { name: "Table URL" });
        await box.click();
        await box.pressSequentially(DATA + file);
        await this.page.getByRole("button", { name: "Load", exact: true }).click();
        await box.waitFor({ state: "hidden" });
    }

    // ---- cards ----
    async addCard() {
        const before = await this.ws.getByRole("region", { name: /^Join \d+ / }).count();
        this.baseDeltas = await this.deltas();
        await this.ws.getByRole("button", { name: /^Join\s*N$/ }).click();
        await this.card(before + 1).waitFor();
        return before + 1;
    }
    async deltas() {
        return this.ws.getByText(/^\+\d+ (nodes|edges)$/).allInnerTexts();
    }
    // The answer group starts empty with one "suggested" tag, and nothing under it previews.
    async unpicked(n, suggested) {
        const card = this.card(n);
        const radios = card.getByRole("radiogroup", { name: "Each row becomes" }).getByRole("radio");
        const checked = (await radios.evaluateAll((els) => els.filter((el) => el.checked))).length;
        const text = await card.innerText();
        const tags = (text.match(/\bsuggested\b/g) ?? []).length;
        const suggestedLabel = await card
            .getByRole("radio", { name: /suggested/ })
            .evaluateAll((els) =>
                els.map((el) =>
                    el
                        .closest(".mantine-Radio-root")
                        ?.querySelector("label")
                        ?.textContent?.replace("suggested", "")
                        .trim(),
                ),
            );
        await this.is(
            `card ${n}: answer unpicked, one suggested`,
            checked === 0 && tags === 1 && (suggested === undefined || suggestedLabel[0] === suggested),
            `checked ${checked}, suggested tags ${tags} on ${JSON.stringify(suggestedLabel)}`,
        );
        const result = await card.getByRole("group", { name: "Result" }).count();
        const matches = (text.match(/\d+ of \d+/g) ?? []).length;
        const deltas = await this.deltas();
        const title = (await card.getByRole("button", { name: /^Collapse / }).getAttribute("aria-label")) ?? "";
        await this.is(
            `card ${n}: nothing previews before the pick`,
            result === 0 && matches === 0 && isDeepStrictEqual(deltas, this.baseDeltas) && title.endsWith("-> ?"),
            `result groups ${result}, match counts ${matches}, header deltas ${JSON.stringify(deltas)} (before + Join ${JSON.stringify(this.baseDeltas)}), title "${title}"`,
        );
    }
    async pick(n, answer) {
        await this.card(n)
            .getByRole("radio", { name: new RegExp(`^${esc(answer)}`) })
            .click();
        await this.card(n)
            .getByRole("group", { name: "Result" })
            .or(
                this.card(n)
                    .getByText(/\d+ of \d+/)
                    .first(),
            )
            .first()
            .waitFor();
    }
    // "N of M" (+loose) for every match row of a card, in order.
    async counts(n) {
        const text = await this.card(n).innerText();
        return [...text.matchAll(/(\d+) of (\d+)(?:\s*\+(\d+))?/g)].map((m) => ({
            of: `${m[1]} of ${m[2]}`,
            loose: m[3] === undefined ? 0 : Number(m[3]),
        }));
    }
    async liveCounts(n, rows) {
        const got = await this.counts(n);
        await this.is(`card ${n}: every match row shows a live count`, got.length === rows, JSON.stringify(got));
    }
    async chips(n) {
        const head = await this.card(n)
            .locator(".jr-sum")
            .innerText()
            .catch(() => "");
        return head.replaceAll(/\s+/g, " ").trim();
    }
    async result(n) {
        const texts = await this.card(n).getByRole("group", { name: "Result" }).getByRole("button").allInnerTexts();
        return texts.map((t) => t.replaceAll(/\s+/g, " ").trim());
    }
    async select(n, label, value, nth = 0) {
        await this.card(n).getByRole("combobox", { name: label, exact: true }).nth(nth).click();
        await this.page
            .getByRole("listbox", { name: label })
            .getByRole("option", { name: new RegExp(`^${esc(value)}( |$)`) })
            .first()
            .click();
        await this.page.getByRole("listbox", { name: label }).waitFor({ state: "hidden" });
    }
    async segment(n, group, label) {
        await this.card(n)
            .getByRole("radiogroup", { name: group, exact: true })
            .getByText(label, { exact: true })
            .click();
    }
    // The columns a card's multi-select (Bring, Shared) holds: its pills.
    async columns(n, group) {
        const root = this.card(n)
            .locator(`input[aria-label="${group}"]`)
            .locator("xpath=ancestor::*[contains(@class,'mantine-MultiSelect-root')][1]");
        return (await root.locator(".mantine-Pill-label").allInnerTexts()).map((t) => t.trim()).sort();
    }
    // Sets a card's multi-select to exactly these columns: opens it and presses each option to change.
    async setChips(n, group, want) {
        const input = this.card(n).locator(`input[aria-label="${group}"]`);
        await input.click();
        const options = this.page.getByRole("option");
        await options.first().waitFor();
        const names = (await options.allInnerTexts()).map((t) => t.trim());
        for (const name of names) {
            const have = (await this.columns(n, group)).includes(name);
            if (have !== want.includes(name)) {
                await this.page.getByRole("option", { name, exact: true }).click();
            }
        }
        await this.page.keyboard.press("Escape");
        await this.see(
            `card ${n}: ${group} holds ${want.join(", ") || "none"}`,
            () => this.columns(n, group),
            [...want].sort(),
        );
    }
    async typeInto(n, label, text) {
        const box = this.card(n).getByRole("textbox", { name: label, exact: true });
        await box.click({ clickCount: 3 });
        await this.page.keyboard.press("Backspace");
        await box.pressSequentially(text);
        // A typed value reaches the recipe on Enter, as one edit.
        await box.press("Enter");
    }
    async toggle(n, label) {
        await this.card(n).getByRole("button", { name: label, exact: true }).click();
    }
    async pressKeyOf(button) {
        const key = await button.getAttribute("aria-keyshortcuts");
        await this.page.keyboard.press(key);
    }
    async done() {
        await this.ws.getByRole("button", { name: /^Done/ }).click();
        await this.ws.waitFor({ state: "detached" });
    }
    async cancel() {
        await this.ws.getByRole("button", { name: /^Cancel/ }).click();
        await this.ws.waitFor({ state: "detached" });
    }
    async projectUndo() {
        await this.page.getByRole("banner", { name: "Project" }).getByRole("button", { name: /^Undo/ }).click();
    }
    async noErrors() {
        await this.is(
            "no page or console errors",
            this.errors.length === 0,
            this.errors.length === 0 ? "none" : this.errors.slice(0, 5).join(" | "),
        );
    }
    // Done gives the graph; one project Undo restores what was before.
    async doneAndUndo(want, joins) {
        await this.done();
        await this.see("graph after Done", () => this.graph(), want);
        if (joins !== undefined) await this.see("joins after Done", () => this.joins(), joins);
        await this.shot("after-done");
        return async () => {
            await this.projectUndo();
            await this.see("one Undo restores the graph", () => this.graph(), this.outsideBefore.graph);
        };
    }
}

// ---------------------------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------------------------

const STORIES = {
    // A1: door entries, one edge card.
    async A1(v) {
        const w = expectDoors();
        await v.loadFirst("people.csv", 60);
        await v.addAsRows("buildings.csv", 2);
        await v.toWorkspace("door_entries.csv");
        const n = await v.addCard();
        await v.shot("card-unpicked");
        await v.unpicked(n, "An edge");
        await v.outsideUnchanged("after + Join");
        await v.pick(n, "An edge");
        await v.liveCounts(n, 2);
        await v.see("ends person_id 222 of 308, building_id 283 of 308 (+loose)", () => v.counts(n), [
            { of: `${w.personMatch} of ${w.rows}`, loose: 0 },
            { of: `${w.buildingMatch} of ${w.rows}`, loose: w.buildingLoose },
        ]);
        await v.see("Per pair: card chips", () => v.chips(n), `+${w.edges.pairs} e +${w.edges.newNodes} n`);
        await v.see("header deltas", () => v.deltas(), [`+${w.edges.newNodes} nodes`, `+${w.edges.pairs} edges`]);
        await v.shot("edge-card");
        await v.outsideUnchanged("after the pick");
        const undo = await v.doneAndUndo(
            { nodes: w.before.nodes + w.edges.newNodes, edges: w.before.edges + w.edges.pairs },
            1,
        );
        await undo();
    },

    // A2: door entries, one node-with-edges card with door as new from values.
    async A2(v) {
        const w = expectDoors();
        await v.loadFirst("people.csv", 60);
        await v.addAsRows("buildings.csv", 2);
        await v.toWorkspace("door_entries.csv");
        const n = await v.addCard();
        await v.unpicked(n, "An edge");
        await v.pick(n, "A node with edges");
        await v.see(
            "row id entry_id",
            () => v.card(n).getByRole("combobox", { name: "Row id" }).inputValue(),
            "entry_id",
        );
        await v.toggle(n, "Column");
        await v.select(n, "Named column", "door", 2);
        await v.select(n, "Named match", "new from values", 2);
        await v.liveCounts(n, 2);
        await v.see(
            "door (new from values) row shows how many nodes it makes",
            async () => /\b\d+ new\b/.exec(await v.card(n).innerText())?.[0] ?? "no count",
            `${w.rowNodes.doorNodes} new`,
        );
        await v.see(
            "card chips: row nodes + door nodes, edges = person + building + door",
            () => v.chips(n),
            `+${w.rowNodes.rows + w.rowNodes.doorNodes} n +${w.rowNodes.edges} e`,
        );
        await v.shot("node-card");
        await v
            .card(n)
            .getByRole("button", { name: /^Collapse / })
            .click();
        const summary = (await v.card(n).innerText()).replaceAll(/\s+/g, " ");
        await v.is(
            "folded summary names the matches and door",
            /person_id/.test(summary) && /door/.test(summary),
            summary.slice(0, 200),
        );
        await v.shot("node-card-folded");
        await v.outsideUnchanged("before Done");
        const undo = await v.doneAndUndo({
            nodes: w.before.nodes + w.rowNodes.rows + w.rowNodes.doorNodes,
            edges: w.rowNodes.edges,
        });
        await undo();
    },

    // B: accounts, identifiers as lists, then links by shared phone with a hub cap.
    async B(v) {
        const w = expectAccounts();
        await v.loadFirst("accounts.csv", w.before.nodes);
        await v.toWorkspace("account_identifiers.csv");
        const n1 = await v.addCard();
        await v.unpicked(n1);
        await v.pick(n1, "Fields on a node");
        await v.select(n1, "Match column", "account_id");
        await v.select(n1, "Match match", "id");
        await v.see(
            "account_id = id: 125 of 130",
            async () => (await v.counts(n1))[0]?.of,
            `${w.matched} of ${w.rows}`,
        );
        await v.setChips(n1, "Bring", ["phone", "device", "email"]);
        await v.segment(n1, "Many rows", "List");
        await v.see("result: 5 left out", async () => (await v.result(n1)).filter((r) => /left out/.test(r)), [
            `${w.leftOut} left out`,
        ]);
        const n2 = await v.addCard();
        await v.select(n2, "From", "account_identifiers");
        await v.unpicked(n2);
        await v.pick(n2, "Links by shared value");
        await v.select(n2, "Match column", "account_id");
        await v.select(n2, "Match match", "id");
        await v.setChips(n2, "Shared", ["phone"]);
        await v.see("hub cap 10: links", () => v.chips(n2), `+${w.cap10.links} e`);
        await v.shot("links-cap10");
        await v.typeInto(n2, "Hub cap", "5");
        await v.see("hub cap 5: links", () => v.chips(n2), `+${w.cap5.links} e`);
        await v.see("hub cap 5: over cap chip", async () => (await v.result(n2)).filter((r) => /over cap/.test(r)), [
            `${w.cap5.overCapRows} over cap`,
        ]);
        await v.shot("links-cap5");
        await v.outsideUnchanged("before Done");
        const undo = await v.doneAndUndo({ nodes: w.before.nodes, edges: w.cap5.links }, 2);
        const nodes = await v.nodeRecords(null);
        const withValues = nodes.filter((r) =>
            ["phone", "device", "email"].some((c) => r[c] !== undefined && r[c] !== null && r[c] !== ""),
        );
        const lists = withValues.filter((r) => ["phone", "device", "email"].some((c) => Array.isArray(r[c]))).length;
        const sample = nodes
            .filter((r) => r.id === "AC1003" || r.id === "AC1001")
            .map((r) => ({ id: r.id, phone: r.phone, device: r.device, email: r.email }));
        await v.is(
            "every matched account gets phone / device / email as lists (Many rows List)",
            withValues.length === w.accountsWithRows && lists === w.accountsWithRows,
            `want ${w.accountsWithRows} accounts with list values; saw ${withValues.length} with values, ${lists} holding a list; sample ${JSON.stringify(sample)}`,
        );
        const phones = withValues.flatMap((r) => (Array.isArray(r.phone) ? r.phone : [r.phone]));
        const plus = csv("account_identifiers.csv").filter((r) => r.phone.startsWith("+")).length;
        await v.is(
            "a plus-signed phone stays text",
            plus === 0 || phones.some((p) => typeof p === "string" && p.startsWith("+")),
            `sample ${JSON.stringify(phones.slice(0, 3))}`,
        );
        await undo();
    },

    // C: watchlist marks on accounts, matched on name ignoring case and spaces.
    async C(v) {
        const w = expectWatchlist();
        await v.loadFirst("accounts.csv", w.before.nodes);
        await v.toWorkspace("watchlist.csv");
        const n = await v.addCard();
        await v.unpicked(n);
        await v.pick(n, "Fields on a node");
        await v.select(n, "Match column", "value");
        await v.select(n, "Match match", "name");
        await v.see("value = name exact", async () => (await v.counts(n))[0]?.of, `${w.exact} of ${w.rows}`);
        await v.toggle(n, "Ignore case");
        await v.toggle(n, "Ignore spaces");
        await v.see("ignoring case and spaces", async () => (await v.counts(n))[0]?.of, `${w.loose} of ${w.rows}`);
        await v.setChips(n, "Bring", []);
        await v.typeInto(n, "Mark", "on_watchlist");
        await v.shot("watchlist-card");
        await v.outsideUnchanged("before Done");
        const undo = await v.doneAndUndo({ nodes: w.before.nodes, edges: 0 }, 1);
        const marked = (await v.nodeRecords(null)).filter((r) => r.on_watchlist === true).length;
        await v.is("nodes marked on_watchlist true", marked === w.marked, `want ${w.marked}, saw ${marked}`);
        await undo();
    },

    // D: tumor vs normal, merged with source recorded.
    async D(v) {
        const w = expectConditions();
        await v.loadFirst("tumor.graphml", w.before.nodes);
        await v.toWorkspace("normal.graphml");
        const n = await v.addCard();
        await v.unpicked(n);
        await v.pick(n, "Fields on a node");
        await v.select(n, "Match column", "id");
        await v.select(n, "Match match", "id");
        await v.segment(n, "No match", "Add");
        await v.segment(n, "Record source", "Record source");
        const venn = new RegExp(`${w.both}.*both|both.*${w.both}`);
        await v.see(
            "membership: both / only tumor / only normal",
            async () => {
                const t = (await v.card(n).innerText()).replaceAll(/\s+/g, " ");
                return venn.test(t) && t.includes(String(w.onlyTumor)) && t.includes(String(w.onlyNormal));
            },
            true,
        );
        await v.see("header +nodes", () => v.deltas(), [`+${w.onlyNormal} nodes`]);
        await v.shot("compare-card");
        await v.outsideUnchanged("before Done");
        const undo = await v.doneAndUndo({ nodes: w.union, edges: w.before.edges }, 1);
        const nodes = await v.nodeRecords(null);
        const withMembership = nodes.filter(
            (r) => r.membership !== undefined && r.membership !== null && r.membership !== "",
        ).length;
        await v.is("membership on every node", withMembership === w.union, `want ${w.union}, saw ${withMembership}`);
        await undo();
    },

    // E: two supplier lists merged on duns, clash rules.
    async E(v) {
        const w = expectSuppliers();
        await v.loadFirst("suppliers_a.csv", w.before.nodes);
        await v.toWorkspace("suppliers_b.csv");
        const n = await v.addCard();
        await v.unpicked(n);
        await v.pick(n, "Fields on a node");
        await v.select(n, "Match column", "duns");
        await v.select(n, "Match match", "duns");
        await v.see("duns = duns exact", async () => (await v.counts(n))[0]?.of, `${w.exact} of ${w.rows}`);
        await v.toggle(n, "Ignore spaces");
        await v.see("ignoring spaces", async () => (await v.counts(n))[0]?.of, `${w.spaced} of ${w.rows}`);
        await v.segment(n, "No match", "Add");
        await v.segment(n, "Record source", "Record source");
        const clashRows = () =>
            v
                .card(n)
                .getByRole("radiogroup", { name: /^Clash / })
                .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")).sort());
        const listed = await v.see("clash rules listed for city, rating, updated", clashRows, [
            "Clash city",
            "Clash rating",
            "Clash updated",
        ]);
        if (!listed) {
            await v.segment(n, "Record source", "No source");
            await v.see("clash rules listed with No source (diagnostic)", clashRows, [
                "Clash city",
                "Clash rating",
                "Clash updated",
            ]);
            await v.segment(n, "Record source", "Record source");
        }
        if ((await v.card(n).getByRole("radiogroup", { name: "Clash rating" }).count()) > 0) {
            await v.segment(n, "Clash rating", "Keep");
            await v.segment(n, "Clash updated", "New");
        }
        await v.shot("suppliers-card");
        await v.outsideUnchanged("before Done");
        await v.done();
        await v.see("joins after Done", () => v.joins(), 1);
        const [probe] = await v.nodeRecords([w.probe.id]);
        await v.is(
            `merged node ${w.probe.id}: rating kept, updated taken new`,
            String(probe.rating) === w.probe.rating && String(probe.updated) === w.probe.updated,
            `want rating ${w.probe.rating} updated ${w.probe.updated}, saw rating ${JSON.stringify(probe.rating)} updated ${JSON.stringify(probe.updated)}`,
        );
        await v.shot("after-done");
        await v.projectUndo();
        await v.see("one Undo restores the graph", () => v.graph(), v.outsideBefore.graph);
    },

    // F: ids translated through a mapping table, then expression on the symbols.
    async F(v) {
        const w = expectGenes();
        await v.loadFirst("string_tp53.graphml", w.before.nodes);
        await v.toWorkspace("ensembl_to_symbol.csv");
        await v.addTableUrl("expression.csv");
        await v.see("header counts 2 tables", () => v.ws.getByText(/^\d+ tables?$/).innerText(), "2 tables");
        const n1 = await v.addCard();
        await v.unpicked(n1);
        await v.pick(n1, "Fields on a node");
        await v.select(n1, "From", "ensembl_to_symbol");
        await v.select(n1, "Match column", "protein_id");
        await v.select(n1, "Match match", "id");
        await v.see("protein_id = id", async () => (await v.counts(n1))[0]?.of, `${w.mapMatched} of ${w.mapRows}`);
        await v.setChips(n1, "Bring", ["symbol"]);
        const n2 = await v.addCard();
        await v.select(n2, "From", "expression");
        await v.unpicked(n2);
        await v.pick(n2, "Fields on a node");
        await v.select(n2, "Match column", "symbol");
        await v.select(n2, "Match match", "symbol");
        await v.see("symbol = symbol", async () => (await v.counts(n2))[0]?.of, `${w.exact} of ${w.exprRows}`);
        await v.toggle(n2, "Ignore case");
        await v.see("ignoring case", async () => (await v.counts(n2))[0]?.of, `${w.ci} of ${w.exprRows}`);
        await v.setChips(n2, "Bring", ["log2FC", "padj"]);
        await v.shot("expression-cards");
        await v.outsideUnchanged("before Done");
        const undo = await v.doneAndUndo({ nodes: w.before.nodes, edges: w.before.edges }, 2);
        const [tp53] = await v.nodeRecords([w.tp53.id]);
        await v.is(
            "TP53 log2FC after Done",
            Number(tp53.log2FC) === w.tp53.log2FC,
            `want ${w.tp53.log2FC}, saw ${JSON.stringify(tp53.log2FC)}`,
        );
        await undo();
    },

    // G: several cards; remove, undo, redo; Cancel; edit; Done; Undo; reopen.
    async G(v) {
        const w = expectDoors();
        await v.loadFirst("people.csv", 60);
        await v.addAsRows("buildings.csv", 2);
        await v.toWorkspace("door_entries.csv");
        const n1 = await v.addCard();
        await v.pick(n1, "An edge");
        const n2 = await v.addCard();
        await v.select(n2, "From", "door_entries");
        await v.unpicked(n2);
        await v.pick(n2, "A node with edges");
        const n3 = await v.addCard();
        await v.select(n3, "From", "door_entries");
        await v.unpicked(n3);
        await v.pick(n3, "Fields on a node");
        await v.shot("three-cards");
        const cards = () => v.ws.getByRole("region", { name: /^Join \d+ / }).count();
        await v.see("three cards", cards, 3);
        await v
            .card(n2)
            .getByRole("button", { name: /^Delete / })
            .click();
        await v.see("middle removed", async () => [await cards(), (await v.card(2).getAttribute("aria-label")) ?? ""], [
            2,
            "Join 2 door_entries -> fields",
        ]);
        await v.ws.getByRole("button", { name: /^Undo/ }).click();
        await v.see(
            "Undo brings it back",
            async () => [await cards(), (await v.card(2).getAttribute("aria-label")) ?? ""],
            [3, "Join 2 door_entries -> nodes"],
        );
        await v.ws.getByRole("button", { name: /^Redo/ }).click();
        await v.see("Redo removes it", cards, 2);
        await v.shot("after-redo");
        await v.outsideUnchanged("before Cancel");
        await v.cancel();
        await v.see("Cancel: graph unchanged", () => v.graph(), v.outsideBefore.graph);
        await v.see("Cancel: no joins", () => v.joins(), 0);
        await v.outsideUnchanged("after Cancel");

        // Again: edit an edge card (Per row, then back to Per pair), a Fields card, Done.
        await v.toWorkspace("door_entries.csv");
        const e = await v.addCard();
        await v.pick(e, "An edge");
        await v.segment(e, "Edges", "Per row");
        await v.see("edit: Per row edges", () => v.chips(e), `+${w.edges.rows} e +${w.edges.newNodes} n`);
        await v.segment(e, "Edges", "Per pair");
        await v.see("edit: back to Per pair", () => v.chips(e), `+${w.edges.pairs} e +${w.edges.newNodes} n`);
        const f = await v.addCard();
        await v.select(f, "From", "door_entries");
        await v.pick(f, "Fields on a node");
        await v.shot("two-cards");
        await v.outsideUnchanged("before Done");
        await v.done();
        await v.see("Done: 2 joins", () => v.joins(), 2);
        await v.see("Done: edges", async () => (await v.graph()).edges, w.edges.pairs);
        await v.shot("after-done");
        await v.projectUndo();
        await v.see("one Undo takes both joins back", async () => [await v.joins(), (await v.graph()).edges], [0, 0]);
        await v.page.getByRole("banner", { name: "Project" }).getByRole("button", { name: /^Redo/ }).click();
        await v.see("Redo puts them back", () => v.joins(), 2);
        // Reopen committed joins as cards (Join + in Data).
        const joinPlus = v.page.locator(".jw-row").getByRole("button", { name: "Join", exact: true });
        if ((await joinPlus.count()) === 0) {
            await v.is(
                "reopen: Join + in Data opens the committed joins as cards",
                false,
                "no Join + control in the Data place (reopening not built)",
            );
        } else {
            await joinPlus.click();
            await v.ws.waitFor();
            await v.see(
                "reopen: 2 folded cards",
                async () => [await cards(), await v.ws.getByRole("button", { name: /^Expand / }).count()],
                [2, 2],
            );
            await v.shot("reopened");
            // Edit after Done: Per row, Done, then one Undo back to Per pair.
            await v
                .card(1)
                .getByRole("button", { name: /^Expand / })
                .click();
            await v.segment(1, "Edges", "Per row");
            await v.see("reopen: Per row edges", () => v.chips(1), `+${w.edges.rows} e +${w.edges.newNodes} n`);
            await v.done();
            await v.see("reopen: Done joins it again", async () => [await v.joins(), (await v.graph()).edges], [
                2,
                w.edges.rows,
            ]);
            await v.projectUndo();
            await v.see("reopen: one Undo back to Per pair", async () => (await v.graph()).edges, w.edges.pairs);
            // Remove a reopened card: Done takes its join and its edges back.
            await joinPlus.click();
            await v.ws.waitFor();
            await v.see("reopen again: 2 cards", cards, 2);
            await v
                .card(1)
                .getByRole("button", { name: /^Delete / })
                .click();
            await v.done();
            await v.see(
                "removed card: its join and edges gone",
                async () => [await v.joins(), (await v.graph()).edges],
                [1, 0],
            );
        }
    },
};

// ---------------------------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------------------------

for (const name of [
    "people.csv",
    "buildings.csv",
    "door_entries.csv",
    "accounts.csv",
    "account_identifiers.csv",
    "watchlist.csv",
    "tumor.graphml",
    "normal.graphml",
    "suppliers_a.csv",
    "suppliers_b.csv",
    "string_tp53.graphml",
    "ensembl_to_symbol.csv",
    "expression.csv",
]) {
    files[name] = await fetchText(name);
}

const only = args.only?.split(",");
const all = [];
for (const browserName of args.browsers.split(",")) {
    mkdirSync(join(HERE, "shots", browserName), { recursive: true });
    const browser = await (browserName === "webkit" ? webkit : chromium).launch();
    for (const [story, play] of Object.entries(STORIES)) {
        if (only !== undefined && !only.includes(story)) continue;
        console.log(`== ${browserName} ${story}`);
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
        const page = await context.newPage();
        page.setDefaultTimeout(SETTLE);
        const v = new Visit(page, story, browserName);
        try {
            await v.open();
            await play(v);
        } catch (error) {
            const shot = await v.shot("crash");
            v.record("story ran to the end", false, String(error.message).split("\n").slice(0, 3).join(" "), shot);
        }
        await v.noErrors();
        all.push(...v.checks);
        await context.close();
    }
    await browser.close();
}
writeFileSync(join(HERE, "results.json"), JSON.stringify(all, null, 2));
const failed = all.filter((c) => !c.ok);
console.log(`\n${all.length - failed.length} passed, ${failed.length} failed`);
for (const c of failed) console.log(`FAIL ${c.browser} ${c.story}: ${c.name} -- ${c.detail} ${c.shot ?? ""}`);
process.exit(failed.length === 0 ? 0 : 1);
