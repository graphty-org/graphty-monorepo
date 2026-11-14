/**
 * The style fidelity scorecard, Node tier: every fidelity sample and corpus file
 * (`graph-io/test/fidelity/samples.ts`, `corpus-samples.ts`) loaded into a session with its own
 * styles, what graphty-element is asked to draw (`requested-scene.ts`) scored per property against
 * the scenes the source programs drew, and each score held to its floor in
 * `requested-floors.json`. A fix that raises one file and lowers another fails here, naming the
 * file, the property and its worst elements.
 *
 * A floor only rises: after a fix, record the new scores with
 *
 *     GRAPHTY_FIDELITY_RECORD=1 npx vitest run --project=default test/fidelity/scorecard.test.ts
 *
 * in graphty-element and commit the file. Recording raises each floor to the score measured and
 * never lowers one, and keeps the floors of every sample the run did not reach (`-t <sample>`, or a
 * sample that failed before it was scored).
 *
 * A drop that is accepted (a reference corrected, a deliberate trade) goes in the file's
 * `allowedDrops` as `"<sample>/<property>": { floor, to, reason, date }` (the oracle tier's
 * `AcceptedDrop`): the floor stays, and the score may sit at `to` or above, never below it.
 * Recording raises `to` with the score and takes the drop off once the score is back at its floor.
 *
 * A property that is no longer judged at all (its reference now leaves every element of it out on
 * purpose, as a gradient-filled node's flat fill is `paintedOver`) is not a drop: its floor is
 * taken off `floors` and listed in `retired` as `"<sample>/<property>": "<reason>"`. A retired
 * property that carries a floor again, or is judged again, fails here, so the record stays true.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import { afterAll, assert, describe, it } from "vitest";

import { compareSample, compareScenes } from "../../../graph-io/test/fidelity/compare";
import { CORPUS_SAMPLES } from "../../../graph-io/test/fidelity/corpus-samples";
import { type FidelitySample, SAMPLES } from "../../../graph-io/test/fidelity/samples";
import type { Scene } from "../../../graph-io/test/fidelity/scene";
import { createGraphSession, type GraphSession } from "../../session";
import { type AcceptedDrop, raiseFloors } from "./oracle/floors";
import { REQUESTED_PROPERTIES, requestedScene } from "./requested-scene";

const GRAPH_IO_TEST = join(__dirname, "..", "..", "..", "graph-io", "test");
const FLOORS = join(__dirname, "requested-floors.json");
const RECORD = process.env.GRAPHTY_FIDELITY_RECORD === "1";
/** Pass rates are compared to this many decimals, so a float's last bit never fails a floor. */
const EPSILON = 1e-9;

interface Floors {
    /** What a recorded floor means, for a reader of the file. */
    about: string;
    /** Per sample, per property: the pass rate a run may not drop below. */
    floors: Record<string, Record<string, number>>;
    /** `"<sample>/<property>"`: a drop below its floor accepted down to `to`, and why. */
    allowedDrops: Record<string, AcceptedDrop>;
    /** `"<sample>/<property>"`: why a property is no longer judged, so it has no floor. */
    retired?: Record<string, string>;
}

const stored = JSON.parse(readFileSync(FLOORS, "utf8")) as Floors;
const recorded: Floors["floors"] = {};

/**
 * Loads a sample into a fresh session with its own styles, as the graphty app loads a file.
 * @param sample - the sample
 * @returns the session and the sample's hash as stored
 */
async function load(sample: FidelitySample): Promise<{ session: GraphSession; sha256: string }> {
    const raw = readFileSync(join(GRAPH_IO_TEST, sample.file));
    const sha256 = createHash("sha256").update(raw).digest("hex");
    const data = new Uint8Array(sample.file.endsWith(".gz") ? gunzipSync(raw) : raw);
    const session = createGraphSession({ features: ["file-styles"] });
    await session.data.import(
        { type: sample.format, config: { data, errorLimit: 1_000_000 } },
        { styles: "file", layout: "recommended" },
    );
    return { session, sha256 };
}

/**
 * The reference scenes of a sample, best route first.
 * @param sample - the sample
 * @returns the scenes
 */
function references(sample: FidelitySample): Scene[] {
    return sample.routes.map(
        (route) =>
            JSON.parse(
                readFileSync(join(GRAPH_IO_TEST, "fidelity", "scenes", sample.id, `${route}.ref.json`), "utf8"),
            ) as Scene,
    );
}

/**
 * Each node's `name` and `label` columns, for routes that name nodes by them.
 * @param session - the loaded session
 * @returns graphty node id to each column's value
 */
function keys(session: GraphSession): { name: Map<string, string>; label: Map<string, string> } {
    const name = new Map<string, string>();
    const label = new Map<string, string>();
    for (const record of session.data.nodes()) {
        if (typeof record.name === "string" || typeof record.name === "number") {
            name.set(String(record.id), String(record.name));
        }
        if (typeof record.label === "string" || typeof record.label === "number") {
            label.set(String(record.id), String(record.label));
        }
    }
    return { name, label };
}

/**
 * The floors after a recording run: each floor raised to the score measured and never lowered, the
 * samples the run did not score kept as they were, each accepted drop's `to` raised to its score,
 * and a drop whose score is back at its floor taken off.
 * @param table - the floors as committed
 * @param scores - per sample, the scores this run measured
 * @returns the floors to write
 */
function merged(table: Floors, scores: Floors["floors"]): Floors {
    const out = structuredClone(table);
    const over = new Set<string>();
    for (const [id, row] of Object.entries(scores)) {
        raiseFloors(out.floors, id, row);
        for (const [p, rate] of Object.entries(row)) {
            const key = `${id}/${p}`;
            const drop = out.allowedDrops[key];
            if (drop === undefined) {
                continue;
            }
            if (rate >= out.floors[id][p] - EPSILON) {
                over.add(key);
            } else {
                drop.to = Math.max(drop.to, rate);
            }
        }
    }
    out.allowedDrops = Object.fromEntries(Object.entries(out.allowedDrops).filter(([key]) => !over.has(key)));
    return out;
}

describe("style fidelity scorecard: what graphty-element is asked to draw", () => {
    // Runs first: a planted fault in the requested scene must be caught, or every floor below
    // would be scoring nothing.
    it("self-check: a wrong fill and a wrong arrow are caught", async () => {
        const sample = SAMPLES.find((s) => s.id === "cyjs-genemania");
        assert.isDefined(sample);
        const { session, sha256 } = await load(sample);
        try {
            const scene = requestedScene(session, sha256, "self-check");
            const clean = compareScenes(scene, scene).properties;
            assert.strictEqual(clean.fill.passRate, 1);
            assert.strictEqual(clean.arrows.passRate, 1);
            const faulty: Scene = {
                ...scene,
                nodes: scene.nodes.map((n) => ({ ...n, fill: n.fill === "#ff00ff" ? "#00ff00" : "#ff00ff" })),
                edges: scene.edges.map((e) => ({
                    ...e,
                    arrow: { source: e.arrow.source, target: e.arrow.target === "tee" ? "circle" : "tee" },
                })),
            };
            const caught = compareScenes(scene, faulty).properties;
            assert.strictEqual(caught.fill.passRate, 0);
            assert.strictEqual(caught.arrows.passRate, 0);
        } finally {
            session.dispose();
        }
    });

    it.each([...SAMPLES, ...CORPUS_SAMPLES].map((s) => [s.id, s] as const))("%s", async (id, sample) => {
        const { session, sha256 } = await load(sample);
        try {
            const scene = requestedScene(session, sha256, `session.data.import(${sample.file}, { styles: "file" })`);
            const result = compareSample(id, references(sample), scene, keys(session));
            const scores: Record<string, number> = {};
            for (const p of REQUESTED_PROPERTIES) {
                const rate = result.properties[p].passRate;
                if (rate !== null) {
                    scores[p] = rate;
                }
            }
            recorded[id] = scores;
            if (RECORD) {
                return;
            }

            const floors = stored.floors[id] ?? {};
            const dropped = Object.entries(floors).flatMap(([p, floor]) => {
                const rate = scores[p];
                const accepted = stored.allowedDrops[`${id}/${p}`];
                const least = accepted === undefined ? floor : Math.min(floor, accepted.to);
                if (rate !== undefined && rate >= least - EPSILON) {
                    return [];
                }
                const worst = result.properties[p as keyof typeof result.properties].worst
                    .slice(0, 3)
                    .map((w) => `${w.id} (reference ${JSON.stringify(w.ref)}, asked ${JSON.stringify(w.got)})`);
                return [
                    `${id} ${p}: ${rate === undefined ? 'no longer judged (if on purpose, move it to "retired")' : rate.toFixed(4)} < floor ${floor.toFixed(4)}${accepted === undefined ? "" : ` (drop accepted to ${accepted.to.toFixed(4)})`}; worst: ${worst.join("; ") || "none listed"}`,
                ];
            });
            assert.deepEqual(dropped, [], `${id}: a property fell below its floor in requested-floors.json`);
            assert.deepEqual(
                Object.keys(scores).filter((p) => !(p in floors)),
                [],
                `${id}: a property is judged that has no floor; record the floors`,
            );
            assert.deepEqual(
                Object.keys(stored.retired ?? {}).filter((key) => {
                    const [sampleId, p] = key.split("/");
                    return sampleId === id && (p in floors || p in scores);
                }),
                [],
                `${id}: a property listed in "retired" has a floor or is judged again; drop one or the other`,
            );
        } finally {
            session.dispose();
        }
    });

    afterAll(() => {
        if (RECORD) {
            writeFileSync(FLOORS, `${JSON.stringify(merged(stored, recorded), null, 4)}\n`);
            return;
        }
        // One line per raised score, so a fix shows which floors it can raise.
        for (const [id, scores] of Object.entries(recorded)) {
            for (const [p, rate] of Object.entries(scores)) {
                const floor = stored.floors[id]?.[p];
                if (floor !== undefined && rate > floor + EPSILON) {
                    console.info(`fidelity: ${id} ${p} rose to ${rate.toFixed(4)} (floor ${floor.toFixed(4)})`);
                }
            }
        }
    });
});
