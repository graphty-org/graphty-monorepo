/**
 * @file What the assistant's tools reach, against everything graphty-element can do: every op of
 * the command vocabulary, every door that dispatches or is exempt (and every read of the session),
 * every catalog entry and every option. An item is reached by some tool action or excluded with a
 * reason code; `test/ai/tools/coverage.test.ts` fails the build on anything else, and on an
 * exclusion that names nothing, an item both reached and excluded, a `covered-by` row whose tool
 * does not reach the same op, a field with no description, and a field two actions type differently.
 */

import { COMMANDS } from "../../../commands";
import { type Exclusion, isWholeRoot } from "../../../src/ai/tools/exclusions";
import { enginesOf } from "../../../src/ai/tools/families/layout";
import { SETTING_GROUPS } from "../../../src/ai/tools/families/project";
import { optionsSchema } from "../../../src/ai/tools/optionSchema";
import type { AssistantTool, Toolset } from "../../../src/ai/tools/toolset";
import type { CatalogView } from "../../../src/ai/tools/types";
import type { DoorRoot } from "../../../src/session/commands/doors";

/** What coverage found. */
export interface CoverageReport {
    /** Every item, by its key. */
    readonly items: readonly string[];
    readonly reached: ReadonlySet<string>;
    /** Items excluded, with the row that excludes each. */
    readonly excluded: ReadonlyMap<string, Exclusion>;
    /** Items neither reached nor excluded. */
    readonly missing: readonly string[];
    /** Problems with the exclusions, the fields and the schemas, one sentence each. */
    readonly problems: readonly string[];
}

/** The inputs, so a test can plant an unreachable operation. */
export interface CoverageInputs {
    readonly toolset: Toolset;
    readonly doorRoots: readonly DoorRoot[];
    readonly exclusions: readonly Exclusion[];
    /** The command vocabulary's ops; `COMMANDS` by default. */
    readonly ops?: readonly string[];
}

/**
 * The door items of the roots: dispatching and exempt doors of every root, and read-only doors of
 * the session's roots. A root answered whole is one item.
 * @param roots - The door roots.
 * @returns Item key to the root it belongs to.
 */
function doorItems(roots: readonly DoorRoot[]): Map<string, DoorRoot> {
    const items = new Map<string, DoorRoot>();
    for (const root of roots) {
        if (root.whole !== undefined) {
            if (root.whole.kind !== "readOnly" || root.half === "session") {
                items.set(`root:${root.name}`, root);
            }

            continue;
        }

        for (const [member, door] of Object.entries(root.doors ?? {})) {
            if (door.kind !== "readOnly" || root.half === "session") {
                items.set(`door:${root.name}.${member}`, root);
            }
        }
    }

    return items;
}

/**
 * The catalog and option items of a catalog.
 * @param catalog - The catalog.
 * @returns The item keys.
 */
function catalogItems(catalog: CatalogView): string[] {
    return [
        ...catalog.algorithms.map((entry) => `catalog:algorithms/${entry.key}`),
        ...catalog.layouts.map((entry) => `catalog:layouts/${entry.id}`),
        ...[...new Set(catalog.layouts.flatMap(enginesOf))].map((engine) => `catalog:engines/${engine}`),
        ...catalog.formats.map((entry) => `catalog:formats/${entry.id}`),
        ...catalog.palettes.map((entry) => `catalog:palettes/${entry.id}`),
        ...catalog.scales.map((entry) => `catalog:scales/${entry.name}`),
        ...catalog.channels.map((entry) => `catalog:channels/${entry.channel}`),
        ...catalog.cameras.map((entry) => `catalog:cameras/${entry.id}`),
        ...Object.keys(SETTING_GROUPS).map((name) => `catalog:settings/${name}`),
    ];
}

/**
 * Every option of every catalog entry with options, and whether the assistant can offer it.
 * @param catalog - The catalog.
 * @returns Option item key to whether its type converts to a schema.
 */
function optionItems(catalog: CatalogView): Map<string, boolean> {
    const items = new Map<string, boolean>();
    const add = (table: string, id: string, options: Parameters<typeof optionsSchema>[0]): void => {
        const { unoffered } = optionsSchema(options);
        for (const option of options) {
            if (option.internal !== true) {
                items.set(`option:${table}/${id}/${option.name}`, !unoffered.includes(option));
            }
        }
    };
    for (const entry of catalog.algorithms) {
        add("algorithms", entry.key, entry.options);
    }

    for (const entry of catalog.layouts) {
        add("layouts", entry.id, entry.options);
    }

    for (const entry of catalog.formats) {
        add("formats", entry.id, entry.options);
        add("writers", entry.id, entry.writerOptions ?? []);
    }

    for (const entry of catalog.scales) {
        add("scales", entry.name, entry.options);
    }

    for (const entry of catalog.cameras) {
        add("cameras", entry.id, entry.options);
    }

    return items;
}

/**
 * The key an exclusion row excludes, or the keys of a root row's members.
 * @param row - The row.
 * @param roots - The door roots, for a root excluded whole.
 * @returns The keys.
 */
function exclusionKeys(row: Exclusion, roots: readonly DoorRoot[]): string[] {
    if (row.root !== undefined) {
        if (row.members !== undefined) {
            return row.members.map((member) => `door:${row.root}.${member}`);
        }

        // A root excluded whole: its one item, or each of its doors when it answers per door.
        const root = roots.find((each) => each.name === row.root);
        return root?.doors === undefined
            ? [`root:${row.root}`]
            : Object.keys(root.doors).map((member) => `door:${row.root}.${member}`);
    }

    if (row.door !== undefined) {
        return [`door:${row.door}`];
    }

    if (row.op !== undefined) {
        return [`op:${row.op}`];
    }

    if (row.catalog !== undefined) {
        return [`catalog:${row.catalog}`];
    }

    return row.option === undefined ? [] : [`option:${row.option}`];
}

/**
 * Roots that are another root seen from the element: the same object, so a reach of one is a
 * reach of the other.
 */
const ALIASES: Readonly<Record<string, string>> = {
    Graph: "Graphty",
    GraphSession: "ElementSession",
    StylesApi: "SessionStylesApi",
    SelectionApi: "SelectionOwner",
    VisibilityApi: "SessionVisibilityApi",
};

/**
 * The same door on the roots that alias its root.
 * @param key - An item key.
 * @returns The aliased keys.
 */
function aliasesOf(key: string): string[] {
    const match = /^door:([^.]+)\.(.+)$/.exec(key);
    const alias = match === null ? undefined : ALIASES[match[1]];
    return alias === undefined ? [] : [`door:${alias}.${match![2]}`];
}

/**
 * The item key a reach names.
 * @param reach - The reach.
 * @returns The key.
 */
function reachKey(reach: { op: string } | { door: string } | { catalog: string }): string {
    if ("op" in reach) {
        return `op:${reach.op}`;
    }

    return "door" in reach ? `door:${reach.door}` : `catalog:${reach.catalog}`;
}

/**
 * The op an op item names.
 * @param key - The item key.
 * @returns The op, or undefined for another item.
 */
function opOf(key: string): string | undefined {
    return key.startsWith("op:") ? key.slice(3) : undefined;
}

/**
 * Whether a door-level row excludes a door.
 * @param exclusions - The rows.
 * @param key - The door's item key.
 * @returns True when one does.
 */
function excludedByDoorRow(exclusions: readonly Exclusion[], key: string): boolean {
    return exclusions.some((row) => row.door !== undefined && `door:${row.door}` === key);
}

/**
 * The fields of a tool's actions that carry no description.
 * @param tool - The tool.
 * @returns `tool.action.field` for each.
 */
function undescribed(tool: AssistantTool): string[] {
    const out: string[] = [];
    for (const action of tool.definition.actions) {
        for (const [key, field] of Object.entries(action.fields)) {
            const own = (field as { description?: string }).description;
            const inner = (field as { unwrap?: () => { description?: string } }).unwrap?.().description;
            if ((own ?? inner ?? "") === "") {
                out.push(`${tool.name}.${action.name}.${key}`);
            }
        }
    }

    return out;
}

/**
 * Compute coverage.
 * @param inputs - The tools, the doors, the exclusions and the ops.
 * @returns The report.
 */
export function coverage(inputs: CoverageInputs): CoverageReport {
    const { toolset, doorRoots, exclusions } = inputs;
    const ops = inputs.ops ?? Object.keys(COMMANDS);
    const doors = doorItems(doorRoots);
    const options = optionItems(toolset.catalog);
    const items = [
        ...ops.map((op) => `op:${op}`),
        ...doors.keys(),
        ...catalogItems(toolset.catalog),
        ...options.keys(),
    ];

    // What the tools reach: their declared reaches, and the options of the tables they pass on.
    const reached = new Set<string>();
    const byTool = new Map<string, Set<string>>();
    const optionTables = new Map<string, readonly string[] | undefined>();
    for (const tool of toolset.tools) {
        const own = new Set<string>();
        for (const action of tool.definition.actions) {
            own.add(`action:${tool.name}.${action.name}`);
            for (const reach of action.reaches) {
                if ("options" in reach) {
                    optionTables.set(reach.options, reach.only);
                    continue;
                }

                const key = reachKey(reach);
                for (const each of [key, ...aliasesOf(key)]) {
                    reached.add(each);
                    own.add(each);
                }
            }
        }

        byTool.set(tool.name, own);
    }

    for (const [key, offered] of options) {
        const [table, , name] = key.slice("option:".length).split("/");
        const only = optionTables.get(table);
        if (offered && optionTables.has(table) && (only === undefined || only.includes(name))) {
            reached.add(key);
        }
    }

    // A root answered whole is reached when a tool names any member of it.
    for (const [key, root] of doors) {
        if (key.startsWith("root:") && [...reached].some((each) => each.startsWith(`door:${root.name}.`))) {
            reached.add(key);
        }
    }

    const problems: string[] = [];
    const excluded = new Map<string, Exclusion>();
    const known = new Set(items);
    for (const row of exclusions) {
        const keys = exclusionKeys(row, doorRoots);
        if (keys.length === 0) {
            problems.push(`An exclusion names nothing: ${JSON.stringify(row)}.`);
        }

        if (row.root !== undefined) {
            const root = doorRoots.find((each) => each.name === row.root);
            if (root === undefined) {
                problems.push(`The exclusion of root ${row.root} names a root doors.ts does not have.`);
                continue;
            }

            if (row.members === undefined && !isWholeRoot(root)) {
                problems.push(
                    `The exclusion of root ${row.root} lists no members, but the root has doors that dispatch or are exempt: list them.`,
                );
            }
        }

        if (row.reason === "covered-by") {
            const tool = row.by?.split(".")[0];
            const reaches = tool === undefined ? undefined : byTool.get(tool);
            if (reaches === undefined || (row.by!.includes(".") && !reaches.has(`action:${row.by!}`))) {
                problems.push(`A covered-by exclusion names no tool action: ${JSON.stringify(row)}.`);
            } else {
                for (const key of keys) {
                    const root = doorRoots.find((each) => key.startsWith(`door:${each.name}.`));
                    const door = root?.doors?.[key.slice(`door:${root.name}.`.length)];
                    const op = door !== undefined && "op" in door ? door.op : opOf(key);
                    if (op !== undefined && op !== "" && !reaches.has(`op:${op}`)) {
                        problems.push(`${key} is covered by ${row.by!}, which does not dispatch ${op}.`);
                    }
                }
            }
        }

        if (row.kind === "defect" && (row.owner === undefined || row.expires === undefined)) {
            problems.push(`A defect exclusion needs an owner and an expiry: ${JSON.stringify(row)}.`);
        }

        for (const key of keys) {
            if (!known.has(key)) {
                problems.push(`The exclusion of ${key} names something that does not exist (any more): delete it.`);
            } else if (reached.has(key)) {
                problems.push(`${key} is both reached by a tool and excluded: delete the exclusion.`);
            } else {
                excluded.set(key, row);
            }
        }
    }

    // A root excluded member by member lists every unreached door of it, so a new mutating member
    // is a decision, not a pass.
    for (const root of new Set(
        exclusions.flatMap((row) => (row.root !== undefined && row.members !== undefined ? [row.root] : [])),
    )) {
        const unreached = [...doors.keys()].filter(
            (key) => key.startsWith(`door:${root}.`) && !reached.has(key) && !excludedByDoorRow(exclusions, key),
        );
        const listed = new Set(
            exclusions.filter((row) => row.root === root).flatMap((row) => exclusionKeys(row, doorRoots)),
        );
        const differ = unreached.filter((key) => !listed.has(key));
        if (differ.length > 0) {
            problems.push(
                `The exclusions of root ${root} do not list ${differ.join(", ")}: reach them, or add them with a reason.`,
            );
        }
    }

    for (const tool of toolset.tools) {
        for (const field of undescribed(tool)) {
            problems.push(`The field ${field} has no description for the model.`);
        }

        for (const conflict of tool.conflicts) {
            problems.push(`Two actions of ${tool.name} declare ${conflict} with different types.`);
        }
    }

    const missing = items.filter((key) => !reached.has(key) && !excluded.has(key));
    return { items, reached, excluded, missing, problems };
}
