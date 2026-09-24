/**
 * The format conformance suite, in four layers:
 *
 * 1. the static corpus: every fixture of every manifest under fixtures/ against its expected
 *    result, and the import -> export -> import round trip for the formats graph-io writes;
 * 2. the networkx differential fixtures (fixtures/<format>/networkx-generated/, written by
 *    tools/differential.py): networkx writes, networkx reads back, and graph-io must read the same
 *    graph -- they are ordinary manifest entries, so layer 1 runs them;
 * 3. property-based round trips (generative.ts): fast-check graphs through every exporter
 *    configuration and back from bytes, equal but for the losses check() announces, plus the
 *    committed minimal cases the properties shrank bugs to (fixtures/generative/cases.json);
 * 4. schema validation (schemas.ts): every GraphML, GEXF and JGF export against the official
 *    XSDs and JSON Schema, when Python has lxml and jsonschema.
 *
 * A fixture marked `knownFailure` (or `roundTripFailure`), a minimal case with `knownFailure` and a
 * SCHEMA_KNOWN_FAILURES entry run as expected failures: the suite stays green while graph-io misses
 * the expectation and turns red the moment a fix lands without the marker being removed.
 *
 * GRAPH_IO_PROPERTY_RUNS (default 300 graphs per exporter configuration) and
 * GRAPH_IO_PROPERTY_SEED set the size and the seed of the property runs; a nightly sweep raises
 * the first and varies the second. GRAPH_IO_SCHEMA_PYTHON names the Python for layer 4 (default
 * python3; the layer is skipped when it lacks lxml or jsonschema, and required when
 * GRAPH_IO_REQUIRE_SCHEMAS is set).
 *
 * `CONFORMANCE_REPORT=1 pnpm exec vitest run test/conformance` also writes REPORT.md next to this
 * file: per format, the fixture count, how many conform, and the known failures grouped by cause,
 * then the results of the generative and schema layers.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import fc from "fast-check";
import { afterAll, describe, expect, it } from "vitest";

import {
    graphArb,
    KNOWN_FAILURES,
    knownFailureOf,
    loadCases,
    NOTE_RELAX,
    type Relax,
    roundTrip,
    targetNamed,
    TARGETS,
} from "./generative.js";
import { checkFixture, checkRoundTrip, type Fixture, loadManifests, roundTrips } from "./harness.js";
import {
    classifyDocument,
    SCHEMA_DEVIATIONS,
    SCHEMA_KNOWN_FAILURES,
    schemaPython,
    type SchemaResult,
    validateExports,
} from "./schemas.js";

const PROPERTY_RUNS = Number(process.env.GRAPH_IO_PROPERTY_RUNS ?? "300");
const PROPERTY_SEED = Number(process.env.GRAPH_IO_PROPERTY_SEED ?? "20260923");

interface Row {
    readonly format: string;
    readonly fixture: Fixture;
    readonly problems: readonly string[];
    readonly roundTrip: readonly string[] | null;
}

const rows = new Map<string, Row>();

const record = (format: string, fixture: Fixture, patch: Partial<Row>): void => {
    const key = `${format}/${fixture.file}`;
    const row = rows.get(key) ?? { format, fixture, problems: [], roundTrip: null };
    rows.set(key, { ...row, ...patch });
};

for (const manifest of loadManifests()) {
    const { format } = manifest;
    describe(`conformance: ${format}`, () => {
        for (const fixture of manifest.fixtures) {
            const test = fixture.knownFailure === undefined ? it : it.fails;
            test(fixture.file, async () => {
                const problems = await checkFixture(format, fixture);
                record(format, fixture, { problems });
                expect(problems).toEqual([]);
            });
        }
    });
    describe(`round trip: ${format}`, () => {
        for (const fixture of manifest.fixtures.filter((f) => roundTrips(format, f))) {
            const test = fixture.roundTripFailure === undefined ? it : it.fails;
            test(fixture.file, async () => {
                const problems = await checkRoundTrip(format, fixture);
                record(format, fixture, { roundTrip: problems });
                expect(problems).toEqual([]);
            });
        }
    });
}

/** One exporter configuration's property run. */
interface PropertyRow {
    runs: number;
    equal: number;
    refused: number;
    known: number;
    readonly relaxed: Set<Relax>;
    readonly refusals: Set<string>;
}

const propertyRows = new Map<string, PropertyRow>();

describe("generative: property round trips", () => {
    for (const target of TARGETS) {
        it(target.name, async () => {
            const row: PropertyRow = {
                runs: 0,
                equal: 0,
                refused: 0,
                known: 0,
                relaxed: new Set(),
                refusals: new Set(),
            };
            propertyRows.set(target.name, row);
            await fc.assert(
                fc.asyncProperty(graphArb, async (g) => {
                    row.runs++;
                    if (knownFailureOf(target, g) !== undefined) {
                        row.known++;
                        return;
                    }
                    const out = await roundTrip(target, g);
                    if (out.kind === "different") {
                        throw new Error(out.problems.join("\n"));
                    }
                    if (out.kind === "refused") {
                        row.refused++;
                        row.refusals.add(out.code);
                    } else {
                        row.equal++;
                        out.relaxed.forEach((r) => row.relaxed.add(r));
                    }
                }),
                { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED },
            );
        });
    }
});

const cases = loadCases();

describe("generative: minimal cases", () => {
    for (const c of cases) {
        for (const name of c.targets) {
            const test = c.knownFailure === undefined ? it : it.fails;
            test(`${c.name} (${name})`, async () => {
                const out = await roundTrip(targetNamed(name), c.graph);
                expect(out.kind === "different" ? out.problems : []).toEqual([]);
            });
        }
    }
});

let schemaResult: SchemaResult | null = null;
const python = schemaPython();

describe("schemas: exports against the official XSDs and JSON Schema", () => {
    if (python === null && process.env.GRAPH_IO_REQUIRE_SCHEMAS !== undefined) {
        it("has Python with lxml and jsonschema", () => {
            expect.fail("GRAPH_IO_REQUIRE_SCHEMAS is set but no Python with lxml and jsonschema was found");
        });
    }
    const hits = (name: string): number =>
        (schemaResult?.invalid ?? []).flatMap((doc) => classifyDocument(doc)).filter((e) => e.cls?.name === name)
            .length;
    it.skipIf(python === null)(
        "every error is a documented deviation or a known failure",
        async () => {
            schemaResult = await validateExports(python ?? "python3");
            const unexplained = schemaResult.invalid.flatMap((doc) =>
                classifyDocument(doc)
                    .filter((e) => e.cls === null)
                    .map((e) => `${doc.file}: ${e.message}`),
            );
            expect(unexplained).toEqual([]);
        },
        120_000,
    );
    for (const known of SCHEMA_KNOWN_FAILURES) {
        it.skipIf(python === null).fails(`known failure: ${known.name}`, () => {
            expect(hits(known.name)).toBe(0);
        });
    }
});

afterAll(() => {
    if (process.env.CONFORMANCE_REPORT === undefined || rows.size === 0) {
        return;
    }
    writeFileSync(
        join(dirname(fileURLToPath(import.meta.url)), "REPORT.md"),
        renderReport([...rows.values()], propertyRows, schemaResult),
    );
});

/**
 * The markdown report.
 * @param all - every recorded fixture row
 * @param properties - the property runs, by target
 * @param schema - the schema validation result, or null when it did not run
 * @returns the document
 */
function renderReport(
    all: readonly Row[],
    properties: ReadonlyMap<string, PropertyRow>,
    schema: SchemaResult | null,
): string {
    const out: string[] = [
        "<!-- THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT graph-io/test/conformance/",
        "     (the manifests under fixtures/, generative.ts, schemas.ts and conformance.test.ts) and rerun",
        "     CONFORMANCE_REPORT=1 pnpm exec vitest run test/conformance -->",
        "",
        "# graph-io conformance report",
        "",
        "Every fixture is imported as bytes and compared with an expectation taken from an independent",
        "reader or the format's specification. A known failure is a case where graph-io does not meet",
        "the expectation today; the reference points into",
        "`sources.md` next to this report (the research notes behind this corpus).",
        "",
        "| Format | Fixtures | Conform | Known failures | Round trips | Round-trip failures |",
        "|---|---|---|---|---|---|",
    ];
    const formats = [...new Set(all.map((r) => r.format))].sort();
    for (const format of formats) {
        const mine = all.filter((r) => r.format === format);
        const known = mine.filter((r) => r.fixture.knownFailure !== undefined).length;
        const trips = mine.filter((r) => r.roundTrip !== null);
        const tripFails = trips.filter((r) => r.fixture.roundTripFailure !== undefined).length;
        out.push(`| ${format} | ${mine.length} | ${mine.length - known} | ${known} | ${trips.length} | ${tripFails} |`);
    }
    renderDifferential(all, out);
    for (const format of formats) {
        renderFormat(
            all.filter((r) => r.format === format),
            format,
            out,
        );
    }
    renderProperties(properties, out);
    renderSchemas(schema, out);
    return `${out.join("\n").trimEnd()}\n`;
}

/**
 * The networkx differential summary: per format, and every disagreement with networkx.
 * @param all - every recorded fixture row
 * @param out - the lines
 */
function renderDifferential(all: readonly Row[], out: string[]): void {
    const mine = all.filter((r) => r.fixture.oracle === "networkx-differential");
    out.push(
        "",
        "## networkx differential",
        "",
        "`tools/differential.py` writes seeded networkx graphs with networkx 3.1's own writers into",
        "`fixtures/<format>/networkx-generated/` and records networkx's read-back as the expectation;",
        "they are counted in the table above. Where networkx departs from the specification the",
        "expectation follows the specification and the entry says why.",
        "",
        "| Format | Files | Conform | Known failures | networkx overruled |",
        "|---|---|---|---|---|",
    );
    for (const format of [...new Set(mine.map((r) => r.format))].sort()) {
        const rows = mine.filter((r) => r.format === format);
        const known = rows.filter((r) => r.fixture.knownFailure !== undefined).length;
        const overruled = rows.filter((r) => r.fixture.networkxDisagrees !== undefined).length;
        out.push(`| ${format} | ${rows.length} | ${rows.length - known} | ${known} | ${overruled} |`);
    }
    const reasons = new Map<string, number>();
    for (const row of mine) {
        const reason = row.fixture.networkxDisagrees;
        if (reason !== undefined) {
            reasons.set(`${row.format}: ${reason}`, (reasons.get(`${row.format}: ${reason}`) ?? 0) + 1);
        }
    }
    if (reasons.size > 0) {
        out.push("", "Where networkx is overruled:", "");
        for (const [reason, count] of reasons) {
            out.push(`- ${reason} (${count} files)`);
        }
    }
}

/**
 * One format's known failures, grouped by cause.
 * @param mine - the format's rows
 * @param format - the format
 * @param out - the lines
 */
function renderFormat(mine: readonly Row[], format: string, out: string[]): void {
    out.push("", `## ${format}`, "");
    const causes = new Map<string, Row[]>();
    for (const row of mine) {
        for (const cause of [row.fixture.knownFailure, row.fixture.roundTripFailure]) {
            if (cause !== undefined) {
                const prefix = cause === row.fixture.knownFailure ? "" : "round trip: ";
                causes.set(prefix + cause, [...(causes.get(prefix + cause) ?? []), row]);
            }
        }
    }
    if (causes.size === 0) {
        out.push("No known failures.");
        return;
    }
    const sorted = [...causes.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    for (const [cause, list] of sorted) {
        out.push(`### ${cause} (${list.length})`, "");
        for (const row of list) {
            const detail = cause.startsWith("round trip: ") ? (row.roundTrip ?? []) : row.problems;
            out.push(
                `- \`${row.fixture.file}\`: ${detail.slice(0, 2).join("; ").replace(/\|/g, "\\|") || "(no detail)"}`,
            );
        }
        out.push("");
    }
}

/**
 * The property round trips: per exporter configuration, and the minimal cases.
 * @param properties - the property runs, by target
 * @param out - the lines
 */
function renderProperties(properties: ReadonlyMap<string, PropertyRow>, out: string[]): void {
    out.push(
        "",
        "## Generative round trips",
        "",
        `fast-check graphs (seed ${PROPERTY_SEED}, ${PROPERTY_RUNS} per configuration; generative.ts) are`,
        "exported, re-imported from bytes and compared with the original. A difference is allowed only",
        "when a check() note announced it (the table below); an export that throws only when check()",
        "announced an E_ code (a documented refusal).",
        "",
        "| Configuration | Graphs | Equal | Documented refusals | Skipped (known failure) | Documented losses exercised |",
        "|---|---|---|---|---|---|",
    );
    for (const [name, row] of properties) {
        const refusals = row.refusals.size === 0 ? "" : ` (${[...row.refusals].sort().join(", ")})`;
        const relaxed = [...row.relaxed].sort().join(", ") || "none";
        out.push(`| ${name} | ${row.runs} | ${row.equal} | ${row.refused}${refusals} | ${row.known} | ${relaxed} |`);
    }
    out.push("", "The documented losses (a check() note code and the difference it allows):", "");
    for (const [code, relax] of Object.entries(NOTE_RELAX)) {
        out.push(`- \`${code}\`: ${relax.join(", ")}`);
    }
    out.push("", "Minimal cases (`fixtures/generative/cases.json`):", "");
    for (const c of cases) {
        const status = c.knownFailure === undefined ? "fixed, regression" : `known failure: ${c.knownFailure}`;
        out.push(`- \`${c.name}\` (${c.targets.length} configuration(s)): ${c.exercises}. ${status}`);
    }
    if (KNOWN_FAILURES.length > 0) {
        out.push("", "Graphs the properties skip until the known failure is fixed:", "");
        for (const k of KNOWN_FAILURES) {
            out.push(`- ${k.target}: ${k.cause}`);
        }
    }
}

/**
 * The schema layer: what was validated, and every error class.
 * @param schema - the result, or null when the layer did not run
 * @param out - the lines
 */
function renderSchemas(schema: SchemaResult | null, out: string[]): void {
    out.push("", "## Schema validation", "");
    if (schema === null) {
        out.push("Not run: no Python with lxml and jsonschema (set GRAPH_IO_SCHEMA_PYTHON).");
        return;
    }
    const checked = Object.entries(schema.checked)
        .sort()
        .map(([kind, n]) => `${n} ${kind}`)
        .join(", ");
    const classes = new Map<string, number>();
    for (const doc of schema.invalid) {
        for (const { cls } of classifyDocument(doc)) {
            const key = cls === null ? "unexplained" : cls.name;
            classes.set(key, (classes.get(key) ?? 0) + 1);
        }
    }
    out.push(
        `Validated ${checked} exports (GraphML 1.0 XSD, GEXF 1.2draft and 1.3 XSDs, JGF v2 JSON Schema; schemas.ts);`,
        `${schema.invalid.length} documents have at least one error.`,
        "",
        "| Class | Errors | Kind | Why |",
        "|---|---|---|---|",
    );
    for (const [kind, list] of [
        ["deviation", SCHEMA_DEVIATIONS],
        ["known failure", SCHEMA_KNOWN_FAILURES],
    ] as const) {
        for (const c of list) {
            out.push(
                `| ${c.name} (${c.kind}) | ${classes.get(c.name) ?? 0} | ${kind} | ${c.reason.replace(/\|/g, "\\|")} |`,
            );
        }
    }
}
