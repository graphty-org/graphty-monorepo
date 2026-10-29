/**
 * Writes the saved-filter-steps fixtures that `filter-conditions-migration.test.ts` opens: a
 * project file, a project file holding a malformed step, and the journal of the commands, each made
 * by an element from before filter conditions existed, with what that element showed.
 *
 * Run it against that element's source, not this one:
 *
 * ```sh
 * git archive dff9b04575 graphty-element | tar -x -C tmp/filter-cards/master-src
 * ln -s "$PWD/graphty-element/node_modules" tmp/filter-cards/master-src/graphty-element/node_modules
 * npx tsx graphty-element/test/session/visibility/fixtures/make-master-steps.ts \
 *     tmp/filter-cards/master-src/graphty-element
 * ```
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

/** The parts of a session this script drives, typed loosely: it runs against another version. */
interface OldSession {
    data: { import(input: unknown): Promise<unknown> };
    visibility: {
        setSteps(steps: unknown[]): Promise<unknown>;
        readonly nodes: ReadonlySet<string>;
        readonly edges: ReadonlySet<string>;
        readonly steps: unknown;
    };
    selection: { apply(target: unknown): Promise<unknown> };
    project: { save(): Promise<{ text: string }> };
    journal: { readonly entries: readonly { readonly command: unknown }[] };
    time: { setSettings(settings: unknown): Promise<unknown> };
    dispose(): void;
}

/** Hosts and services, with a score; weighted edges; one isolated node. */
export const DATA = JSON.stringify({
    nodes: [
        { id: "a", type: "host", score: 0.9, email: "a@x" },
        { id: "b", type: "host", score: 0.2 },
        { id: "c", type: "service", score: 0.8, email: "c@x" },
        { id: "d", type: "service", score: 0.1 },
        { id: "e", type: "host", score: 0.75 },
        { id: "f", type: "service", score: 0.5 },
        { id: "z", type: "host", score: 0.3 },
    ],
    edges: [
        { src: "a", dst: "b", weight: 5 },
        { src: "b", dst: "c", weight: 1 },
        { src: "c", dst: "d", weight: 2 },
        { src: "d", dst: "e", weight: 6 },
        { src: "a", dst: "e", weight: 3 },
        { src: "e", dst: "f", weight: 4 },
    ],
});

/** One step of every kind the graphty app wrote, each as the app wrote it. */
export const STEPS = [
    // Keep, matching one field.
    { id: "keep-hosts", on: false, rule: { kind: "categories", attribute: "data.type", values: ["host"] } },
    // Keep, matching two fields.
    {
        id: "keep-two",
        on: true,
        rule: {
            kind: "all",
            of: [
                { kind: "range", attribute: "data.score", min: 0.1 },
                { kind: "text", reads: "data.type", mode: "substring", text: "s" },
            ],
        },
    },
    // Hide, matching two fields.
    {
        id: "hide-two",
        on: true,
        rule: {
            kind: "not",
            of: {
                kind: "all",
                of: [
                    { kind: "categories", attribute: "data.type", values: ["service"] },
                    { kind: "range", attribute: "data.score", max: 0.15 },
                ],
            },
        },
    },
    // Hide an edge field: the app's edge leaf reads "ends".
    {
        id: "hide-heavy",
        on: false,
        rule: { kind: "not", of: { kind: "range", attribute: "data.weight", min: 6, nodes: "ends" } },
    },
    // Keep an edge field.
    { id: "keep-edges", on: true, rule: { kind: "range", attribute: "data.weight", min: 2, nodes: "ends" } },
    // Keep "has no value".
    {
        id: "no-email",
        on: false,
        rule: { kind: "not", of: { kind: "text", reads: "data.email", mode: "regex", text: "" } },
    },
    // Largest component.
    { id: "largest", on: true, rule: { kind: "member", of: "largest-component" } },
    // Neighbors of the selection, at depth 3.
    { id: "near-a", on: true, rule: { kind: "neighborhood", seeds: ["a"], depth: 3 } },
    // A column that does not exist.
    { id: "missing", on: false, rule: { kind: "range", attribute: "data.nothing", min: 1 } },
];

/**
 * A session over the data, with the steps set.
 * @param create - The old element's `createGraphSession`.
 * @returns The session.
 */
async function sessionWithSteps(create: () => OldSession): Promise<OldSession> {
    const session = create();
    await session.data.import({ type: "json", config: { data: DATA } });
    // One step at a time, as the app adds them, so the journal holds each.
    for (let count = 1; count <= STEPS.length; count++) {
        await session.visibility.setSteps(STEPS.slice(0, count));
    }

    await session.time.setSettings({ mode: "cumulative" });
    await session.selection.apply({ nodes: ["b", "c"] });
    return session;
}

/**
 * Write the fixtures.
 * @param elementDir - The old element's package directory.
 */
async function main(elementDir: string): Promise<void> {
    const old = (await import(resolve(elementDir, "session.ts"))) as { createGraphSession: () => OldSession };
    const pkg = (await import(resolve(elementDir, "package.json"), { with: { type: "json" } })) as {
        default: { version: string };
    };
    const out = (name: string, value: unknown): void => {
        writeFileSync(new URL(name, import.meta.url), `${JSON.stringify(value, null, 2)}\n`);
    };

    const session = await sessionWithSteps(old.createGraphSession);
    const saved = await session.project.save();
    out("master-steps.project.json", JSON.parse(saved.text));
    out("master-steps.expected.json", {
        madeBy: `@graphty/graphty-element ${pkg.default.version} (source at dff9b04575)`,
        steps: session.visibility.steps,
        nodes: [...session.visibility.nodes].sort(),
        edges: [...session.visibility.edges].sort(),
    });
    out("master-steps.journal.json", {
        madeBy: `@graphty/graphty-element ${pkg.default.version} (source at dff9b04575)`,
        commands: session.journal.entries
            .map((entry) => entry.command)
            .filter((command) => (command as { op: string }).op.startsWith("visibility.")),
    });
    session.dispose();

    // A file whose steps hold one malformed step: that element refused all of them.
    const document = JSON.parse(saved.text) as { members: { kind: string; visibility?: { steps: unknown[] } }[] };
    const member = document.members.find((each) => each.kind === "graphty-session");
    member?.visibility?.steps.push({ id: "broken", on: "yes", rule: null });
    const opened = old.createGraphSession() as OldSession & {
        project: { open(text: string): Promise<{ problems: unknown[] }> };
    };
    const report = await opened.project.open(JSON.stringify(document));
    out("master-steps-malformed.project.json", document);
    out("master-steps-malformed.expected.json", {
        madeBy: `@graphty/graphty-element ${pkg.default.version} (source at dff9b04575)`,
        problems: report.problems,
        steps: opened.visibility.steps,
        nodes: [...opened.visibility.nodes].sort(),
        edges: [...opened.visibility.edges].sort(),
    });
    opened.dispose();
}

await main(process.argv[2] ?? "");
