/**
 * The project file's arrangement member keeps each placed node's x, y and z as a column: packed
 * float64 bytes, with the rows that have no value listed as absent. An open reads a column back in
 * either form and refuses one it cannot read as a problem with the arrangement, never by failing
 * the whole open.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

/** One saved column, as the file holds it. */
type Column = unknown[] | { dtype: string; data: string; absent?: unknown };

/** The arrangement member, as the file holds it. */
interface Arrangement {
    kind: "graphty-arrangement";
    ids: string[];
    x: Column;
    y: Column;
    z: Column;
    pins: string[];
}

/**
 * A session holding three nodes, two of them placed and one of those pinned.
 * @returns The session.
 */
async function arranged(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.positions.set([
        { id: "a", x: 1.5, y: -2, z: 3 },
        { id: "b", x: 4, y: 5.25, z: -6 },
    ]);
    await session.positions.pin(["a"]);
    return session;
}

/**
 * Save a session, letting a test change the arrangement member before the text is written back.
 * @param session - The session.
 * @param edit - What to do to the member.
 * @returns The file's text.
 */
async function savedWith(
    session: GraphSession,
    edit: (member: Arrangement) => void = () => undefined,
): Promise<string> {
    const file = JSON.parse((await session.project.save()).text) as { members: { kind: string }[] };
    const member = file.members.find((each) => each.kind === "graphty-arrangement") as Arrangement | undefined;
    assert.isDefined(member, "the file has an arrangement member");
    edit(member);
    return JSON.stringify(file);
}

/**
 * Where a node stands in a session.
 * @param session - The session.
 * @param id - The node.
 * @returns Its position, or null when it is not placed.
 */
function where(session: GraphSession, id: string): { x: number; y: number; z: number } | null {
    const index = session.data.nodes().findIndex((node) => node.id === id);
    if (index < 0 || !session.positions.isPlaced(index)) {
        return null;
    }

    const at = { x: 0, y: 0, z: 0 };
    session.positions.read(index, at);
    return at;
}

describe("the arrangement member's columns", () => {
    it("saves each coordinate as packed float64 bytes and reads them back exactly", async () => {
        const source = await arranged();
        const text = await savedWith(source, (member) => {
            assert.deepStrictEqual(member.ids, ["a", "b"]);
            assert.deepStrictEqual(member.pins, ["a"]);
            for (const column of [member.x, member.y, member.z]) {
                assert.notInstanceOf(column, Array);
                assert.strictEqual((column as { dtype: string }).dtype, "f64");
                assert.notProperty(column, "absent", "every placed node has every coordinate");
            }
        });

        const opened = createGraphSession();
        const report = await opened.project.open(text);
        assert.deepStrictEqual(report.problems, []);
        assert.deepStrictEqual(where(opened, "a"), { x: 1.5, y: -2, z: 3 });
        assert.deepStrictEqual(where(opened, "b"), { x: 4, y: 5.25, z: -6 });
        assert.isNull(where(opened, "c"), "a node that was never placed stays unplaced");
        assert.deepStrictEqual([...opened.positions.pinned], ["a"]);
        source.dispose();
        opened.dispose();
    });

    it("reads a column written as a plain list of numbers", async () => {
        const source = await arranged();
        const text = await savedWith(source, (member) => {
            member.x = [10, 20];
            member.y = [11, 21];
            member.z = [12, 22];
        });

        const opened = createGraphSession();
        assert.deepStrictEqual((await opened.project.open(text)).problems, []);
        assert.deepStrictEqual(where(opened, "a"), { x: 10, y: 11, z: 12 });
        assert.deepStrictEqual(where(opened, "b"), { x: 20, y: 21, z: 22 });
        source.dispose();
        opened.dispose();
    });

    it("ignores absent rows that fall outside the column or are not row numbers", async () => {
        const source = await arranged();
        const text = await savedWith(source, (member) => {
            (member.z as { absent?: unknown }).absent = [-1, 2, 99, 0.5, "0"];
        });

        const opened = createGraphSession();
        assert.deepStrictEqual((await opened.project.open(text)).problems, []);
        assert.deepStrictEqual(where(opened, "a"), { x: 1.5, y: -2, z: 3 });
        assert.deepStrictEqual(where(opened, "b"), { x: 4, y: 5.25, z: -6 });
        source.dispose();
        opened.dispose();
    });

    for (const [name, broken] of [
        ["a list of the wrong length", [1]],
        ["bytes for the wrong number of rows", { dtype: "f64", data: btoa("\u0000".repeat(8)) }],
        ["a type the file format does not have", { dtype: "f128", data: "" }],
        ["bytes that are not text", { dtype: "f64", data: 42 }],
        ["nothing at all", null],
    ] as const) {
        it(`reports ${name} as a problem with the arrangement and opens the rest`, async () => {
            const source = await arranged();
            const text = await savedWith(source, (member) => {
                member.y = broken as unknown as Column;
            });

            const opened = createGraphSession();
            const report = await opened.project.open(text);
            assert.deepStrictEqual(report.problems, [{ code: "E_BAD_DOCUMENT", params: { slice: "arrangement" } }]);
            assert.strictEqual(opened.data.nodes().length, 3, "the graph still opens");
            assert.isNull(where(opened, "a"), "and nothing is placed from a column it could not read");
            source.dispose();
            opened.dispose();
        });
    }
});
