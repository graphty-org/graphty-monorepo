/**
 * @file `project.open` on version 1 files the session does not write itself: a document whose
 * version or members are malformed, a bare member, the kind-less style of graphty-element 2.x,
 * session fields of a newer version, saved views with no camera, a background shader the file does
 * not carry, and a `columns` option that maps a name to no column. What can be read opens; what
 * cannot is refused with its code, or reported and skipped.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, isGraphtyError } from "../../session";
import { baseSession } from "../helpers/project-session";

type V1File = { members: Record<string, unknown>[] } & Record<string, unknown>;

/**
 * A version 1 project file of the three-node session.
 * @returns The file.
 */
async function projectFile(): Promise<V1File> {
    const session = await baseSession();
    const file = JSON.parse((await session.project.save({ format: 1 })).text) as V1File;
    session.dispose();
    return file;
}

/**
 * The session member of a file.
 * @param file - The file.
 * @returns The member.
 */
function sessionMember(file: V1File): Record<string, unknown> {
    const found = file.members.find((each) => each.kind === "graphty-session");
    assert.isDefined(found);
    return found;
}

/**
 * Open a file in a new session.
 * @param file - The file, or its text.
 * @param options - The open options.
 * @returns The session and the report, or the refusal's code and details.
 */
async function open(
    file: unknown,
    options: Parameters<GraphSession["project"]["open"]>[1] = {},
): Promise<
    | { session: GraphSession; report: Awaited<ReturnType<GraphSession["project"]["open"]>> }
    | { code: string; details: unknown }
> {
    const session = createGraphSession();
    try {
        const report = await session.project.open(typeof file === "string" ? file : JSON.stringify(file), options);
        return { session, report };
    } catch (error) {
        session.dispose();
        if (!isGraphtyError(error)) {
            throw error;
        }

        return { code: error.code, details: error.details };
    }
}

/**
 * Open a file that must open.
 * @param file - The file.
 * @param options - The open options.
 * @returns The session and the report.
 */
async function opened(
    file: unknown,
    options: Parameters<GraphSession["project"]["open"]>[1] = {},
): Promise<{ session: GraphSession; report: Awaited<ReturnType<GraphSession["project"]["open"]>> }> {
    const result = await open(file, options);
    assert.notProperty(result, "code", JSON.stringify(result));
    return result as { session: GraphSession; report: Awaited<ReturnType<GraphSession["project"]["open"]>> };
}

/**
 * The code a file is refused with.
 * @param file - The file.
 * @param options - The open options.
 * @returns The code.
 */
async function refusedWith(
    file: unknown,
    options: Parameters<GraphSession["project"]["open"]>[1] = {},
): Promise<string> {
    const result = await open(file, options);
    assert.property(result, "code");
    return (result as { code: string }).code;
}

describe("a document the open refuses", () => {
    it("refuses a version that is no positive whole number as a bad document", async () => {
        for (const version of [0, -1, 1.5]) {
            assert.strictEqual(
                await refusedWith({ kind: "graphty-document", version, members: [] }),
                "E_BAD_DOCUMENT",
                String(version),
            );
        }
    });

    it("refuses a version 2 file without the experiment, naming the experiment that reads it", async () => {
        const result = await open({ kind: "graphty-document", version: 2, sections: {} });
        assert.deepStrictEqual(result, {
            code: "E_UNSUPPORTED_VERSION",
            details: { kind: "graphty-document", found: 2, reads: [1], feature: "save-files-v2" },
        });
    });

    it("refuses a columns option mapping a name to no column, or naming another table", async () => {
        const session = createGraphSession({ features: ["save-files-v2"] });
        const text = JSON.stringify(await projectFile());
        for (const columns of [{ node: { dept: "" } }, { edge: { weight: 3 } }, { graph: {} }]) {
            const refusal = await session.project.inspect(text, { columns: columns as never }).then(
                () => null,
                (error: unknown) => error,
            );
            if (!isGraphtyError(refusal)) {
                assert.fail(`inspect took ${JSON.stringify(columns)}: ${String(refusal)}`);
            }

            assert.strictEqual(refusal.code, "E_OPTION_RANGE");
            assert.strictEqual((refusal.details as { option?: unknown }).option, "columns");
        }

        session.dispose();
    });
});

describe("a document's members", () => {
    it("reports a member that is not one, one of a version this element does not read and a second session", async () => {
        const file = await projectFile();
        const second = { ...sessionMember(file) };
        file.members.push(
            "loose" as never,
            { kind: "graphty-notes", version: 0 },
            { kind: "graphty-notes", version: 9 },
            second,
        );
        const count = file.members.length;
        const { session, report } = await opened(file);
        assert.strictEqual(report.opened, "project");
        assert.deepStrictEqual(report.problems, [
            { code: "E_BAD_DOCUMENT", params: { index: count - 4 } },
            { code: "E_BAD_DOCUMENT", params: { index: count - 3 } },
            { code: "E_UNSUPPORTED_VERSION", params: { index: count - 2, kind: "graphty-notes", found: 9 } },
            { code: "E_UNSUPPORTED", params: { index: count - 1, kind: "graphty-session" } },
        ]);
        assert.strictEqual(session.data.nodes().length, 3);
        session.dispose();
    });

    it("reads a bare notes member as a document holding it, added to the session", async () => {
        const source = await baseSession();
        source.notes.add({ text: "loose note", targets: [{ node: "a" }] });
        const notes = source.notes.toDocument();
        source.dispose();
        const { session, report } = await opened(notes);
        assert.strictEqual(report.opened, "document");
        assert.deepStrictEqual(
            session.notes.list().map((note) => note.text),
            ["loose note"],
        );
        session.dispose();
    });

    it("reads the kind-less style graphty-element 2.x wrote as a style document", async () => {
        const { session, report } = await opened({
            version: 1,
            layers: [{ name: "Big", selector: { match: "everything" }, set: { "node.size": 4 } }],
        });
        assert.strictEqual(report.opened, "document");
        assert.include(
            session.styles.list().map((layer) => layer.name),
            "Big",
        );
        session.dispose();
    });
});

describe("a timed project saved before what lies outside the window had a state of its own", () => {
    it("reads every ghosted leaf of its layers and rule sets, however deep, as outside the window", async () => {
        const session = createGraphSession({ workingGraph: false });
        const nodes = Array.from({ length: 4 }, (_, i) => ({ id: `s${String(i)}`, step: i }));
        await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes, edges: [] }) } });
        await session.time.setField({ nodes: { start: "step" } });
        await session.time.window({ from: 1, to: 2 });
        const outside = { kind: "state", state: "outsideWindow" } as const;
        const selected = { kind: "state", state: "selected" } as const;
        const rules = {
            "Any outside": { kind: "any", of: [selected, outside] },
            "Not outside": { kind: "not", of: outside },
            "Union outside": {
                kind: "union",
                side: "nodes",
                within: "visible",
                branches: [{ start: "none", color: "#009E73", steps: [{ op: "add", rule: outside }] }],
            },
            "Union selected": {
                kind: "union",
                side: "nodes",
                within: "visible",
                branches: [{ start: "none", color: "#009E73", steps: [{ op: "add", rule: selected }] }],
            },
            "Selected only": { kind: "all", of: [selected] },
            "Not selected": { kind: "not", of: selected },
        };
        for (const [name, where] of Object.entries(rules)) {
            await session.styles.add({
                name,
                target: "node",
                selector: { match: "rule", where: where as never },
                set: { "node.size": 2 },
            });
        }

        const late = { kind: "range", attribute: "data.step", min: 2 } as const;
        session.sets.create({ kind: "rule", where: { kind: "any", of: [late] }, reading: "induced" }, { name: "Late" });
        session.sets.create({ kind: "rule", where: "data.step > `2`", reading: "induced" }, { name: "Latest" });
        session.sets.create({ kind: "fixed", nodes: ["s0"], reading: "induced" }, { name: "First" });
        const saved = new Map(
            session.styles.list().map((layer) => [layer.name, (layer.selector as { where?: unknown }).where]),
        );
        const { text } = await session.project.save();
        session.dispose();
        // An older writer wrote no outsideByLayers mark, and its "ghosted" meant outside the window.
        const file = JSON.parse(
            text.replace(',"outsideByLayers":true', "").replaceAll('"state":"outsideWindow"', '"state":"ghosted"'),
        ) as V1File;
        assert.notInclude(JSON.stringify(file), "outsideWindow");
        const before = JSON.stringify(file);

        const reopened = createGraphSession();
        const report = await reopened.project.open(before);
        assert.deepStrictEqual(report.problems, []);
        const where = (name: string): unknown =>
            (reopened.styles.list().find((layer) => layer.name === name)?.selector as { where?: unknown }).where;
        for (const name of Object.keys(rules)) {
            assert.deepStrictEqual(where(name), saved.get(name), name);
        }

        const definitions = new Map(reopened.sets.list().map((each) => [each.name, each.definition]));
        // Rule sets reading no ghosted leaf, and sets of other kinds, are left as saved.
        assert.deepStrictEqual((definitions.get("Late") as { where?: unknown }).where, { kind: "any", of: [late] });
        assert.deepStrictEqual((definitions.get("Latest") as { where?: unknown }).where, "data.step > `2`");
        assert.deepStrictEqual((definitions.get("First") as { kind?: unknown }).kind, "fixed");
        reopened.dispose();
    });
});

describe("a project's session fields", () => {
    it("reports derived columns, issues, column settings and tours of a newer version, and opens the rest", async () => {
        const file = await projectFile();
        Object.assign(sessionMember(file), {
            derived: { version: 9, columns: [] },
            issues: { version: 8 },
            columns: { version: 7 },
            tours: { version: 6, list: [] },
        });
        const { session, report } = await opened(file);
        assert.sameDeepMembers(
            [...report.problems],
            [
                { code: "E_UNSUPPORTED_VERSION", params: { slice: "graph", found: 9 } },
                { code: "E_UNSUPPORTED_VERSION", params: { slice: "graph", found: 8 } },
                { code: "E_UNSUPPORTED_VERSION", params: { slice: "attributes", found: 7 } },
                { code: "E_UNSUPPORTED_VERSION", params: { slice: "tours", found: 6 } },
            ],
        );
        assert.strictEqual(session.data.nodes().length, 3);
        session.dispose();
    });

    it("skips a saved view with no camera: one following a camera view this element lacks, and one with neither", async () => {
        const file = await projectFile();
        sessionMember(file).views = [
            { name: "Kept", camera: { position: { x: 0, y: 0, z: 10 }, target: { x: 0, y: 0, z: 0 } } },
            { name: "Orbit", follows: "no-such-camera-view" },
            { name: "Empty" },
            "not a view",
        ];
        const { session, report } = await opened(file);
        assert.deepStrictEqual(report.problems, [
            { code: "E_UNKNOWN_CAMERA", params: { slice: "views", id: "Orbit" } },
            { code: "E_BAD_DOCUMENT", params: { slice: "views", id: "Empty" } },
        ]);
        assert.isDefined(session.views.get("Kept"));
        assert.isUndefined(session.views.get("Orbit"));
        assert.isUndefined(session.views.get("Empty"));
        session.dispose();
    });

    it("drops a background shader the file does not carry, reports it, and opens the rest of the background", async () => {
        for (const id of ["no-such-shader", 42]) {
            const file = await projectFile();
            const config = sessionMember(file).config as Record<string, unknown>;
            config.background = { backgroundType: "color", color: "#123456", shader: { id } };
            const { session, report } = await opened(file);
            assert.deepStrictEqual(report.problems, [
                {
                    code: "shader.unknown",
                    params: { slice: "config", channel: "background", shader: typeof id === "string" ? id : "42" },
                },
            ]);
            assert.strictEqual((session.config.background as { color?: string }).color, "#123456");
            session.dispose();
        }
    });
});
