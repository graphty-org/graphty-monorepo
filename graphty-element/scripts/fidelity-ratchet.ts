/**
 * Applies a style fidelity run to the committed records, in the same commit as the change that moved them:
 *
 * - takes off the known failures every element that passes now (one that is not measurable any more stays listed);
 * - raises every recorded pass rate (the informational floors) to what the run measured, never lowering one;
 * - with `--add "<reason>"`, adds every element failing that the known failures do not list, and records the reason,
 *   the date and how many came from the drawing or from the comparator (`--keys` and `--properties` limit what is
 *   added to those keys and properties). Nothing is added without a reason;
 * - for the oracle scorecard, takes off an accepted drop (`drops` in the floors file) whose rate is back at its floor,
 *   and with `--add "<reason>"` accepts every rate below its floor at the rate measured, with the reason. The floor
 *   itself stays: it is the best the property has measured.
 *
 * It reads the verdicts the last run wrote: `tmp/oracle-report/gate.json` (the oracle scorecard,
 * `test/fidelity/oracle-report.test.ts`) into `test/fidelity/oracle-known-failures.json` and
 * `test/fidelity/oracle-floors.json`, and `test/fidelity/out/gate.json` (the drawn-scene scorecard,
 * `test/fidelity/fidelity.test.ts`) into `test/fidelity/baseline-scores.json`.
 *
 *     npm run fidelity:ratchet
 *     npm run fidelity:ratchet -- --add "why these elements fail now" [--keys <key>,<key>] [--properties <p>,<p>]
 *         [--suite oracle|drawn]
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import {
    type AcceptedDrops,
    FLOOR_SECTIONS,
    type Floors,
    type FloorSection,
    type KeyGate,
    type KnownRecords,
    knownText,
    raiseFloors,
    ratchetDrops,
    ratchetKnown,
} from "../test/fidelity/oracle/floors";

const { values } = parseArgs({
    options: {
        add: { type: "string" },
        keys: { type: "string" },
        properties: { type: "string" },
        suite: { type: "string" },
    },
});

const today = new Date().toISOString().slice(0, 10);
const add =
    values.add === undefined
        ? undefined
        : { reason: values.add, date: today, keys: values.keys?.split(","), properties: values.properties?.split(",") };

/** A run's verdicts, as the tests write them. */
interface GateFile {
    gpu: string;
    baseline: string | null;
    keys: KeyGate[];
}

/**
 * Reads a run's verdicts, or says there are none.
 * @param path - the gate file
 * @returns the verdicts, or null
 */
function readGate(path: string): GateFile | null {
    if (!existsSync(path)) {
        console.log(`${path}: no run to apply`);
        return null;
    }
    const gate = JSON.parse(readFileSync(path, "utf8")) as GateFile;
    console.log(
        `${path}: ${String(gate.keys.length)} keys, written ${statSync(path).mtime.toISOString()}, GPU path ${gate.gpu}`,
    );
    return gate;
}

/**
 * Prints what a ratchet changed.
 * @param name - the records file
 * @param out - the ratchet's counts
 * @param out.removed - elements taken off
 * @param out.added - elements added
 * @param out.unlisted - elements failing that were not added
 * @param raised - floors raised or recorded
 */
function report(name: string, out: { removed: number; added: number; unlisted: number }, raised: number): void {
    console.log(
        `${name}: ${String(out.removed)} known failures passing now taken off, ${String(out.added)} added, ${String(raised)} floors raised or recorded`,
    );
    if (out.unlisted > 0) {
        console.log(
            `${name}: ${String(out.unlisted)} elements fail that the known failures do not list; fix them, or add them with --add "<reason>" (see gate.txt)`,
        );
        process.exitCode = 1;
    }
}

const suite = values.suite ?? "all";

if (suite === "all" || suite === "oracle") {
    const gate = readGate("tmp/oracle-report/gate.json");
    if (gate !== null) {
        const knownPath = "test/fidelity/oracle-known-failures.json";
        const floorsPath = "test/fidelity/oracle-floors.json";
        const known = JSON.parse(readFileSync(knownPath, "utf8")) as KnownRecords;
        const floors = JSON.parse(readFileSync(floorsPath, "utf8")) as Partial<Record<FloorSection, Floors>> & {
            about: string;
            lowered: Record<string, unknown>;
            drops?: AcceptedDrops;
        };
        const sections = Object.fromEntries(FLOOR_SECTIONS.map((s) => [s, floors[s] ?? {}])) as Record<
            FloorSection,
            Floors
        >;
        const out = ratchetKnown({ ...known, reasons: known.reasons ?? [] }, gate.keys, add);
        const drops = ratchetDrops(floors.drops ?? {}, gate.keys, add);
        let raised = 0;
        const sectionOf = new Map(gate.keys.map((g) => [g.key, g.section]));
        for (const g of gate.keys) {
            // a key's floors go with the real programs, the stand-ins or the specification by what judged it
            const into = sections[g.section];
            const other = FLOOR_SECTIONS.map((s) => sections[s][g.key]).find((row) => row !== undefined);
            if (other !== undefined && into[g.key] === undefined) {
                into[g.key] = other;
            }
            raised += raiseFloors(into, g.key, g.scores);
        }
        const kept = (section: FloorSection): Floors =>
            Object.fromEntries(
                Object.keys(sections[section])
                    .filter((k) => (sectionOf.get(k) ?? section) === section)
                    .sort((a, b) => a.localeCompare(b))
                    .map((k) => [k, sections[section][k]]),
            );
        writeFileSync(knownPath, knownText(out.records));
        writeFileSync(
            floorsPath,
            `${JSON.stringify(
                {
                    about: floors.about,
                    floors: kept("floors"),
                    standInFloors: kept("standInFloors"),
                    specificationFloors: kept("specificationFloors"),
                    lowered: floors.lowered,
                    drops: drops.drops,
                },
                null,
                4,
            )}\n`,
        );
        report(knownPath, out, raised);
        console.log(
            `${floorsPath}: ${String(drops.removed)} accepted drops back at their floor taken off, ${String(drops.added)} accepted`,
        );
        if (drops.unaccepted > 0) {
            console.log(
                `${floorsPath}: ${String(drops.unaccepted)} rates are below their floor; fix them, or accept them with --add "<reason>" (see gate.txt)`,
            );
            process.exitCode = 1;
        }
    }
}

if (suite === "all" || suite === "drawn") {
    const gate = readGate("test/fidelity/out/gate.json");
    if (gate !== null) {
        const path = "test/fidelity/baseline-scores.json";
        const file = JSON.parse(readFileSync(path, "utf8")) as KnownRecords & { floors: Floors };
        const out = ratchetKnown({ about: file.about, known: file.known, reasons: file.reasons }, gate.keys, add);
        let raised = 0;
        for (const g of gate.keys) {
            raised += raiseFloors(file.floors, g.key, g.scores);
        }
        writeFileSync(path, knownText(out.records, file.floors));
        report(path, out, raised);
    }
}
