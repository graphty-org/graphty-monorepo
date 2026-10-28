/**
 * The project file is built one member at a time (one builder per member, one per run of the
 * results), so autosave can write only the parts a change touched. These tests pin what that
 * needs: every project slice survives a save and an open, only the data member reads the graph's
 * records, column declarations are saved, and the file names the version that wrote it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession, type ProjectSlice } from "../../session";
import { dispatcherOf } from "../../src/session/GraphSession";
import {
    arrangementMember,
    graphIdsOf,
    notesMember,
    type ProjectSources,
    resultsMember,
    runEntry,
    sessionMember,
    styleMember,
    viewStateMember,
} from "../../src/session/projectFile";
import { ENGINE_VERSIONS } from "../../src/session/runs";
import { baseSession, sessionWithRuns } from "../helpers/project-session";

/** One slice: how a test changes it, and how it reads it back. */
interface SliceCase {
    readonly change: (session: GraphSession) => PromiseLike<unknown>;
    readonly read: (session: GraphSession) => unknown;
}

/**
 * Every project slice. A `Record` over the union, so a slice added to `ProjectSlice` without a case
 * here does not compile.
 */
const SLICES: Record<ProjectSlice, SliceCase> = {
    graph: {
        change: (session) => session.data.addNodes([{ id: "z", dept: 9 }]),
        read: (session) => session.data.nodes(),
    },
    config: {
        change: (session) => session.config.set({ runAlgorithmsOnLoad: !session.config.runAlgorithmsOnLoad }),
        read: (session) => session.config.runAlgorithmsOnLoad,
    },
    layout: {
        change: (session) => session.layout.setDimension(session.layout.dimension === "3d" ? "2d" : "3d"),
        read: (session) => [session.layout.id, session.layout.dimension],
    },
    pins: {
        change: async (session) => {
            await session.positions.set([{ id: "a", x: 1, y: 1, z: 1 }]);
            await session.positions.pin(["a"]);
        },
        read: (session) => [...session.positions.pinned],
    },
    arrangement: {
        change: (session) => session.positions.set([{ id: "b", x: 4, y: 5, z: 6 }]),
        read: (session) => {
            const at = { x: 0, y: 0, z: 0 };
            const index = session.data.snapshot().ids.indexOf("b");
            return session.positions.isPlaced(index) ? (session.positions.read(index, at), { ...at }) : null;
        },
    },
    runs: {
        change: (session) => session.runs.start("degree", undefined, { as: "links", style: false }),
        read: (session) => {
            const result = session.results.get("links");
            return [
                session.data.nodes().map((node) => result?.node(node.id) ?? null),
                session.data.edges().map((edge) => result?.edge(edge.id) ?? null),
            ];
        },
    },
    styles: {
        change: (session) =>
            session.styles.add({
                name: "Dept 1 in orange",
                target: "node",
                selector: { match: "expression", where: "data.dept == `1`" },
                set: { "node.color": "#ff9900" },
            }),
        read: (session) => session.styles.toDocument(),
    },
    visibility: {
        change: (session) => session.visibility.set({ kind: "degree", min: 2 }),
        read: (session) => session.visibility.filter,
    },
    sets: {
        change: (session) => {
            session.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }, { name: "Core" });
            return Promise.resolve();
        },
        read: (session) => session.sets.list().map((set) => [set.name, set.definition]),
    },
    views: {
        change: (session) =>
            session.views.save([
                { name: "Overview", camera: { position: { x: 0, y: 0, z: 10 }, target: { x: 0, y: 0, z: 0 } } },
            ]),
        read: (session) => [...session.views],
    },
    notes: {
        change: (session) => {
            session.notes.add({ text: "b is the hub", targets: [{ node: "b" }] });
            return Promise.resolve();
        },
        read: (session) => session.notes.list().map((note) => [note.text, note.targets]),
    },
    attributes: {
        change: (session) => session.data.declare({ kind: "node", name: "dept" }, { measurement: "categorical" }),
        read: (session) =>
            session.data
                .attributes()
                .filter((column) => column.measurementSource === "declared")
                .map((column) => [column.kind, column.name, column.measurement]),
    },
    valueLabels: {
        change: (session) => session.data.setValueLabel("data.dept", 9, "Research"),
        read: (session) => [...session.data.valueLabels("data.dept")],
    },
};

/**
 * Save a session and open the file in a fresh one.
 * @param session - The session to save.
 * @returns The opened session and the open's problems.
 */
async function reopened(session: GraphSession): Promise<{ opened: GraphSession; problems: readonly unknown[] }> {
    const { text } = await session.project.save();
    const opened = sessionWithRuns();
    const report = await opened.project.open(text);
    return { opened, problems: report.problems };
}

describe("every project slice survives a save and an open", () => {
    for (const [slice, { change, read }] of Object.entries(SLICES)) {
        it(slice, async () => {
            const untouched = await baseSession();
            const source = await baseSession();
            await change(source);
            assert.notDeepEqual(read(source), read(untouched), `the change shows in the ${slice} slice`);

            const { opened, problems } = await reopened(source);
            assert.deepStrictEqual(problems, []);
            assert.deepStrictEqual(read(opened), read(source));
            for (const session of [untouched, source, opened]) {
                session.dispose();
            }
        });
    }
});

describe("the member builders", () => {
    it("read the graph's records only for the data member", async () => {
        const session = await baseSession();
        for (const { change } of Object.values(SLICES)) {
            await change(session);
        }

        await session.selection.apply({ nodes: ["c"], edges: [graphIdsOf(session).edges[1]] });
        const nodes = vi.spyOn(session.data, "nodes");
        const edges = vi.spyOn(session.data, "edges");
        const sources: ProjectSources = { session, dispatcher: dispatcherOf(session), isDerived: () => false };

        const ids = graphIdsOf(session);
        const members = [
            sessionMember(sources, ids),
            arrangementMember(session, ids),
            resultsMember(session, [runEntry(sources, "links", ids) ?? {}]),
            styleMember(session),
            notesMember(session),
            viewStateMember(session, ids),
        ];
        assert.strictEqual(nodes.mock.calls.length, 0, "no member but the data builds node records");
        assert.strictEqual(edges.mock.calls.length, 0, "no member but the data builds edge records");

        // And they are the members a whole save writes.
        const { text } = await session.project.save();
        const written = (JSON.parse(text) as { members: Record<string, unknown>[] }).members;
        assert.deepStrictEqual(written.slice(1), JSON.parse(JSON.stringify(members)) as unknown);
        assert.strictEqual(nodes.mock.calls.length, 1, "a whole save builds the records once, for the data");
        assert.strictEqual(edges.mock.calls.length, 1);
        session.dispose();
    });

    it("name a run that has not finished as nothing", async () => {
        const session = await baseSession();
        const sources: ProjectSources = { session, dispatcher: dispatcherOf(session), isDerived: () => false };
        assert.isUndefined(runEntry(sources, "missing", graphIdsOf(session)));
        session.dispose();
    });
});

describe("column declarations in the project file", () => {
    /**
     * The session member of a saved file.
     * @param text - The file.
     * @returns The member.
     */
    const sessionOf = (text: string): Record<string, unknown> =>
        (JSON.parse(text) as { members: Record<string, unknown>[] }).members.find(
            (member) => member.kind === "graphty-session",
        ) ?? {};

    it("are a versioned field of the session member, written only when a column was declared", async () => {
        const session = await baseSession();
        assert.notProperty(sessionOf((await session.project.save()).text), "declarations");

        await session.data.declare({ kind: "node", name: "dept" }, { measurement: "ordinal", order: [2, 1] });
        assert.deepStrictEqual(sessionOf((await session.project.save()).text).declarations, {
            version: 1,
            columns: [{ kind: "node", name: "dept", measurement: "ordinal", order: [2, 1] }],
        });
        session.dispose();
    });

    it("open from a file written before they were saved, with nothing declared", async () => {
        const session = await baseSession();
        const { text } = await session.project.save();
        const opened = createGraphSession();
        const report = await opened.project.open(text);
        assert.deepStrictEqual(report.problems, []);
        assert.notInclude(report.restored, "attributes");
        assert.isTrue(opened.data.attributes().every((column) => column.measurementSource !== "declared"));
        session.dispose();
        opened.dispose();
    });

    it("of a newer version are reported and skipped, and the rest of the project opens", async () => {
        const session = await baseSession();
        await session.data.declare({ kind: "node", name: "dept" }, { measurement: "categorical" });
        const file = JSON.parse((await session.project.save()).text) as { members: Record<string, unknown>[] };
        const member = file.members.find((each) => each.kind === "graphty-session") ?? {};
        member.declarations = { version: 2, columns: [] };

        const opened = createGraphSession();
        const report = await opened.project.open(JSON.stringify(file));
        assert.deepStrictEqual(report.problems, [
            { code: "E_UNSUPPORTED_VERSION", params: { slice: "attributes", found: 2 } },
        ]);
        assert.strictEqual(opened.data.nodes().length, 3);
        session.dispose();
        opened.dispose();
    });

    it("naming a column the data does not hold are reported, and the others still come back", async () => {
        const session = await baseSession();
        await session.data.declare({ kind: "node", name: "dept" }, { measurement: "categorical" });
        const file = JSON.parse((await session.project.save()).text) as { members: Record<string, unknown>[] };
        const member = file.members.find((each) => each.kind === "graphty-session") ?? {};
        const declarations = member.declarations as { columns: unknown[] };
        declarations.columns.unshift({ kind: "node", name: "absent", measurement: "categorical" });

        const opened = createGraphSession();
        const report = await opened.project.open(JSON.stringify(file));
        assert.deepStrictEqual(report.problems, [
            { code: "E_UNKNOWN_ATTRIBUTE", params: { slice: "attributes", id: "node:absent" } },
        ]);
        assert.include(report.restored, "attributes");
        assert.strictEqual(
            opened.data.attributes().find((column) => column.name === "dept")?.measurementSource,
            "declared",
        );
        session.dispose();
        opened.dispose();
    });
});

describe("the project file's generator", () => {
    it("names the graphty-element version in package.json", async () => {
        const { version } = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf8")) as {
            version: string;
        };
        assert.strictEqual(ENGINE_VERSIONS.element, version);
        const session = await baseSession();
        const file = JSON.parse((await session.project.save()).text) as { generator: unknown };
        assert.deepStrictEqual(file.generator, { name: "graphty-element", version });
        session.dispose();
    });
});

describe("a project an earlier build saved", () => {
    // Both were saved while the halo's size channel was still called node.haloSize.
    for (const [file, layer] of [
        ["lesmis-poster.graphty.json", "Poster"],
        ["volunteers-thanks.graphty.json", "Thank-you cards"],
    ] as const) {
        it(`opens ${file} with its look`, async () => {
            const text = readFileSync(join(__dirname, "../../../design/ui/studio/tool/files", file), "utf8");
            const session = createGraphSession();
            const report = await session.project.open(text, { fileName: file });

            assert.deepEqual(report.problems, []);
            const names = session.styles.list().map((entry) => entry.name);
            assert.include(names, layer);
            assert.include(names, "Selected");
            const selected = session.styles
                .list()
                .find((entry) => entry.name === "Selected" && entry.target === "node");
            assert.equal(selected?.set?.["node.haloScale"], 1.45);
        });
    }
});
