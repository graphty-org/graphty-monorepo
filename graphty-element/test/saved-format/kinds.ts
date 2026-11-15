/**
 * @file The kinds of built-in thing a save file already carries in full, so a later build that
 * no longer ships one still opens the file the same way (design/architecture/self-contained-save-files.md,
 * section 2.1). `clean-room.test.ts` runs one block per row: session A uses every built-in of the
 * kind, then sessions B and C open the save in a module graph where the row's `builtInModules`
 * are empty.
 *
 * A fix for another kind makes the file carry what it uses, adds its row here and deletes its
 * entry from `exceptions` in `saved-format-lists.json`, in one commit.
 */

import type { ShaderDescriptor } from "../../src/catalog/shaders";
import type { GraphSession } from "../../src/session";
import type { RuleBinding } from "../../src/session/styles/encoding";
import { OVERFLOW_PATTERNS, OVERFLOW_SHAPES } from "../../src/session/styles/overflowLists";

/** What a row's `useEvery` did. */
export interface UsedEvery {
    /** Every catalog id it used, read from the live catalog. */
    readonly used: readonly string[];
    /** How many built-ins the catalog lists, which `used` must match. */
    readonly listed: number;
    /** Extra project saves, for built-ins only one of which a project holds at a time. */
    readonly saves: readonly string[];
}

/** One self-contained kind. */
export interface SelfContainedKind {
    /** The kind; also its catalog's key, for the census. */
    readonly kind: string;
    /** Use every built-in of the kind in a session that holds {@link FIXTURE_NODES} and {@link FIXTURE_EDGES}. */
    readonly useEvery: (session: GraphSession) => Promise<UsedEvery>;
    /** Each module that ships the built-ins, relative to this folder, with the exports of its empty stub. */
    readonly builtInModules: Readonly<Record<string, Record<string, unknown>>>;
    /** What the session draws that depends on the kind, compared between A and B; absent, nothing more is compared. */
    readonly drawn?: (session: GraphSession) => Promise<unknown>;
}

/** The fixture's nodes. Their data avoids built-in names, so a hit in a save is a saved reference. */
export const FIXTURE_NODES = [
    { id: "n1", grp: "g1", weight: 1 },
    { id: "n2", grp: "g1", weight: 2 },
    { id: "n3", grp: "g2", weight: 3 },
];

/** The fixture's edges. */
export const FIXTURE_EDGES = [
    { source: "n1", target: "n2" },
    { source: "n2", target: "n3" },
];

/**
 * A value for the first number parameter that is not its default, so the use saves it.
 * @param descriptor - The shader.
 * @returns The parameters to save, or none.
 */
function offDefault(descriptor: ShaderDescriptor): Record<string, number> {
    for (const param of descriptor.params) {
        const value: unknown = param.default;
        if (typeof value !== "number") {
            continue;
        }

        const max = typeof param.max === "number" ? param.max : value + 2;
        const min = typeof param.min === "number" ? param.min : value - 2;
        const whole = [value, min, max].every((each) => Number.isInteger(each));
        const half = max > value ? (value + max) / 2 : (value + min) / 2;
        const off = whole ? Math.round(half) : half;
        return off === value ? {} : { [param.name]: off };
    }

    return {};
}

/**
 * Use every shader preset: one layer per node, edge and group preset with one parameter off its
 * default, an `off: true` use, an encode binding on a `varies` parameter, and one save per
 * background preset.
 * @param session - The session.
 * @returns What was used.
 */
async function useEveryShader(session: GraphSession): Promise<UsedEvery> {
    const presets = session.catalog.shaders().filter((each) => each.origin === "element");
    const used: string[] = [];
    const saves: string[] = [];
    let encoded = false;
    for (const preset of presets.filter((each) => each.target !== "background")) {
        const target = preset.target === "edge" ? "edge" : "node";
        const use =
            preset.target === "group"
                ? { shader: preset.id, groupBy: "data.grp", params: offDefault(preset) }
                : { shader: preset.id, params: offDefault(preset) };
        const varies: ShaderDescriptor["params"][number] | undefined =
            preset.target === "node" && !encoded ? preset.params.find((p) => p.varies === true) : undefined;
        encoded ||= varies !== undefined;
        await session.styles.add({
            name: `Uses ${used.length}`,
            target,
            selector: { match: "everything" },
            set: { [`${target}.shaders`]: [use] },
            ...(varies === undefined
                ? {}
                : { encode: { [`node.shaders.${preset.id}.${varies.name}`]: { by: "data.weight" } } }),
        });
        used.push(preset.id);
    }

    const first = presets.find((each) => each.target === "node");
    if (first !== undefined) {
        await session.styles.add({
            name: "Off",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shaders": [{ shader: first.id, off: true }] },
        });
    }

    for (const preset of presets.filter((each) => each.target === "background")) {
        // A gallery pick: the project id to write, with the preset's text copied in.
        const id = await session.shaders.fromCatalog(preset.id);
        await session.config.set({ background: { backgroundType: "color", shader: { id } } });
        saves.push((await session.project.save()).text);
        used.push(preset.id);
    }

    return { used, listed: presets.length, saves };
}

/** How many groups each overflow layer draws: two colours times six cue values. The nodes hold g1 and g2 already. */
const OVERFLOW_GROUPS = 12;

/**
 * Use both overflow lists: a node colour that overflows into shapes and an edge colour that
 * overflows into patterns, each over two colours and enough groups to reach every value.
 * @param session - The session.
 * @returns What was used: the lists the layers store.
 */
async function useEveryOverflowList(session: GraphSession): Promise<UsedEvery> {
    // Groups are text, so a colour binding reads them as categories with no scale named.
    const extra = Array.from({ length: OVERFLOW_GROUPS - 2 }, (_, at) => ({
        id: `n${at + FIXTURE_NODES.length + 1}`,
        grp: `g${at + 3}`,
        weight: 0,
    }));
    await session.data.addNodes(extra);
    await session.data.addEdges(
        Array.from({ length: OVERFLOW_GROUPS }, (_, at) => ({ source: `n${at + 2}`, target: "n1", k: `k${at + 1}` })),
    );
    const colors = ["#112233", "#445566"];
    const nodes = await session.styles.add({
        name: "Shapes",
        target: "node",
        selector: { match: "everything" },
        encode: { "node.color": { by: "data.grp", colors, overflow: "shape" } },
    });
    const edges = await session.styles.add({
        name: "Patterns",
        target: "edge",
        selector: { match: "has", path: "data.k" },
        encode: { "edge.color": { by: "data.k", colors, overflow: "pattern" } },
    });
    const carried = (id: string, channel: "node.color" | "edge.color"): readonly string[] =>
        (session.styles.get(id)?.encode?.[channel] as RuleBinding | undefined)?.overflowValues ?? [];

    return {
        used: [...carried(nodes.id, "node.color"), ...carried(edges.id, "edge.color")],
        listed: OVERFLOW_SHAPES.length + OVERFLOW_PATTERNS.length,
        saves: [],
    };
}

/**
 * The shape of every node and the pattern of every edge.
 * @param session - The session.
 * @returns Each element's id and value.
 */
async function drawnCues(session: GraphSession): Promise<unknown> {
    await session.styles.settled();
    const nodes = session.data.nodes().map((node) => [node.id, session.styles.explain({ node: node.id }).merged]);
    const edges = session.data.edges().map((edge) => [edge.id, session.styles.explain({ edge: edge.id }).merged]);
    return { nodes, edges };
}

/** Every kind a save file carries in full. The census requires each `selfContained` kind of `saved-format-lists.json` here. */
export const SELF_CONTAINED_KINDS: readonly SelfContainedKind[] = [
    {
        kind: "shaders",
        useEvery: useEveryShader,
        builtInModules: {
            "../../src/shaders/presets/index.ts": { SHADER_PRESETS: [] },
            "../../src/shaders/presets/bodies.ts": { SHADER_PRESET_BODIES: {} },
        },
    },
    {
        kind: "overflowLists",
        useEvery: useEveryOverflowList,
        builtInModules: {
            "../../src/session/styles/overflowLists.ts": {
                OVERFLOW_SHAPES: [],
                OVERFLOW_PATTERNS: [],
                builtInIdsForTesting: () => ({ kind: "overflowLists", ids: [] }),
            },
        },
        drawn: drawnCues,
    },
];
