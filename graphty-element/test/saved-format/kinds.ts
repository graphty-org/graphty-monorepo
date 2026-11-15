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
import * as graphStyle from "../../src/config/GraphStyle";
import type { GraphSession } from "../../src/session";

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
    /** False for a kind with no catalog behind it (a default value), which the census leaves out. */
    readonly catalog?: false;
    /** What the kind leaves in a session, which the session that opens the save must hold too. */
    readonly state?: (session: GraphSession) => unknown;
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

/** The settings a save once left out when they held their default. */
const DEFAULTED_SETTINGS = ["edgeWeightMeaning", "edgeColor", "edgeScale", "edgeOpacity"];

/**
 * Leave every setting at its default, which a save must write all the same: one it left out would
 * read back as the reading build's default, and this row's build has other defaults.
 * @returns What was used.
 */
function useEveryDefault(): Promise<UsedEvery> {
    return Promise.resolve({ used: DEFAULTED_SETTINGS, listed: DEFAULTED_SETTINGS.length, saves: [] });
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
        kind: "default-settings",
        catalog: false,
        useEvery: useEveryDefault,
        builtInModules: {
            "../../src/config/GraphStyle.ts": {
                ...graphStyle,
                DEFAULT_SELECTION_STYLE: {
                    ...graphStyle.DEFAULT_SELECTION_STYLE,
                    edgeColor: "#123456",
                    edgeScale: 7,
                    edgeOpacity: 0.25,
                },
            },
        },
        state: (session) => ({
            selectionStyle: session.config.selectionStyle,
            knownFields: session.config.data.knownFields,
        }),
    },
];
