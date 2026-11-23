#!/usr/bin/env node
/**
 * User acceptance test of pointing at the canvas: hovering and clicking nodes and edges, and finding an
 * edge between its two nodes on every frame while a layout moves them. It walks the built graphty app in
 * headless Chromium on this machine's NVIDIA card (the dry run's browser, run.mjs), with real mouse moves
 * and clicks, and reads what graphty-element reports through its public API (nodeScreenPosition,
 * elementAt, session.selection). Separate from the dry run because it reads the element in the page
 * while it walks, which a dry-run route may not.
 *
 *   node graphty/acceptance/canvas-uat.mjs                          graphty-element's default render path
 *   node graphty/acceptance/canvas-uat.mjs --features cosmograph    the batched render path
 *     --dist <dir>       the build to walk (default graphty/dist)
 *     --only <a,b>       scenarios whose id starts with one of these
 *     --report <file>    where the results go (default tmp/canvas-uat[-<features>]/report.json);
 *                        compare-reports.mjs diffs two
 *
 * It takes one shared browser slot and the machine's GPU slot, as the dry run does. Exit 0 when every
 * check passed, 1 when one failed, 2 on a usage error. See README.md beside this file.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { WAIT_GUARD_MS } from "../../tools/test-wait-guard.mjs";
import { launch, serve } from "./run.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");

const { values: args } = parseArgs({
    options: {
        dist: { type: "string", default: join(repo, "graphty/dist") },
        features: { type: "string", default: "" },
        only: { type: "string" },
        report: { type: "string" },
    },
});
const out = join(repo, args.features ? `tmp/canvas-uat-${args.features.replaceAll(",", "-")}` : "tmp/canvas-uat");
args.report ??= join(out, "report.json");

// ---------------------------------------------------------------- steps

/**
 * Samples, then the sample's card, until the Everything layer counts its nodes.
 * @param page the Playwright page
 * @param sample the sample as its card names it ("Les Miserables")
 */
async function openSample(page, sample) {
    await page.getByRole("button", { name: "Samples", exact: true }).click();
    await page.getByRole("button", { name: new RegExp(`^Open the ${sample} sample: `) }).click();
    await page.getByRole("treeitem", { name: /^Everything, .*\b[1-9][\d,]* nodes?\b/ }).waitFor();
}

/**
 * Wait for the picture to be final: the element's own promise (layout settled, camera framed, a frame
 * drawn).
 * @param page the Playwright page
 */
async function stableFrame(page) {
    await page.evaluate(() => document.querySelector("graphty-element").waitForStableFrame());
}

/**
 * Up to `frames` page frames, until `done(selection)` holds: the pointer's effect lands a frame or two
 * after the input (a pick reads the last drawn frame). Counted frames, never a clock.
 * @param page the Playwright page
 * @param done what the selection should come to
 * @param frames how many frames to give it
 * @returns the hovered node and the selected nodes and edges, as ids
 */
async function selectionAfter(page, done, frames = 60) {
    const read = () =>
        page.evaluate(() => {
            const s = document.querySelector("graphty-element").session;
            const h = s.selection.hovered;
            return {
                hovered: h === null ? null : String(h),
                nodes: s.selection.nodes.map(String),
                edges: s.selection.edges.map(String),
            };
        });
    let sel = await read();
    for (let n = 0; n < frames && !done(sel); n++) {
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
        sel = await read();
    }
    return sel;
}

/**
 * Where a node is drawn, in page pixels, and whether the app's own UI covers that point.
 * @param page the Playwright page
 * @param id the node
 * @returns the page point `x`, `y`, whether the node is `visible`, and `covered`: what is on top when it
 *   is not the canvas, else null
 */
function nodeOnPage(page, id) {
    return page.evaluate((id) => {
        const el = document.querySelector("graphty-element");
        const at = el.nodeScreenPosition(id);
        const r = el.getBoundingClientRect();
        if (!at) return { x: 0, y: 0, visible: false, covered: "no such node" };
        const [x, y] = [r.left + at.x, r.top + at.y];
        const top = document.elementFromPoint(x, y);
        const onCanvas = top === el || el.contains(top);
        return {
            x,
            y,
            visible: at.visible,
            covered: onCanvas ? null : (top?.getAttribute("aria-label") ?? top?.tagName),
        };
    }, id);
}

/**
 * A drawn edge long enough to point at between its two nodes, where the canvas is not covered: the
 * first in the data whose middle the element says is that edge.
 * @param page the Playwright page
 * @returns the edge's `id` and its middle's page point `x`, `y`, or null when no edge qualifies
 */
function pointableEdge(page) {
    return page.evaluate(() => {
        const el = document.querySelector("graphty-element");
        const r = el.getBoundingClientRect();
        for (const e of el.session.data.edges()) {
            const [a, b] = [el.nodeScreenPosition(e.source), el.nodeScreenPosition(e.target)];
            if (!a?.visible || !b?.visible || Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius + 40) continue;
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const hit = el.elementAt(mid);
            const top = document.elementFromPoint(r.left + mid.x, r.top + mid.y);
            if (hit?.kind === "edge" && String(hit.id) === String(e.id) && (top === el || el.contains(top)))
                return { id: String(e.id), x: r.left + mid.x, y: r.top + mid.y };
        }
        return null;
    });
}

/**
 * Start recording every frame while the layout moves: each node's drawn center (nodeScreenPosition),
 * and for every drawn edge long enough to have a middle off its nodes, what the element finds at that
 * middle (elementAt). Pointing there while the layout moves must find the edge, or a node over it, as a
 * hover or a click would. elementAt measures a straight edge from its two nodes' drawn centers, so this
 * checks picking during motion; it cannot see a line drawn behind its nodes, which only the canvas's
 * pixels show (graphty-element's own in-motion tests read those).
 * @param page the Playwright page
 */
async function recordMotion(page) {
    await page.evaluate(() => {
        const el = document.querySelector("graphty-element");
        const rec = { frames: 0, moving: 0, checked: 0, missed: 0, misses: [], otherEdge: 0, on: true };
        globalThis.canvasUatMotion = rec;
        let last = null;
        // what pointing between an edge's two drawn nodes finds
        const pointBetween = (e, a, b) => {
            if (!a?.visible || !b?.visible || Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius + 16) return;
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const hit = el.elementAt(mid);
            rec.checked++;
            if (hit === null) {
                rec.missed++;
                if (rec.misses.length < 10)
                    rec.misses.push({ frame: rec.frames, edge: String(e.id), at: mid, from: a, to: b });
            } else if (hit.kind === "edge" && String(hit.id) !== String(e.id)) rec.otherEdge++;
        };
        const tick = () => {
            if (!rec.on) return;
            const pos = new Map(el.session.data.nodes().map((n) => [String(n.id), el.nodeScreenPosition(n.id)]));
            const moved =
                last !== null &&
                [...pos].some(([id, p]) => {
                    const q = last.get(id);
                    return p && q && Math.hypot(p.x - q.x, p.y - q.y) > 0.5;
                });
            if (moved) {
                rec.moving++;
                for (const e of el.session.data.edges())
                    pointBetween(e, pos.get(String(e.source)), pos.get(String(e.target)));
            }
            last = pos;
            rec.frames++;
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
}

/**
 * Stop recording and read what was recorded.
 * @param page the Playwright page
 * @returns the record
 */
function stopMotion(page) {
    return page.evaluate(() => {
        const rec = globalThis.canvasUatMotion;
        rec.on = false;
        return rec;
    });
}

/**
 * The toolbar's Layout, a layout from its list, then Apply.
 * @param page the Playwright page
 * @param name the layout as the list names it ("Circle")
 * @param transition how the nodes move to the new layout ("Glide"); the form's default when omitted
 */
async function applyLayout(page, name, transition) {
    await page
        .getByRole("button", { name: /^Layout\b/ })
        .first()
        .click();
    await page
        .getByRole("listbox", { name: "Layouts" })
        .getByRole("option", { name: new RegExp(String.raw`^${name}\b`) })
        .first()
        .click();
    if (transition !== undefined) {
        await page.getByRole("combobox", { name: "Transition" }).click();
        await page.getByRole("option", { name: transition, exact: true }).click();
    }
    await page.getByRole("button", { name: "Apply", exact: true }).click();
}

/**
 * Open a sample, change its layout and record every frame until the picture is final.
 * @param page the Playwright page
 * @param sample the sample
 * @param layout the layout
 * @param transition the transition, or undefined for the form's default
 * @returns the motion record
 */
async function layoutInMotion(page, sample, layout, transition) {
    await openSample(page, sample);
    await stableFrame(page);
    await recordMotion(page);
    await applyLayout(page, layout, transition);
    await stableFrame(page);
    return stopMotion(page);
}

const motionChecks = {
    "the layout moved the nodes over several drawn frames": (r) =>
        assert.ok(r.moving >= 3, `nodes moved on ${r.moving} of ${r.frames} frames`),
    "on every moving frame, pointing between an edge's two drawn nodes finds the edge or a node": (r) => {
        assert.ok(r.checked > 0, "no edge was checked");
        const first = JSON.stringify(r.misses.slice(0, 3));
        assert.equal(
            r.missed,
            0,
            `${r.missed} of ${r.checked} edge middles found nothing (${r.moving} moving frames); first: ${first}`,
        );
    },
};

// ---------------------------------------------------------------- the scenarios

const NAMES = ["Valjean", "Javert", "Fantine"];

export const scenarios = [
    {
        id: "c01-point-at-nodes-and-an-edge",
        feature: "Hover and click three named nodes and an edge on the canvas",
        async run(page) {
            await openSample(page, "Les Miserables");
            const record = { nodes: [], edge: null };
            for (const id of NAMES) {
                await stableFrame(page);
                const at = await nodeOnPage(page, id);
                await page.mouse.move(at.x, at.y);
                const { hovered } = await selectionAfter(page, (s) => s.hovered === id);
                await page.mouse.down();
                await page.mouse.up();
                const { nodes } = await selectionAfter(page, (s) => s.nodes.includes(id));
                record.nodes.push({ id, at, hovered, selected: nodes });
            }
            await stableFrame(page);
            const edge = await pointableEdge(page);
            if (edge !== null) {
                await page.mouse.move(edge.x, edge.y);
                await page.mouse.down();
                await page.mouse.up();
                const { nodes, edges } = await selectionAfter(page, (s) => s.edges.includes(edge.id));
                record.edge = { ...edge, selectedNodes: nodes, selectedEdges: edges };
            }
            return record;
        },
        checks: {
            [`each of ${NAMES.join(", ")} is drawn on an uncovered part of the canvas`]: (r) => {
                for (const n of r.nodes)
                    assert.ok(n.at.visible && n.at.covered === null, `${n.id}: ${JSON.stringify(n.at)}`);
            },
            "pointing at each of them hovers that node": (r) => {
                for (const n of r.nodes) assert.equal(n.hovered, n.id, `pointing at ${n.id} hovers ${n.hovered}`);
            },
            "clicking each of them selects that node alone": (r) => {
                for (const n of r.nodes)
                    assert.deepEqual(n.selected, [n.id], `clicking ${n.id} selects ${JSON.stringify(n.selected)}`);
            },
            "an edge drawn between its nodes is found there, and clicking it selects it": (r) => {
                assert.ok(
                    r.edge !== null,
                    "no edge's middle is that edge (elementAt) on an uncovered part of the canvas",
                );
                assert.ok(
                    r.edge.selectedEdges.includes(r.edge.id),
                    `clicked edge ${r.edge.id}: ${JSON.stringify(r.edge)}`,
                );
            },
        },
    },
    {
        id: "c02-edges-follow-an-animating-layout",
        feature: "Change the layout to Circle with a glide; edges are found between their moving nodes",
        run: (page) => layoutInMotion(page, "Zachary's karate club", "Circle", "Glide"),
        checks: motionChecks,
    },
    {
        id: "c03-edges-follow-a-running-force-layout",
        feature: "Run ForceAtlas2; edges are found between their moving nodes",
        run: (page) => layoutInMotion(page, "Zachary's karate club", "ForceAtlas2"),
        checks: motionChecks,
    },
];

// ---------------------------------------------------------------- the run

/**
 * Walk one scenario in its own browser and run its checks on what it recorded.
 * @param chromium Playwright's chromium
 * @param origin the served app, with its query
 * @param scenario the scenario
 * @returns its result: `id`, `result` ("pass" or "fail"), `reason`, `record`
 */
async function walk(chromium, origin, scenario) {
    const result = { id: scenario.id, feature: scenario.feature, result: "fail", reason: null, record: null };
    const b = await launch(chromium);
    const errors = [];
    try {
        b.page.on("pageerror", (e) => errors.push(e.message.split("\n")[0]));
        b.page.setDefaultTimeout(WAIT_GUARD_MS);
        await b.page.goto(origin);
        result.record = await scenario.run(b.page);
        const failed = [];
        for (const [name, check] of Object.entries(scenario.checks)) {
            try {
                check(result.record);
            } catch (err) {
                failed.push(`${name}: ${err.message.split("\n")[0]}`);
            }
        }
        if (errors.length) failed.push(`the page threw: ${errors.join("; ")}`);
        result.result = failed.length ? "fail" : "pass";
        result.reason = failed.join(" | ") || null;
    } catch (err) {
        result.reason = `walking: ${err.message.split("\n")[0]}`;
    } finally {
        await b.page.mouse.move(0, 0).catch(() => {});
        await b.page.screenshot({ path: join(out, `${scenario.id}.png`) }).catch(() => {});
        await b.close().catch(() => {});
    }
    return result;
}

async function main() {
    const { chromium } = await import(join(repo, "node_modules/playwright/index.mjs"));
    const wanted = args.only?.split(",");
    const chosen = scenarios.filter((s) => wanted === undefined || wanted.some((w) => s.id.startsWith(w)));
    mkdirSync(out, { recursive: true });
    mkdirSync(dirname(resolve(args.report)), { recursive: true });
    const http = await serve(resolve(args.dist));
    const query = args.features ? `?features=${args.features}` : "";
    const origin = `http://127.0.0.1:${http.address().port}/${query}`;
    const results = [];
    try {
        for (const scenario of chosen) {
            const r = await walk(chromium, origin, scenario);
            results.push(r);
            console.log(`${r.result.padEnd(4)}  ${r.id}`);
            if (r.reason) console.log(`      ${r.reason}`);
        }
    } finally {
        http.close();
    }
    writeFileSync(args.report, JSON.stringify({ features: args.features, results }, null, 1) + "\n");
    const failed = results.filter((r) => r.result !== "pass").length;
    const on = args.features ? ` with ${args.features}` : "";
    console.log(`\n${results.length - failed} of ${results.length} passed${on}. Report: ${args.report}`);
    process.exit(failed ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    if (process.env.CANVAS_UAT_HELD === "1") {
        await main();
    } else {
        // one shared browser slot, then the machine's one GPU slot inside it, as the dry run takes them
        const child = spawn(
            "bash", // eslint-disable-line sonarjs/no-os-command-from-path -- developer tooling runs the developer's own bash
            [
                join(repo, "design/ui/studio/tool/with-browser.sh"),
                process.execPath,
                join(repo, "tools/test-slots.mjs"),
                "--gpu",
                process.execPath,
                fileURLToPath(import.meta.url),
                ...process.argv.slice(2),
            ],
            { stdio: "inherit", env: { ...process.env, BROWSER_SLOTS: "4", BROWSER_GPU: "", CANVAS_UAT_HELD: "1" } },
        );
        child.on("exit", (code) => process.exit(code ?? 1));
    }
}
