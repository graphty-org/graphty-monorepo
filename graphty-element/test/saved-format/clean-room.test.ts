/**
 * @file Save files are self-contained (design/architecture/self-contained-save-files.md, sections
 * 2.1 and 2.2).
 *
 * The clean-room round trip: for each row of `SELF_CONTAINED_KINDS`, session A uses every built-in
 * of the kind and saves; sessions B and C open those saves in a module graph where the modules that
 * ship the built-ins are empty stubs, so nothing the file names can be found in the build. B must
 * open with no problems, and B's and C's saves must be equal, and equal to A's in what the kind
 * saves.
 *
 * The saved-name scan: every string a save holds, and every segment of a dotted key, is compared
 * with every built-in id this build ships. A save that names a built-in fails unless the name is a
 * shader the same file carries, or it sits at a path `saved-format-lists.json` lists as a known
 * exception with a tracking issue. Changing that list needs the owner's approval.
 */

import { assert, describe, it, vi } from "vitest";

import { shaderDescriptors } from "../../src/catalog/shaderRegistry";
import { NODE_SHAPE_DESCRIPTORS } from "../../src/catalog/shapes";
import { createGraphSession, type GraphSession } from "../../src/session";
import { SESSION_CATALOG_TABLES } from "../../src/session/catalog";
import { builtInModuleIds } from "./builtInIds";
import { FIXTURE_EDGES, FIXTURE_NODES, SELF_CONTAINED_KINDS } from "./kinds";
import lists from "./saved-format-lists.json";

/** A built-in node shape other than the default. */
const SESSION_SHAPE = NODE_SHAPE_DESCRIPTORS[1].id;

/** A saved file, parsed. */
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** One built-in name found in a save. */
interface Hit {
    /** The catalog or fixed list it belongs to. */
    readonly kind: string;
    /** The id. */
    readonly id: string;
    /** Where it sits, member kind first, array indices as `[]`. */
    readonly path: string;
}

/**
 * A session holding the fixture graph.
 * @param create - The session factory of the module graph to use.
 * @returns The session.
 */
async function fixtureSession(create: () => GraphSession): Promise<GraphSession> {
    const session = create();
    await session.data.addNodes(FIXTURE_NODES);
    await session.data.addEdges(FIXTURE_EDGES);
    return session;
}

/**
 * The member of a project file of one kind.
 * @param file - The parsed file.
 * @param kind - The member kind.
 * @returns The member.
 */
function member(file: Json, kind: string): Record<string, Json> {
    const { members } = file as { members: Record<string, Json>[] };
    const found = members.find((each) => each.kind === kind);
    assert.isDefined(found, `the file has a ${kind} member`);
    return found ?? {};
}

/**
 * What a save holds of the shaders: the carried texts, every layer's uses and the background.
 * @param text - A project file.
 * @returns The parts to compare.
 */
function shaderParts(text: string): unknown {
    const file = JSON.parse(text) as Json;
    const style = member(file, "graphty-style") as { shaders?: Json; layers?: { set?: Record<string, Json> }[] };
    const config = JSON.stringify(file).includes('"background"') ? findKey(file, "background") : undefined;
    return {
        shaders: style.shaders,
        uses: (style.layers ?? []).map((layer) => [layer.set?.["node.shaders"], layer.set?.["edge.shaders"]]),
        background: config,
    };
}

/**
 * The first value under a key, anywhere in a document.
 * @param value - The document.
 * @param key - The key.
 * @returns The value, or undefined.
 */
function findKey(value: Json, key: string): Json | undefined {
    if (value === null || typeof value !== "object") {
        return undefined;
    }

    if (!Array.isArray(value) && key in value) {
        return value[key];
    }

    for (const child of Object.values(value)) {
        const found = findKey(child, key);
        if (found !== undefined) {
            return found;
        }
    }

    return undefined;
}

/**
 * A document with every volatile field (the save time) removed.
 * @param value - The document.
 * @returns The rest.
 */
function withoutVolatile(value: Json): Json {
    if (Array.isArray(value)) {
        return value.map(withoutVolatile);
    }

    if (value === null || typeof value !== "object") {
        return value;
    }

    return Object.fromEntries(
        Object.entries(value)
            .filter(([key]) => !(lists.volatile as readonly string[]).includes(key))
            .map(([key, child]) => [key, withoutVolatile(child)]),
    );
}

/**
 * Every built-in id this build ships, by kind: each session catalog table, and each fixed list a
 * module exports through `builtInIdsForTesting`.
 * @returns The kind of each id (an id in two kinds keeps both).
 */
async function builtInIds(): Promise<Map<string, string[]>> {
    const byId = new Map<string, string[]>();
    const add = (kind: string, id: unknown): void => {
        if (typeof id === "string" && id !== "") {
            byId.set(id, [...(byId.get(id) ?? []), kind]);
        }
    };
    for (const [kind, table] of Object.entries(SESSION_CATALOG_TABLES)) {
        for (const each of table() as readonly object[]) {
            const descriptor = each as Record<string, unknown>;
            add(kind, descriptor.id ?? descriptor.key ?? descriptor.name);
        }
    }

    for (const { kind, ids } of await builtInModuleIds()) {
        ids.forEach((id) => add(kind, id));
    }

    return byId;
}

/**
 * Every built-in id a save names, apart from the shaders it carries and uses.
 * @param text - A project file or a style file.
 * @param ids - The built-in ids, by id.
 * @returns The hits.
 */
function scan(text: string, ids: Map<string, string[]>): Hit[] {
    const file = JSON.parse(text) as Json;
    const carried = new Set<string>();
    const hits: Hit[] = [];
    const note = (id: string, path: string, reference: boolean): void => {
        if (reference && carried.has(id)) {
            return;
        }

        for (const kind of ids.get(id) ?? []) {
            hits.push({ kind, id, path });
        }
    };
    const walk = (value: Json, path: string): void => {
        if (typeof value === "string") {
            const definition = /(^|\.)shaders\[\]\.id$/.test(path) && carried.has(value);
            const reference =
                /\.set\.(node|edge)\.shaders\[\]\.shader$/.test(path) || /(^|\.)background\.shader\.id$/.test(path);
            if (!definition) {
                note(value, path, reference);
            }

            return;
        }

        if (value === null || typeof value !== "object") {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach((child) => walk(child, `${path}[]`));
            return;
        }

        for (const [key, child] of Object.entries(value)) {
            if (key.includes(".")) {
                const segments = key.split(".");
                segments.forEach((segment, index) => {
                    // An encode key `<target>.shaders.<id>.<param>` names a shader in its third segment.
                    const reference = index === 2 && segments[1] === "shaders" && path.endsWith(".encode");
                    note(segment, `${path}.${key}`.replace(segment, reference ? "<shader>" : segment), reference);
                });
            }

            walk(child, path === "" ? key : `${path}.${key}`);
        }
    };
    const root = file as Record<string, Json>;
    for (const each of (root.members as Record<string, Json>[] | undefined) ?? []) {
        for (const shader of (each.shaders as { id?: string; text?: string }[] | undefined) ?? []) {
            if (typeof shader.id === "string" && typeof shader.text === "string") {
                carried.add(shader.id);
            }
        }
    }

    for (const shader of (root.shaders as { id?: string; text?: string }[] | undefined) ?? []) {
        if (typeof shader.id === "string" && typeof shader.text === "string") {
            carried.add(shader.id);
        }
    }

    if (Array.isArray(root.members)) {
        for (const each of root.members as Record<string, Json>[]) {
            walk(each, typeof each.kind === "string" ? each.kind : "");
        }
    } else {
        walk(file, typeof root.kind === "string" ? root.kind : "");
    }

    return hits;
}

/**
 * The hits no known exception covers.
 * @param hits - The hits.
 * @returns Each as `kind id at path`.
 */
function unexcused(hits: readonly Hit[]): string[] {
    const excused = (hit: Hit): boolean =>
        lists.exceptions.some((each) => each.catalogs.includes(hit.kind) && each.paths.includes(hit.path));
    return [...new Set(hits.filter((hit) => !excused(hit)).map((hit) => `${hit.kind} "${hit.id}" at ${hit.path}`))];
}

describe("save files are self-contained", () => {
    it("implements every kind the lists call self-contained", () => {
        assert.sameMembers(
            SELF_CONTAINED_KINDS.map((row) => row.kind),
            lists.selfContained,
        );
    });

    for (const row of SELF_CONTAINED_KINDS) {
        it(`opens every built-in ${row.kind} with the ${row.kind} catalog emptied, and saves it the same`, async () => {
            const a = await fixtureSession(createGraphSession);
            const { used, listed, saves } = await row.useEvery(a);
            assert.strictEqual(used.length, listed, `used every ${row.kind} the catalog lists`);
            assert.isAbove(listed, 0);
            const project = (await a.project.save()).text;
            const styleFile = a.styles.toFile();
            a.dispose();

            vi.resetModules();
            for (const [path, stub] of Object.entries(row.builtInModules)) {
                vi.doMock(path, () => stub);
            }

            try {
                const clean = await import("../../src/session");
                for (const text of [...saves, project]) {
                    const b = clean.createGraphSession();
                    const opened = await b.project.open(text);
                    assert.deepEqual(opened.problems, [], "B opens with no problems");
                    assert.isEmpty(
                        b.shaders.list().filter((each) => each.state === "held"),
                        "every carried shader is trusted by its content",
                    );
                    const bSave = (await b.project.save()).text;
                    const c = clean.createGraphSession();
                    await c.project.open(bSave);
                    const cSave = (await c.project.save()).text;
                    assert.deepEqual(
                        withoutVolatile(JSON.parse(cSave) as Json),
                        withoutVolatile(JSON.parse(bSave) as Json),
                    );
                    assert.deepEqual(shaderParts(bSave), shaderParts(text), "A's and B's shaders, uses and background");
                    b.dispose();
                    c.dispose();
                }

                const b = await fixtureSession(clean.createGraphSession);
                await b.styles.applyTemplate(styleFile);
                const bFile = b.styles.toFile();
                assert.deepEqual(bFile.shaders, styleFile.shaders, "the style file's shaders come back the same");
                b.dispose();
            } finally {
                for (const path of Object.keys(row.builtInModules)) {
                    vi.doUnmock(path);
                }

                vi.resetModules();
            }
        });
    }

    it("names no built-in in a save, apart from carried shaders and the known exceptions", async () => {
        const ids = await builtInIds();
        const session = await fixtureSession(createGraphSession);
        const texts: string[] = [];
        for (const row of SELF_CONTAINED_KINDS) {
            texts.push(...(await row.useEvery(session)).saves);
        }

        // Kinds still saved by name, so their known paths are exercised and a new path fails.
        await session.styles.add({
            name: "By name",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": SESSION_SHAPE },
            encode: { "node.color": { by: "data.weight", palette: SESSION_CATALOG_TABLES.palettes()[0].id } },
        });

        texts.push((await session.project.save()).text, JSON.stringify(session.styles.toFile()));
        session.dispose();
        const found = unexcused(texts.flatMap((text) => scan(text, ids)));
        assert.deepEqual(
            found,
            [],
            "a save names a built-in it does not carry; carry it, or ask the owner for an exception",
        );
    });

    it("fails a shader reference the file does not carry", async () => {
        const ids = await builtInIds();
        const shader = shaderDescriptors().find((each) => each.origin === "element");
        assert.isDefined(shader);
        const id = shader?.id ?? "";
        const file = JSON.stringify({
            kind: "graphty-style",
            layers: [{ set: { "node.shaders": [{ shader: id }] }, encode: { [`node.shaders.${id}.x`]: {} } }],
            shaders: [],
        });
        assert.sameMembers(
            unexcused(scan(file, ids)).filter((each) => each.startsWith("shaders")),
            [
                `shaders "${id}" at graphty-style.layers[].set.node.shaders[].shader`,
                `shaders "${id}" at graphty-style.layers[].encode.node.shaders.<shader>.x`,
            ],
        );
        const carried = JSON.stringify({ ...JSON.parse(file), shaders: [{ id, text: "carried" }] });
        assert.isEmpty(unexcused(scan(carried, ids)).filter((each) => each.startsWith("shaders")));
    });
});
