#!/usr/bin/env node
/**
 * Dry run of the join workspace's model canvas build (the `join-workspace` feature): it drives a
 * served build with real clicks, pointer drags, keys and file choices, in Chromium and in WebKit, and
 * checks what a reader sees (the Join row, the tile menu, the counts in the bar, Before and After,
 * the rows table and its fates, the graph and the Data panel after Done) against numbers worked out
 * here from the data files themselves, never read from the app.
 *
 *   tools/with-browser.sh node graphty/acceptance/join-canvas-dryrun.mjs --url <served url>
 *     --browsers <list>    chromium,webkit (default both)
 *     --only <text,text>   only the scenarios whose id holds one of these
 *     --data <dir>         the join data sets (default: the main checkout's tmp/join-builds/datasets)
 *     --out <dir>          screenshots and report.json (default: tmp/join-canvas-dryrun)
 *
 * Each scenario starts on the start page and loads its files through the app's own file inputs
 * (Open a file, Add source, Table). Checks read the element's public session API for the graph
 * and the preview's graph, and the page for everything else. Exit 0 when every check passed, 1 when
 * one failed.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

import { chromium, webkit } from "playwright";

const main = dirname(
    execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" }).trim(),
);
const { values: args } = parseArgs({
    options: {
        url: { type: "string" },
        browsers: { type: "string", default: "chromium,webkit" },
        only: { type: "string" },
        data: { type: "string", default: join(main, "tmp/join-builds/datasets") },
        out: { type: "string", default: join(main, "tmp/join-canvas-dryrun") },
    },
});
if (args.url === undefined) {
    console.error("--url <served url> is required");
    process.exit(2);
}
mkdirSync(args.out, { recursive: true });

// How long a reader's view may take to reach what is expected: a hang guard, never a wait.
const SETTLE = 30_000;
const SIZES = [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
];

// ---------------------------------------------------------------------------------------------
// What each join should do, worked out from the files.

/**
 * Reads a CSV file of the data sets.
 * @param {string} name - the file.
 * @returns {Record<string, string>[]} its rows.
 */
function csv(name) {
    const text = readFileSync(join(args.data, name), "utf8").trim();
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let at = 0; at < text.length; at++) {
        const c = text[at];
        if (quoted) {
            if (c === '"' && text[at + 1] === '"') {
                cell += '"';
                at++;
            } else if (c === '"') {
                quoted = false;
            } else {
                cell += c;
            }
        } else if (c === '"') {
            quoted = true;
        } else if (c === ",") {
            row.push(cell);
            cell = "";
        } else if (c === "\n") {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = "";
        } else if (c !== "\r") {
            cell += c;
        }
    }
    row.push(cell);
    rows.push(row);
    const [head, ...body] = rows;
    return body.map((r) => Object.fromEntries(head.map((key, i) => [key, r[i] ?? ""])));
}

/**
 * Reads a GraphML file's node ids and edge count.
 * @param {string} name - the file.
 * @returns {{ nodes: string[], edges: number }} what it holds.
 */
function graphml(name) {
    const text = readFileSync(join(args.data, name), "utf8");
    return {
        nodes: [...text.matchAll(/<node id="([^"]*)"/g)].map((m) => m[1]),
        edges: [...text.matchAll(/<edge /g)].length,
    };
}

const lower = (s) => s.toLowerCase();
const noSpace = (s) => s.replaceAll(/\s+/g, "");

// An edges join: each row names two ends; an end the graph lacks becomes a node, a pair already
// made is a repeat.
function edgesJoin(rows, a, b, norm = (s) => s) {
    const pairs = new Set();
    const made = new Set();
    const fates = { joined: 0, "new end": 0, repeat: 0, "left out": 0 };
    for (const row of rows) {
        const va = row[a.column];
        const vb = row[b.column];
        if (va === "" || vb === "") {
            fates["left out"]++;
            continue;
        }
        const ea = a.find(norm(va));
        const eb = b.find(norm(vb));
        const ka = ea ?? `new:${norm(va)}`;
        const kb = eb ?? `new:${norm(vb)}`;
        if (pairs.has(`${ka}|${kb}`)) {
            fates.repeat++;
            continue;
        }
        pairs.add(`${ka}|${kb}`);
        if (ea === undefined) made.add(ka);
        if (eb === undefined) made.add(kb);
        fates[ea === undefined || eb === undefined ? "new end" : "joined"]++;
    }
    return { ...fates, nodes: made.size, edges: pairs.size };
}

const EXPECT = {
    doors(norm) {
        const people = csv("people.csv");
        const buildings = csv("buildings.csv");
        const badge = new Map(people.map((p) => [norm(p.badge_id), `p:${p.person_id}`]));
        const ids = new Map([
            ...people.map((p) => [norm(p.person_id), `p:${p.person_id}`]),
            ...buildings.map((b) => [norm(b.id), `b:${b.id}`]),
        ]);
        return edgesJoin(
            csv("door_entries.csv"),
            { column: "badge_id", find: (v) => badge.get(v) },
            { column: "building_id", find: (v) => ids.get(v) },
            norm,
        );
    },
    split() {
        const tags = new Set();
        let pairs = 0;
        let blank = 0;
        for (const person of csv("people.csv")) {
            const each = new Set(person.tags.split(";").filter(Boolean));
            if (each.size === 0) blank++;
            pairs += each.size;
            each.forEach((tag) => tags.add(tag));
        }
        return { "new end": pairs, "left out": blank, nodes: tags.size, edges: pairs };
    },
    link(cap) {
        const accounts = new Set(csv("accounts.csv").map((a) => a.account_id));
        const rows = csv("account_identifiers.csv");
        const columns = ["phone", "device", "email"];
        const holders = new Map();
        for (const row of rows) {
            if (!accounts.has(row.account_id)) continue;
            for (const column of columns) {
                if (row[column] === "") continue;
                const key = `${column}\u0000${row[column]}`;
                holders.set(key, (holders.get(key) ?? new Set()).add(row.account_id));
            }
        }
        const shared = [...holders].filter(([, set]) => set.size >= 2 && set.size <= cap);
        const over = new Set([...holders].filter(([, set]) => set.size > cap).map(([key]) => key));
        const sharedKeys = new Set(shared.map(([key]) => key));
        const pairs = new Set();
        for (const [, set] of shared) {
            const list = [...set].sort();
            list.forEach((x, i) => list.slice(i + 1).forEach((y) => pairs.add(`${x}|${y}`)));
        }
        const fates = { linked: 0, "over cap": 0, "left out": 0 };
        for (const row of rows) {
            const keys = columns.map((column) => `${column}\u0000${row[column]}`);
            if (!accounts.has(row.account_id)) fates["left out"]++;
            else if (keys.some((key) => sharedKeys.has(key))) fates.linked++;
            else if (keys.some((key) => over.has(key))) fates["over cap"]++;
            else fates["left out"]++;
        }
        const phones = shared.filter(([key]) => key.startsWith("phone\u0000")).map(([key]) => key.split("\u0000")[1]);
        return {
            ...fates,
            edges: pairs.size,
            "hub values": over.size,
            valueNodes: shared.length,
            valueEdges: shared.reduce((n, [, set]) => n + set.size, 0),
            flagged: csv("watchlist.csv").filter((w) => phones.includes(w.value)).length,
            watchlist: csv("watchlist.csv").length,
            accounts: accounts.size,
        };
    },
    genes(norm) {
        const network = new Set(graphml("string_tp53.graphml").nodes);
        const bySymbol = new Map();
        for (const m of csv("ensembl_to_symbol.csv")) {
            bySymbol.set(norm(m.symbol), [...(bySymbol.get(norm(m.symbol)) ?? []), m.protein_id]);
        }
        const fates = { joined: 0, repeat: 0, "left out": 0 };
        const unmapped = new Set();
        const hit = new Map();
        for (const row of csv("expression.csv")) {
            const proteins = bySymbol.get(norm(row.symbol));
            if (proteins === undefined) {
                fates["left out"]++;
                unmapped.add(norm(row.symbol));
            } else if (!network.has(proteins[0])) {
                fates["left out"]++;
            } else if (hit.has(proteins[0])) {
                fates.repeat++;
            } else {
                hit.set(proteins[0], Number(row.log2FC));
                fates.joined++;
            }
        }
        return { ...fates, unmapped: unmapped.size, updated: fates.joined, hit, nodes: network.size };
    },
    compare() {
        const tumor = new Set(graphml("tumor.graphml").nodes);
        const normal = new Set(graphml("normal.graphml").nodes);
        return {
            both: [...normal].filter((id) => tumor.has(id)).length,
            onlyOnto: [...tumor].filter((id) => !normal.has(id)).length,
            onlyFrom: [...normal].filter((id) => !tumor.has(id)).length,
            tumor: tumor.size,
        };
    },
    merge(norm) {
        const a = csv("suppliers_a.csv");
        const byDuns = new Map(a.map((row) => [norm(row.duns), row]));
        const hit = new Map();
        const fates = { merged: 0, "new end": 0, repeat: 0 };
        const clashes = { city: 0, rating: 0, updated: 0 };
        for (const b of csv("suppliers_b.csv")) {
            const onto = byDuns.get(norm(b.duns));
            if (onto === undefined) {
                fates["new end"]++;
            } else if (hit.has(onto.id)) {
                fates.repeat++;
            } else {
                hit.set(onto.id, Math.max(Number(onto.rating), Number(b.rating)));
                fates.merged++;
                for (const column of Object.keys(clashes)) if (onto[column] !== b[column]) clashes[column]++;
            }
        }
        return { ...fates, nodes: fates["new end"], clashes, maxRating: hit, a: a.length };
    },
    orders(vendorsInGraph) {
        const orders = csv("purchase_orders.csv");
        const plants = new Set(orders.map((o) => o.plant));
        const unknown = new Set(orders.map((o) => o.vendor_no).filter((v) => !vendorsInGraph.has(v)));
        const pairs = new Set(orders.map((o) => `${o.vendor_no}|${o.plant}`));
        return {
            nodes: plants.size + unknown.size,
            edges: pairs.size,
            repeat: orders.length - pairs.size,
            rows: orders.length,
            plants: plants.size,
            unknown,
        };
    },
};

// ---------------------------------------------------------------------------------------------
// The reader's hands and eyes.

const results = [];
let scenarioShots = 0;

class Visit {
    constructor(browserName, scenario, page) {
        this.browser = browserName;
        this.scenario = scenario;
        this.page = page;
        this.errors = [];
        this.requests = [];
        page.on("pageerror", (error) => this.errors.push(`pageerror: ${error.message}`));
        page.on("response", (response) => {
            if (response.status() >= 400) this.requests.push(`HTTP ${response.status()} ${response.url()}`);
        });
        page.on("console", (message) => {
            if (message.type() === "error") this.errors.push(`console: ${message.text().slice(0, 300)}`);
        });
    }

    get dialog() {
        return this.page.getByRole("dialog", { name: "Join" });
    }

    get dataPlace() {
        return this.page.getByRole("region", { name: "Data place" });
    }

    async shot(name) {
        const path = join(
            args.out,
            `${this.browser}-${this.scenario}-${String(++scenarioShots).padStart(3, "0")}-${name}.png`,
        );
        await this.page.screenshot({ path });
        return path;
    }

    record(item, status, evidence, shot) {
        results.push({ build: "canvas", browser: this.browser, scenario: this.scenario, item, status, evidence, shot });
        console.log(
            `${status === "pass" ? "PASS" : "FAIL"} [${this.browser}] ${this.scenario}: ${item} -- ${evidence}`,
        );
    }

    // A check: retried until it passes (or the hang guard ends it), then recorded.
    async check(item, fn) {
        const start = Date.now();
        let last;
        for (;;) {
            try {
                const evidence = await fn();
                this.record(item, "pass", evidence ?? "ok");
                return true;
            } catch (error) {
                last = error;
            }
            if (Date.now() - start > SETTLE) break;
            await this.page.waitForTimeout(250);
        }
        this.record(item, "fail", String(last?.message ?? last).slice(0, 600), await this.shot("fail"));
        return false;
    }

    async open() {
        const url = new URL(args.url);
        const features = new Set((url.searchParams.get("features") ?? "").split(",").filter(Boolean));
        features.add("join-workspace");
        features.add("selection-workspace");
        url.searchParams.set("features", [...features].join(","));
        await this.page.goto(url.toString());
        await this.page.getByRole("button", { name: /Open a file/ }).waitFor();
    }

    async choose(control, file) {
        const [chooser] = await Promise.all([this.page.waitForEvent("filechooser"), control.click()]);
        await chooser.setFiles(join(args.data, file));
    }

    async openFirst(file) {
        await this.choose(this.page.getByRole("button", { name: /Open a file/ }), file);
        await this.until(async () => (await this.graph()).nodes > 0);
        await this.page.getByRole("button", { name: "Data", exact: true }).click();
        await this.dataPlace.waitFor();
    }

    async addSource(file) {
        await this.dataPlace.getByRole("button", { name: "Add source" }).click();
        await this.choose(this.page.getByRole("menuitem", { name: /^File/ }), file);
    }

    async addAsRows(file) {
        const before = await this.sourceCount();
        await this.addSource(file);
        await this.page.getByRole("button", { name: "Add as rows" }).click();
        await this.until(async () => (await this.sourceCount()) > before);
    }

    async toWorkspace(file) {
        await this.addSource(file);
        await this.page.getByRole("button", { name: "Join choices" }).click();
        await this.page.getByRole("menuitem", { name: "Join workspace" }).click();
        await this.dialog.waitFor();
        await this.box(file).waitFor();
    }

    async addTable(file) {
        await this.choose(this.dialog.getByRole("button", { name: "Table", exact: true }), file);
        await this.box(file).waitFor();
    }

    box(name) {
        return this.dialog.getByRole("group", { name, exact: true });
    }

    column(box, column) {
        return this.dialog.getByLabel(`${box} ${column}`, { exact: true });
    }

    // A real pointer drag, in small moves, from one element to another (or to a point).
    async drag(from, to) {
        await from.scrollIntoViewIfNeeded();
        const a = await from.boundingBox();
        const b = to.x === undefined ? await to.boundingBox() : null;
        const sx = a.x + Math.min(30, a.width / 2);
        const sy = a.y + a.height / 2;
        const tx = b ? b.x + b.width / 2 : to.x;
        const ty = b ? b.y + b.height / 2 : to.y;
        await this.page.mouse.move(sx, sy);
        await this.page.mouse.down();
        for (let i = 1; i <= 12; i++) await this.page.mouse.move(sx + ((tx - sx) * i) / 12, sy + ((ty - sy) * i) / 12);
        await this.page.mouse.up();
    }

    get menu() {
        return this.page.getByRole("menu", { name: "Join kind" });
    }

    async dragColumns(fromBox, fromColumn, toBox, toColumn) {
        await this.drag(this.column(fromBox, fromColumn), this.column(toBox, toColumn));
        await this.menu.waitFor();
    }

    async tile(name) {
        const before = await this.tabs().count();
        await this.menu.getByRole("menuitem", { name: new RegExp(`^${name}`) }).click();
        await this.menu.waitFor({ state: "detached" });
        await this.until(async () => (await this.tabs().count()) > before);
    }

    tabs() {
        return this.dialog.getByRole("tablist", { name: "Recipe" }).getByRole("tab");
    }

    async tabNames() {
        return (await this.tabs().allInnerTexts()).map((t) => t.replaceAll(/\s+/g, " ").trim());
    }

    // The shown join's counts, as the bar's Counts row shows them: { "joined": 98, "nodes": 27, ... }.
    async counts() {
        const text = (await this.dialog.getByRole("group", { name: "Counts", exact: true }).innerText()).replaceAll(
            /\s+/g,
            " ",
        );
        const found = {};
        for (const m of text.matchAll(
            /(\+?\d[\d,]*) (joined|merged|linked|new end|repeat|over cap|left out|nodes|edges|updated|unmapped|hub values)\b/g,
        )) {
            found[m[2]] = Number(m[1].replaceAll(/[+,]/g, ""));
        }
        found.text = text;
        return found;
    }

    // Throws unless every expected count is shown, and no other row fate.
    async countsAre(expected) {
        const got = await this.counts();
        const fates = ["joined", "merged", "linked", "new end", "repeat", "over cap", "left out"];
        const wrong = Object.entries(expected).filter(([key, value]) => (got[key] ?? 0) !== value);
        const extra = fates.filter((fate) => !(fate in expected) && (got[fate] ?? 0) !== 0);
        if (wrong.length > 0 || extra.length > 0) {
            throw new Error(
                `expected ${JSON.stringify(expected)}, the bar shows "${got.text}"` +
                    (extra.length > 0 ? ` (unexpected ${extra.join(", ")})` : ""),
            );
        }
        return got.text;
    }

    async hint(label) {
        const button = this.dialog.getByRole("button", { name: new RegExp(`^${label} \\+`) });
        if ((await button.count()) === 0) return 0;
        return Number((await button.getAttribute("aria-label")).split("+")[1]);
    }

    async graph() {
        return this.page.evaluate(() => {
            const element = [...document.querySelectorAll("graphty-element")].find(
                (each) => each.closest(".jw-modal") === null,
            );
            const data = element?.session?.data;
            return data === undefined
                ? { nodes: -1, edges: -1, sources: -1 }
                : { nodes: data.nodes().length, edges: data.edges().length, sources: data.sources().length };
        });
    }

    async graphNodes() {
        return this.page.evaluate(() => {
            const element = [...document.querySelectorAll("graphty-element")].find(
                (each) => each.closest(".jw-modal") === null,
            );
            return element.session.data.nodes().map((node) => ({ ...node }));
        });
    }

    async preview() {
        return this.page.evaluate(() => {
            const data = document.querySelector('graphty-element[aria-label="Join preview"]')?.session?.data;
            return data === undefined
                ? { nodes: -1, edges: -1 }
                : { nodes: data.nodes().length, edges: data.edges().length };
        });
    }

    async sourceCount() {
        return this.dataPlace.getByRole("list", { name: "Data sources" }).getByRole("listitem").count();
    }

    async rowsRange() {
        return (await this.dialog.locator(".jw-rows-range").innerText()).trim();
    }

    // The Fate cell of every row the rows table draws.
    async fates() {
        const rows = this.dialog.getByRole("grid", { name: "Rows" }).getByRole("row");
        const texts = await rows.evaluateAll((all) =>
            all
                .slice(1)
                .map((row) => row.querySelector('[role="gridcell"], [role="rowheader"]')?.textContent?.trim() ?? ""),
        );
        return texts;
    }

    // The cells of one column of the rows table, for the rows it draws.
    async cells(column) {
        const grid = this.dialog.getByRole("grid", { name: "Rows" });
        return grid.evaluate((table, name) => {
            const rows = [...table.querySelectorAll('[role="row"]')];
            const head = [...rows[0].children].map((cell) => cell.textContent.trim());
            const at = head.indexOf(name);
            return rows.slice(1).map((row) => row.children[at]?.textContent.trim() ?? "");
        }, column);
    }

    async side(which) {
        await this.dialog.getByRole("radiogroup", { name: "Preview" }).getByText(which, { exact: true }).click();
    }

    // Presses a key; "Mod" is the platform's, as the app shows it on its buttons (Cmd where the
    // browser says it is a Mac, as Playwright's WebKit does on every system).
    async key(chord) {
        const mac = await this.page.evaluate(() => /Mac|iPhone|iPad/.test(navigator.userAgent));
        await this.page.keyboard.press(chord.replace("Mod+", mac ? "Meta+" : "Control+"));
    }

    async until(fn) {
        const start = Date.now();
        for (;;) {
            try {
                if (await fn()) return;
            } catch {
                // not there yet
            }
            if (Date.now() - start > SETTLE) throw new Error(`gave up waiting for ${fn.toString().slice(0, 120)}`);
            await this.page.waitForTimeout(100);
        }
    }

    // What the open dialog cuts off at this size: controls outside the viewport or a clipping box.
    async clipped() {
        return this.page.evaluate(() => {
            const out = [];
            const scrolled = [];
            const root = document.querySelector(".jw-modal");
            if (root === null) return { cuts: ["no dialog"], scrolled };
            const view = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
            const cut = (r, b) =>
                r.left < b.left - 1 || r.top < b.top - 1 || r.right > b.right + 1 || r.bottom > b.bottom + 1;
            const controls = root.querySelectorAll(
                'button, [role="tab"], [role="menuitem"], input:not([type="hidden"]):not([type="file"]), [role="combobox"]',
            );
            for (const el of controls) {
                const r = el.getBoundingClientRect();
                if (r.width <= 1 || r.height <= 1 || getComputedStyle(el).visibility === "hidden") continue;
                const name = (el.getAttribute("aria-label") ?? el.textContent ?? el.tagName)
                    .trim()
                    .replaceAll(/\s+/g, " ")
                    .slice(0, 40);
                // A control a scrolling box hides is reached by scrolling it; one cut by a box
                // that does not scroll, or by the window, is not reachable.
                let hidden = false;
                for (let p = el.parentElement; p !== null && p !== document.body; p = p.parentElement) {
                    const style = getComputedStyle(p);
                    if (style.overflowX === "visible" && style.overflowY === "visible") continue;
                    const b = p.getBoundingClientRect();
                    if (cut(r, b)) {
                        hidden = true;
                        if (/(auto|scroll)/.test(style.overflowX + style.overflowY)) scrolled.push(name);
                        else out.push(`"${name}" cut by .${String(p.className).split(" ")[0]}`);
                        break;
                    }
                }
                if (!hidden && cut(r, view)) out.push(`"${name}" runs off the window`);
            }
            for (const row of root.querySelectorAll(".jwc-row, .jwc-tabs, .sel-ws-head, .jwc-toolbar")) {
                if (row.scrollWidth > row.clientWidth + 1) {
                    out.push(
                        `${row.getAttribute("aria-label") ?? row.className} is ${row.scrollWidth - row.clientWidth}px too wide`,
                    );
                }
            }
            return { cuts: out, scrolled };
        });
    }

    // Lines of the dialog that read as sentences.
    async sentences() {
        const text = await this.dialog.innerText();
        return text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => {
                const words = line.split(/\s+/).filter((w) => /[A-Za-z]{2,}/.test(w));
                return words.length >= 6 || (words.length >= 3 && /[.?!]$/.test(line));
            });
    }

    // Checks the open workspace at both window sizes: nothing cut off, no sentences.
    async layout(label) {
        for (const size of SIZES) {
            await this.page.setViewportSize(size);
            await this.check(`${label}: nothing clipped at ${size.width}x${size.height}`, async () => {
                const { cuts, scrolled } = await this.clipped();
                if (cuts.length > 0) throw new Error(cuts.slice(0, 12).join("; "));
                const more = scrolled.length === 0 ? "" : `; scrolled out of view: ${scrolled.slice(0, 8).join(", ")}`;
                return `every control reachable${more} (${await this.shot(`${label}-${size.width}`)})`;
            });
        }
        await this.page.setViewportSize(SIZES[0]);
        await this.check(`${label}: no sentences`, async () => {
            const found = await this.sentences();
            if (found.length > 0) throw new Error(found.slice(0, 6).join(" | "));
            return "no line of six words or more, none ending in a full stop";
        });
    }

    // Console errors, apart from the browser's own line for a failed request, which the request
    // check names with its address.
    async noErrors() {
        await this.check("no console errors", async () => {
            const errors = this.errors.filter((e) => !e.startsWith("console: Failed to load resource"));
            if (errors.length > 0) throw new Error(errors.slice(0, 5).join(" | "));
            return "none";
        });
        await this.check("every request answered", async () => {
            if (this.requests.length > 0) throw new Error([...new Set(this.requests)].slice(0, 5).join(" | "));
            return "none failed";
        });
    }
}

const eq = (got, want, what) => {
    if (JSON.stringify(got) !== JSON.stringify(want))
        throw new Error(`${what}: expected ${JSON.stringify(want)}, saw ${JSON.stringify(got)}`);
    return `${what} ${JSON.stringify(got)}`;
};

// ---------------------------------------------------------------------------------------------
// The scenarios.

const SCENARIOS = [
    {
        id: "doors",
        async run(v) {
            await v.openFirst("people.csv");
            const joinButton = v.dataPlace.getByRole("button", { name: "Join", exact: true });
            await v.check("one source: no Join + row", async () => eq(await joinButton.count(), 0, "Join buttons"));
            await v.addAsRows("buildings.csv");
            await v.check("two sources: the Join + row appears above the per-source sections", async () => {
                await joinButton.waitFor({ timeout: 1000 });
                const section = await v.dataPlace
                    .getByRole("group", { name: "people.csv", exact: true })
                    .elementHandle();
                const above = await joinButton.evaluate(
                    (button, other) =>
                        Boolean(button.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING),
                    section,
                );
                return eq(above, true, "Join row before the people.csv section");
            });
            const before = await v.graph();
            await joinButton.click();
            await v.dialog.waitFor();
            await v.check("the workspace opens empty", async () => {
                eq(await v.tabs().count(), 0, "joins");
                eq(await v.dialog.getByRole("button", { name: "Undo" }).isDisabled(), true, "Undo disabled");
                return eq(await v.dialog.locator(".jwc-box").count(), 2, "boxes (the two sources)");
            });
            await v.addTable("door_entries.csv");
            await v.dragColumns("door_entries.csv", "badge_id", "people.csv", "badge_id");
            const exact = EXPECT.doors((s) => s);
            await v.check("tile menu counts each kind before one is picked", async () => {
                const tile = v.menu.getByRole("menuitem", { name: /^Turn rows into edges/ });
                return eq(
                    (await tile.innerText()).replaceAll(/\s+/g, " ").includes(` ${exact.edges} `),
                    true,
                    `edges tile shows ${exact.edges}`,
                );
            });
            await v.key("Escape");
            await v.check("Esc closes the tile menu and adds nothing", async () => {
                eq(await v.menu.count(), 0, "menus");
                eq(await v.dialog.isVisible(), true, "workspace open");
                return eq(await v.tabs().count(), 0, "joins");
            });
            await v.dragColumns("door_entries.csv", "badge_id", "people.csv", "badge_id");
            await v.tile("Turn rows into edges");
            await v.check("edges join counts match the files", async () =>
                v.countsAre({
                    joined: exact.joined,
                    "new end": exact["new end"],
                    repeat: exact.repeat,
                    nodes: exact.nodes,
                    edges: exact.edges,
                }),
            );
            const ci = EXPECT.doors(lower);
            const ciSp = EXPECT.doors((s) => noSpace(lower(s)));
            await v.check("hints count what ignoring case and spaces would add", async () => {
                eq(await v.hint("Ignore case"), exact["new end"] - ci["new end"], "Aa hint");
                return eq(await v.hint("Ignore spaces"), ci["new end"] - ciSp["new end"], "a b hint");
            });
            await v.check("the pill and the tab show the edge count", async () => {
                eq(
                    (await v.dialog.locator(".jwc-pill").first().innerText()).includes(String(exact.edges)),
                    true,
                    "pill",
                );
                return eq(
                    (await v.tabNames())[0].endsWith(String(exact.edges)),
                    true,
                    `tab "${(await v.tabNames())[0]}"`,
                );
            });
            await v.check("After draws the graph the join leaves", async () =>
                eq(await v.preview(), { nodes: before.nodes + exact.nodes, edges: exact.edges }, "preview"),
            );
            await v.side("Before");
            await v.check("Before draws the graph before the join", async () =>
                eq(await v.preview(), { nodes: before.nodes, edges: before.edges }, "preview"),
            );
            await v.side("After");
            await v.check("the rows table pages every row with its fate", async () => {
                eq(await v.rowsRange(), "1-50 of 308", "range");
                const fates = await v.fates();
                const allowed = ["Joined", "New end", "Repeat"];
                if (fates.length === 0 || fates.some((f) => !allowed.includes(f)))
                    throw new Error(`fates ${fates.join(",")}`);
                return `${fates.length} rows drawn, fates ${[...new Set(fates)].join(", ")}`;
            });
            await v.dialog.getByRole("button", { name: new RegExp(`^${exact["new end"]} new end$`) }).click();
            await v.check("a fate chip keeps only its rows", async () => {
                eq(await v.rowsRange(), `1-${exact["new end"]} of ${exact["new end"]}`, "range");
                const fates = await v.fates();
                if (fates.some((f) => f !== "New end")) throw new Error(`fates ${fates.join(",")}`);
                return `${fates.length} rows, all New end`;
            });
            await v.dialog.getByRole("button", { name: new RegExp(`^${exact["new end"]} new end$`) }).click();
            await v.dialog.getByRole("button", { name: /^Ignore case \+/ }).click();
            await v.check("ignoring case recounts", async () =>
                v.countsAre({
                    joined: ci.joined,
                    "new end": ci["new end"],
                    repeat: ci.repeat,
                    nodes: ci.nodes,
                    edges: ci.edges,
                }),
            );
            await v.dialog.getByRole("button", { name: /^Ignore spaces \+/ }).click();
            await v.check("ignoring spaces recounts", async () =>
                v.countsAre({
                    joined: ciSp.joined,
                    "new end": ciSp["new end"],
                    repeat: ciSp.repeat,
                    nodes: ciSp.nodes,
                    edges: ciSp.edges,
                }),
            );
            const split = EXPECT.split();
            await v.box("people.csv").getByRole("button", { name: "Split tags" }).click();
            await v.check("Split tags adds a split join counted from the list column", async () => {
                eq(await v.tabs().count(), 2, "joins");
                return v.countsAre({
                    "new end": split["new end"],
                    "left out": split["left out"],
                    nodes: split.nodes,
                    edges: split.edges,
                });
            });
            await v.layout("doors-built");
            await v.dialog.getByRole("button", { name: "Undo" }).click();
            await v.check("Undo takes the split back", async () => eq(await v.tabs().count(), 1, "joins"));
            await v.dialog.getByRole("button", { name: "Redo" }).click();
            await v.check("Redo puts it back", async () => eq(await v.tabs().count(), 2, "joins"));
            await v.key("Mod+z");
            await v.check("Mod+Z undoes", async () => eq(await v.tabs().count(), 1, "joins"));
            await v.key("Mod+Shift+z");
            await v.check("Mod+Shift+Z redoes", async () => eq(await v.tabs().count(), 2, "joins"));
            await v.drag(v.tabs().nth(1), v.tabs().nth(0));
            await v.check("dragging a tab onto another reorders the joins", async () => {
                const names = await v.tabNames();
                if (!/^1 ?Split/.test(names[0]) || !/^2 ?Edges/.test(names[1]))
                    throw new Error(`tabs ${names.join(" | ")}`);
                return `tabs ${names.join(" | ")}`;
            });
            await v.tabs().nth(1).click();
            await v.check("reordered, the edges join keeps its counts", async () =>
                v.countsAre({
                    joined: ciSp.joined,
                    "new end": ciSp["new end"],
                    repeat: ciSp.repeat,
                    nodes: ciSp.nodes,
                    edges: ciSp.edges,
                }),
            );
            await v.key("Mod+z");
            await v.check("undo puts the order back", async () => {
                const names = await v.tabNames();
                if (!/^1 ?Edges/.test(names[0])) throw new Error(`tabs ${names.join(" | ")}`);
                return `tabs ${names.join(" | ")}`;
            });
            await v.tabs().nth(0).click();
            await v.dialog.getByRole("button", { name: "Remove" }).click();
            await v.check("removing the edges join leaves the split, re-applied alone", async () => {
                eq(await v.tabs().count(), 1, "joins");
                await v.tabs().nth(0).click();
                await v.countsAre({
                    "new end": split["new end"],
                    "left out": split["left out"],
                    nodes: split.nodes,
                    edges: split.edges,
                });
                return eq(await v.preview(), { nodes: before.nodes + split.nodes, edges: split.edges }, "preview");
            });
            await v.key("Mod+z");
            await v.check("undo brings the edges join back", async () => eq(await v.tabs().count(), 2, "joins"));
            await v.key("Mod+Enter");
            await v.dialog.waitFor({ state: "detached" });
            await v.check("Done joins both into the graph", async () =>
                eq(
                    await v.graph(),
                    {
                        nodes: before.nodes + ciSp.nodes + split.nodes,
                        edges: ciSp.edges + split.edges,
                        sources: before.sources + 2,
                    },
                    "graph",
                ),
            );
            await v.check("the Data panel lists the joins with their own sections", async () => {
                const items = await v.dataPlace
                    .getByRole("list", { name: "Data sources" })
                    .getByRole("listitem")
                    .allInnerTexts();
                if (!items.some((t) => t.includes("door_en"))) throw new Error(`sources ${items.join(" | ")}`);
                eq(
                    await v.dataPlace.getByRole("group", { name: "door_entries.csv", exact: true }).count(),
                    1,
                    "door_entries.csv section",
                );
                return `sources ${items.map((t) => t.replaceAll(/\s+/g, " ")).join(" | ")}`;
            });
            await v.check("the split join's source row counts the people it read", async () => {
                const items = await v.dataPlace
                    .getByRole("list", { name: "Data sources" })
                    .getByRole("listitem")
                    .allInnerTexts();
                const row = items
                    .map((t) => t.replaceAll(/\s+/g, " ").trim())
                    .filter((t) => t.startsWith("people.csv"))
                    .at(-1);
                const read = 60 - split["left out"];
                if (!row?.includes(`${read}/60`))
                    throw new Error(`the split's row reads "${row}", where ${read} of 60 people have tags`);
                return row;
            });
            await v.shot("after-done");
        },
    },
    {
        id: "fraud",
        async run(v) {
            await v.openFirst("accounts.csv");
            await v.toWorkspace("account_identifiers.csv");
            const link10 = EXPECT.link(10);
            const link30 = EXPECT.link(30);
            await v.dragColumns("account_identifiers.csv", "account_id", "accounts.csv", "account_id");
            await v.tile("Link by shared value");
            await v.check("link join counts match the files", async () =>
                v.countsAre({
                    linked: link10.linked,
                    "over cap": link10["over cap"],
                    "left out": link10["left out"],
                    edges: link10.edges,
                    "hub values": link10["hub values"],
                }),
            );
            const cap = v.dialog.getByLabel("Hub cap", { exact: true });
            await cap.fill("30");
            await v.check("a hub cap of 30 links the hub device too", async () =>
                v.countsAre({ linked: link30.linked, "left out": link30["left out"], edges: link30.edges }),
            );
            await cap.fill("10");
            await v.dialog
                .getByRole("radiogroup", { name: "Link as" })
                .getByText("Value nodes", { exact: true })
                .click();
            await v.check("value nodes: one node per shared value", async () =>
                v.countsAre({
                    linked: link10.linked,
                    "over cap": link10["over cap"],
                    "left out": link10["left out"],
                    nodes: link10.valueNodes,
                    edges: link10.valueEdges,
                    "hub values": link10["hub values"],
                }),
            );
            await v.addTable("watchlist.csv");
            await v.box("phone").waitFor();
            await v.dragColumns("watchlist.csv", "value", "phone", "phone");
            await v.tile("Flag nodes on a list");
            await v.check("flag join flags the listed phones", async () =>
                v.countsAre({
                    joined: link10.flagged,
                    "left out": link10.watchlist - link10.flagged,
                    updated: link10.flagged,
                }),
            );
            await v.check("the rows table shows the watchlist's values as the file writes them", async () => {
                const cells = await v.cells("value");
                const want = csv("watchlist.csv")
                    .map((w) => w.value.trim())
                    .slice(0, cells.length);
                return eq(cells, want, "value cells");
            });
            await v.layout("fraud-built");
            await v.key("Mod+Enter");
            await v.dialog.waitFor({ state: "detached" });
            await v.check("Done: value nodes and flags in the graph", async () => {
                const g = await v.graph();
                eq(
                    { nodes: g.nodes, edges: g.edges },
                    { nodes: link10.accounts + link10.valueNodes, edges: link10.valueEdges },
                    "graph",
                );
                const flagged = (await v.graphNodes()).filter((n) => n.watchlist === true).length;
                return eq(flagged, link10.flagged, "flagged nodes");
            });
            await v.shot("after-done");
        },
    },
    {
        id: "genes",
        async run(v) {
            await v.openFirst("string_tp53.graphml");
            await v.toWorkspace("expression.csv");
            await v.addTable("ensembl_to_symbol.csv");
            const exact = EXPECT.genes((s) => s);
            const ci = EXPECT.genes(lower);
            await v.dragColumns("expression.csv", "symbol", "ensembl_to_symbol.csv", "symbol");
            await v.tile("Map ids through a table");
            await v.check("map join counts match the files", async () => {
                await v.countsAre({
                    joined: exact.joined,
                    "left out": exact["left out"],
                    unmapped: exact.unmapped,
                    updated: exact.updated,
                });
                return eq(await v.hint("Ignore case"), ci.joined - exact.joined, "Aa hint");
            });
            await v.dialog.getByRole("button", { name: /^Ignore case \+/ }).click();
            await v.check("ignoring case recounts", async () =>
                v.countsAre({
                    joined: ci.joined,
                    repeat: ci.repeat,
                    "left out": ci["left out"],
                    unmapped: ci.unmapped,
                    updated: ci.updated,
                }),
            );
            await v.check("Before and After draw the network", async () => {
                const after = await v.preview();
                await v.side("Before");
                await v.until(async () => (await v.preview()).nodes === exact.nodes);
                const shown = await v.preview();
                await v.side("After");
                return eq([after.nodes, shown.nodes], [exact.nodes, exact.nodes], "after, before nodes");
            });
            await v.layout("genes-built");
            await v.key("Mod+Enter");
            await v.dialog.waitFor({ state: "detached" });
            await v.check("Done: the values sit on the proteins", async () => {
                const nodes = await v.graphNodes();
                eq(nodes.length, exact.nodes, "nodes");
                const wrong = [...ci.hit].filter(
                    ([id, value]) => Number(nodes.find((n) => n.id === id)?.log2FC) !== value,
                );
                if (wrong.length > 0)
                    throw new Error(
                        `wrong log2FC on ${wrong
                            .slice(0, 5)
                            .map(([id]) => id)
                            .join(", ")}`,
                    );
                return eq(nodes.filter((n) => n.log2FC !== undefined).length, ci.joined, "nodes with log2FC");
            });
            await v.shot("after-done");
        },
    },
    {
        id: "compare",
        async run(v) {
            await v.openFirst("tumor.graphml");
            await v.toWorkspace("normal.graphml");
            const want = EXPECT.compare();
            await v.dragColumns("normal.graphml", "id", "tumor.graphml", "id");
            await v.tile("Compare two graphs");
            await v.check("compare counts each region", async () => {
                await v.countsAre({ merged: want.both, "new end": want.onlyFrom, nodes: want.onlyFrom });
                const groups = (
                    await v.dialog.getByRole("group", { name: "Comparison groups" }).innerText()
                ).replaceAll(/\s+/g, " ");
                return eq(
                    groups.trim(),
                    `only tumor ${want.onlyOnto} both ${want.both} only normal ${want.onlyFrom}`,
                    "groups",
                );
            });
            await v.dialog
                .getByRole("group", { name: "Regions" })
                .getByRole("button", { name: /both/ })
                .first()
                .click();
            await v.check("the Venn's middle picks out the shared nodes", async () =>
                eq(await v.rowsRange(), `1-${want.both} of ${want.both}`, "rows"),
            );
            await v.check("After draws the union", async () =>
                eq((await v.preview()).nodes, want.tumor + want.onlyFrom, "preview nodes"),
            );
            await v.layout("compare-built");
            await v.key("Mod+Enter");
            await v.dialog.waitFor({ state: "detached" });
            await v.check("Done writes each node's region", async () => {
                const counts = {};
                for (const n of await v.graphNodes()) counts[n.membership] = (counts[n.membership] ?? 0) + 1;
                return eq(
                    counts,
                    { both: want.both, "only-onto": want.onlyOnto, "only-from": want.onlyFrom },
                    "membership",
                );
            });
            await v.shot("after-done");
        },
    },
    {
        id: "suppliers",
        async run(v) {
            await v.openFirst("suppliers_a.csv");
            await v.toWorkspace("suppliers_b.csv");
            await v.addTable("purchase_orders.csv");
            const exact = EXPECT.merge((s) => s);
            const sp = EXPECT.merge(noSpace);
            await v.dragColumns("suppliers_b.csv", "duns", "suppliers_a.csv", "duns");
            await v.tile("Merge on a key");
            await v.check("merge counts match the files", async () => {
                await v.countsAre({
                    merged: exact.merged,
                    "new end": exact["new end"],
                    repeat: exact.repeat,
                    nodes: exact.nodes,
                    updated: exact.merged,
                });
                return eq(await v.hint("Ignore spaces"), sp.merged - exact.merged, "a b hint");
            });
            await v.dialog.getByRole("button", { name: "Ignore spaces", exact: true }).click();
            await v.check("ignoring spaces merges the spaced DUNS", async () =>
                v.countsAre({
                    merged: sp.merged,
                    "new end": sp["new end"],
                    repeat: sp.repeat,
                    nodes: sp.nodes,
                    updated: sp.merged,
                }),
            );
            await v.dialog.locator(".jwc-pill-chip").first().click();
            await v.check("the pill's merged count picks out the merged rows", async () =>
                eq(await v.rowsRange(), `1-${sp.merged} of ${sp.merged}`, "rows"),
            );
            await v.key("c");
            const panel = v.page.getByRole("dialog", { name: "Conflicts" });
            await v.check("the conflicts review counts each clashing column", async () => {
                const text = (await panel.innerText()).replaceAll(/\s+/g, " ");
                for (const [column, n] of Object.entries(sp.clashes)) {
                    if (!new RegExp(`${column} ${n} `).test(text)) throw new Error(`${column} ${n} not in "${text}"`);
                }
                return text.slice(0, 160);
            });
            await panel
                .getByRole("textbox", { name: "rating rule" })
                .or(panel.getByLabel("rating rule"))
                .first()
                .click();
            await v.page.getByRole("option", { name: "Max", exact: true }).click();
            await v.check("a fusion rule is kept", async () =>
                eq(await panel.getByLabel("rating rule").first().inputValue(), "Max", "rating rule"),
            );
            await v.shot("conflicts");
            await v.key("Escape");
            await v.check("Esc closes the review, not the workspace", async () => {
                eq(await panel.count(), 0, "review");
                return eq(await v.dialog.isVisible(), true, "workspace open");
            });
            const canvas = await v.dialog.getByTestId("join-canvas").boundingBox();
            await v.drag(v.column("purchase_orders.csv", "plant"), {
                x: canvas.x + canvas.width - 120,
                y: canvas.y + canvas.height - 60,
            });
            await v.menu.waitFor();
            const vendors = new Set(csv("suppliers_b.csv").map((b) => b.vendor_no));
            const orders = EXPECT.orders(vendors);
            await v.key("1");
            await v.check("a column dropped on empty canvas becomes a node kind", async () =>
                v.countsAre({
                    "new end": orders.edges,
                    repeat: orders.repeat,
                    nodes: orders.nodes,
                    edges: orders.edges,
                }),
            );
            await v.dialog.getByRole("radiogroup", { name: "Edges" }).getByText("Per pair", { exact: true }).click();
            await v.check("per pair: one edge per vendor and plant, every row read into one", async () =>
                v.countsAre({ "new end": orders.rows, nodes: orders.nodes, edges: orders.edges }),
            );
            await v.check("per pair offers a sum of amount", async () => {
                const text = await v.dialog.getByRole("group", { name: "Settings", exact: true }).innerText();
                if (!/sum|amount/i.test(text))
                    throw new Error(
                        `no reduction of amount on offer; the settings hold "${text.replaceAll(/\s+/g, " ")}"`,
                    );
                return "offered";
            });
            await v.tabs().nth(0).click();
            await v.key("Delete");
            const alone = EXPECT.orders(new Set());
            await v.check("removing the merge re-applies the kind join to the graph without it", async () => {
                eq(await v.tabs().count(), 1, "joins");
                await v.tabs().nth(0).click();
                return v.countsAre({ "new end": alone.rows, nodes: alone.nodes, edges: alone.edges });
            });
            await v.key("Mod+z");
            await v.check("undo brings the merge back", async () => eq(await v.tabs().count(), 2, "joins"));
            await v.layout("suppliers-built");
            await v.key("Mod+Enter");
            await v.dialog.waitFor({ state: "detached" });
            await v.check("Done: the merged suppliers and the plants", async () => {
                const nodes = await v.graphNodes();
                const g = await v.graph();
                const known = new Set([...csv("suppliers_a.csv").map((a) => a.id), ...orders.unknown]);
                const others = nodes
                    .filter((n) => !known.has(n.id))
                    .map((n) => `${n.id}${n.kind === undefined ? "" : `:${n.kind}`}`);
                return eq(
                    { nodes: g.nodes, edges: g.edges },
                    { nodes: sp.a + sp.nodes + orders.nodes, edges: orders.edges },
                    `graph (nodes beyond list A: ${others.join(", ")})`,
                );
            });
            await v.check("Done: each order edge runs from its vendor to its plant", async () => {
                const nodes = await v.graphNodes();
                const edges = await v.page.evaluate(() => {
                    const element = [...document.querySelectorAll("graphty-element")].find(
                        (each) => each.closest(".jw-modal") === null,
                    );
                    return element.session.data.edges().map((edge) => ({ source: edge.source, target: edge.target }));
                });
                const vendorOf = new Map(nodes.map((n) => [n.id, n.vendor_no ?? n.id]));
                const got = new Set(edges.map((e) => `${vendorOf.get(e.source)}|${e.target}`));
                const want = new Set(csv("purchase_orders.csv").map((o) => `${o.vendor_no}|${o.plant}`));
                const missing = [...want].filter((pair) => !got.has(pair));
                if (missing.length > 0) {
                    throw new Error(
                        `${missing.length} of ${want.size} vendor-plant pairs missing, e.g. ${missing.slice(0, 3).join(", ")}; edges run from ${[...new Set(edges.map((e) => e.source))].slice(0, 6).join(", ")}`,
                    );
                }
                return `${want.size} vendor-plant pairs`;
            });
            await v.check("Done: the Max rule keeps the higher rating", async () => {
                const nodes = await v.graphNodes();
                const wrong = [...sp.maxRating].filter(
                    ([id, max]) => Number(nodes.find((n) => n.id === id)?.rating) !== max,
                );
                if (wrong.length > 0)
                    throw new Error(
                        `rating not the max on ${wrong
                            .slice(0, 5)
                            .map(([id]) => id)
                            .join(", ")}`,
                    );
                return `${sp.maxRating.size} merged nodes carry the higher rating`;
            });
            await v.shot("after-done");
        },
    },
    {
        id: "wrong-key",
        async run(v) {
            await v.openFirst("tumor.graphml");
            const before = await v.graph();
            const nodesBefore = await v.graphNodes();
            await v.toWorkspace("normal.graphml");
            await v.dragColumns("normal.graphml", "logFC", "tumor.graphml", "id");
            await v.tile("Put values on nodes");
            await v.check("a wrong key matches nothing", async () => {
                const got = await v.counts();
                if (got.joined !== undefined || got.updated !== undefined || got.nodes !== undefined)
                    throw new Error(`bar "${got.text}"`);
                return eq((await v.tabNames())[0].endsWith(" 0"), true, `tab "${(await v.tabNames())[0]}"`);
            });
            await v.key("Mod+Enter");
            await v.dialog.waitFor({ state: "detached" });
            await v.check("Done with a wrong key adds nothing", async () => {
                const g = await v.graph();
                eq({ nodes: g.nodes, edges: g.edges }, { nodes: before.nodes, edges: before.edges }, "graph");
                const changed = (await v.graphNodes()).filter(
                    (n, i) => JSON.stringify(n) !== JSON.stringify(nodesBefore[i]),
                );
                return eq(changed.length, 0, "nodes changed");
            });
        },
    },
    {
        id: "menu-esc",
        async run(v) {
            await v.openFirst("people.csv");
            await v.addAsRows("buildings.csv");
            await v.dataPlace.getByRole("button", { name: "Join", exact: true }).click();
            await v.dialog.waitFor();
            await v.addTable("door_entries.csv");
            await v.dragColumns("door_entries.csv", "badge_id", "people.csv", "badge_id");
            await v.tile("Turn rows into edges");
            await v.dragColumns("door_entries.csv", "building_id", "buildings.csv", "id");
            await v.dialog.getByTestId("join-canvas").click({ position: { x: 600, y: 600 } });
            await v.check("the tile menu stays open on a click elsewhere", async () =>
                eq(await v.menu.isVisible(), true, "menu open"),
            );
            await v.key("Escape");
            await v.check("Esc after a click elsewhere closes only the tile menu", async () => {
                eq(await v.menu.count(), 0, "menus");
                eq(await v.dialog.isVisible(), true, "workspace open");
                return eq(await v.tabs().count(), 1, "joins kept");
            });
        },
    },
    {
        id: "cancel",
        async run(v) {
            await v.openFirst("people.csv");
            await v.addAsRows("buildings.csv");
            const before = await v.graph();
            await v.dataPlace.getByRole("button", { name: "Join", exact: true }).click();
            await v.dialog.waitFor();
            await v.addTable("door_entries.csv");
            await v.dragColumns("door_entries.csv", "badge_id", "people.csv", "badge_id");
            await v.tile("Turn rows into edges");
            await v.box("people.csv").getByRole("button", { name: "Split tags" }).click();
            await v.until(async () => (await v.tabs().count()) === 2);
            await v.key("Escape");
            await v.dialog.waitFor({ state: "detached" });
            await v.check("Cancel discards every join", async () => eq(await v.graph(), before, "graph"));
            await v.dataPlace.getByRole("button", { name: "Join", exact: true }).click();
            await v.dialog.waitFor();
            await v.check("reopened, the workspace starts empty again", async () => {
                eq(await v.tabs().count(), 0, "joins");
                return eq(await v.box("door_entries.csv").count(), 0, "held door_entries.csv");
            });
            await v.dialog.getByRole("button", { name: "Cancel" }).click();
            await v.dialog.waitFor({ state: "detached" });
            await v.check("Cancel by its button closes the workspace", async () =>
                eq(await v.graph(), before, "graph"),
            );
        },
    },
];

// ---------------------------------------------------------------------------------------------

const only = args.only?.split(",").filter(Boolean);
const scenarios = SCENARIOS.filter((s) => only === undefined || only.some((o) => s.id.includes(o)));
const kinds = { chromium, webkit };
for (const name of args.browsers.split(",")) {
    const browser = await kinds[name].launch();
    for (const scenario of scenarios) {
        const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: SIZES[0] });
        const page = await context.newPage();
        page.setDefaultTimeout(SETTLE);
        const v = new Visit(name, scenario.id, page);
        scenarioShots = 0;
        try {
            await v.open();
            await scenario.run(v);
        } catch (error) {
            v.record(
                "scenario ran to its end",
                "fail",
                String(error?.message ?? error)
                    .split("\n")[0]
                    .slice(0, 600),
                await v.shot("stopped").catch(() => undefined),
            );
        }
        await v.noErrors();
        await context.close();
    }
    await browser.close();
}

const failed = results.filter((r) => r.status === "fail");
writeFileSync(join(args.out, "report.json"), `${JSON.stringify(results, null, 2)}\n`);
console.log(
    `\n${results.length - failed.length} passed, ${failed.length} failed; report in ${join(args.out, "report.json")}`,
);
process.exit(failed.length > 0 ? 1 : 0);
