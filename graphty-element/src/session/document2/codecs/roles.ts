/**
 * @file Each source's weight, time and location roles (spec 4.1.3) and the graph-wide
 * `data.knownFields` settings that are their view.
 *
 * The session holds one setting per role for the whole graph. An open sets it from the roles of the
 * built sources when they agree, and to null when none names it or they differ, and remembers each
 * source's roles as read. A save writes each source's roles as read while their setting is what
 * the open set; a setting changed since is the role of each source whose rows carry the column it
 * names, and a source that does not carry it keeps its own. A source loaded since the open takes
 * every setting whose column its rows carry.
 *
 * ponytail: the session holds no per-source roles, so a graph whose sources differ on a role opens
 * with that setting null (`W_ROLES_DIFFER`): the timeline, the map and Analyze do not read that
 * role until the reader chooses one. Per-source roles in the session (`data.setRole({ source })`,
 * `E_ROLE_TARGET_AMBIGUOUS`, design 3.9) are what lifts it.
 */

import type { JsonObject } from "../types";

/** A mapping role and the `knownFields` setting that is its view. */
interface RoleField {
    readonly table: "nodes" | "edges";
    readonly role: string;
    readonly field: string;
    /** A value role (a unit, a meaning, a zone): written only beside this column role. */
    readonly with?: string;
}

/** Every role a setting is the view of, each column role before the value roles that go with it. */
export const ROLE_FIELDS: readonly RoleField[] = [
    { table: "edges", role: "weight", field: "edgeWeightPath" },
    { table: "edges", role: "weightMeaning", field: "edgeWeightMeaning", with: "weight" },
    { table: "edges", role: "time", field: "edgeTimePath" },
    { table: "edges", role: "timeUnit", field: "edgeTimeUnit", with: "time" },
    { table: "edges", role: "timeEnd", field: "edgeTimeEndPath" },
    { table: "edges", role: "timeSpells", field: "edgeTimeSpellsPath" },
    { table: "edges", role: "timeParseZone", field: "edgeTimeParseZone", with: "time" },
    { table: "nodes", role: "weight", field: "nodeWeightPath" },
    { table: "nodes", role: "time", field: "nodeTimePath" },
    { table: "nodes", role: "timeUnit", field: "nodeTimeUnit", with: "time" },
    { table: "nodes", role: "timeEnd", field: "nodeTimeEndPath" },
    { table: "nodes", role: "timeSpells", field: "nodeTimeSpellsPath" },
    { table: "nodes", role: "timeParseZone", field: "nodeTimeParseZone", with: "time" },
    { table: "nodes", role: "latitude", field: "nodeLatitudePath" },
    { table: "nodes", role: "longitude", field: "nodeLongitudePath" },
    { table: "nodes", role: "coordinates", field: "nodeCoordinatesPath" },
    { table: "nodes", role: "country", field: "nodeCountryPath" },
    { table: "nodes", role: "region", field: "nodeRegionPath" },
    { table: "nodes", role: "city", field: "nodeCityPath" },
    { table: "nodes", role: "x", field: "nodeXPath" },
    { table: "nodes", role: "y", field: "nodeYPath" },
    { table: "nodes", role: "z", field: "nodeZPath" },
];

/** The mapping member a `nodeLocationPath` is written as, by its `nodeLocationRole`. */
const LOCATION_MEMBER: Readonly<Record<string, string>> = {
    coords: "coordinates",
    country: "country",
    region: "region",
    city: "city",
};

/** One source's roles, by table, and the settings it could not write as a role. */
export interface SourceRoles {
    readonly nodes: JsonObject;
    readonly edges: JsonObject;
    readonly leftOut: readonly string[];
}

/** One source's roles by table, as its mapping names them. */
export interface TableRoles {
    readonly nodes: Readonly<JsonObject>;
    readonly edges: Readonly<JsonObject>;
}

/**
 * The location settings no mapping member holds (spec 4.1.3 names none), when set: a narrowing
 * column or country, and a `nodeLocationRole` that no `nodeLocationPath` is written with ("none",
 * the reader having removed the field, or a kind of place with no column).
 * @param known - The `knownFields` settings.
 * @param written - Whether `nodeLocationPath` was written as a role.
 * @returns The settings left out.
 */
function locationLeftOut(known: Readonly<JsonObject>, written: boolean): string[] {
    const out = ["nodeLocationWithinPath", "nodeLocationWithin"].filter((field) => typeof known[field] === "string");
    const role = known.nodeLocationRole;
    if (typeof role === "string" && role !== "auto" && !written) {
        out.push("nodeLocationRole");
    }

    return out;
}

/**
 * One source's roles from the graph-wide settings: each column role whose column the source's
 * table carries, and each value role beside its column role.
 * @param known - The `knownFields` settings, as this source sees them.
 * @param carries - Whether the source's table carries a column.
 * @returns The roles.
 */
export function rolesOf(
    known: Readonly<JsonObject>,
    carries: (table: "nodes" | "edges", column: string) => boolean,
): SourceRoles {
    const out: { nodes: JsonObject; edges: JsonObject } = { nodes: {}, edges: {} };
    for (const { table, role, field, with: beside } of ROLE_FIELDS) {
        const value = known[field];
        if (value === undefined || value === null) {
            continue;
        }

        if (
            beside === undefined ? typeof value === "string" && carries(table, value) : out[table][beside] !== undefined
        ) {
            out[table][role] = value;
        }
    }

    const leftOut = withLocationPath(out.nodes, known, carries);
    return { ...out, leftOut };
}

/**
 * Write a whole-location column (`nodeLocationPath`) as the kind of place it reads, when the
 * source's nodes carry it; "auto" has no spelling.
 * @param nodes - The node roles so far, written into.
 * @param known - The `knownFields` settings.
 * @param carries - Whether the source's table carries a column.
 * @returns The settings left out.
 */
function withLocationPath(
    nodes: JsonObject,
    known: Readonly<JsonObject>,
    carries: (table: "nodes" | "edges", column: string) => boolean,
): string[] {
    const path = known.nodeLocationPath;
    if (typeof path !== "string" || !carries("nodes", path)) {
        return locationLeftOut(known, false);
    }

    const member = LOCATION_MEMBER[String(known.nodeLocationRole)] as string | undefined;
    if (member === undefined || nodes[member] !== undefined) {
        return ["nodeLocationPath", ...locationLeftOut(known, false)];
    }

    nodes[member] = path;
    return locationLeftOut(known, true);
}

/**
 * The roles a source's mapping names, by table.
 * @param mapping - The mapping.
 * @returns Its roles.
 */
export function rolesAsRead(mapping: Readonly<JsonObject>): TableRoles {
    const out: { nodes: JsonObject; edges: JsonObject } = { nodes: {}, edges: {} };
    for (const { table, role } of ROLE_FIELDS) {
        const members = mapping[table] as JsonObject | undefined;
        if (members?.[role] !== undefined) {
            out[table][role] = members[role];
        }
    }

    return out;
}

/**
 * A source's roles as a save writes them (spec 4.1.3 rule 7). A source the open read keeps each
 * role as read while its setting is what the open set; a setting changed since is the role of a
 * source whose table carries its column, and a source that does not carry it keeps its own; a
 * setting cleared since clears it, and a value role goes with its column role. A source loaded
 * since takes the settings as {@link rolesOf}.
 * @param known - The `knownFields` settings now.
 * @param carries - Whether the source's table carries a column.
 * @param read - Its roles as read and the settings the open set, for a source the open read.
 * @param read.roles - Its roles as read.
 * @param read.patch - The settings the open set.
 * @returns The roles.
 */
export function sourceRoles(
    known: Readonly<JsonObject>,
    carries: (table: "nodes" | "edges", column: string) => boolean,
    read?: { readonly roles: TableRoles; readonly patch: Readonly<JsonObject> },
): SourceRoles {
    const fresh = rolesOf(known, carries);
    if (read === undefined) {
        return fresh;
    }

    const out: { nodes: JsonObject; edges: JsonObject } = { nodes: {}, edges: {} };
    // The column roles a source kept as read, so the value roles beside them stay as read too.
    const kept = new Set<string>();
    for (const { table, role, field, with: beside } of ROLE_FIELDS) {
        const now = known[field] ?? null;
        const changed = JSON.stringify(now) !== JSON.stringify(read.patch[field] ?? null);
        let value: unknown = read.roles[table][role];
        if (beside === undefined) {
            if (changed && (now === null || fresh[table][role] !== undefined)) {
                value = now ?? undefined;
            } else {
                kept.add(`${table}:${role}`);
            }
        } else if (!kept.has(`${table}:${beside}`)) {
            // Beside a column role the source newly takes: the setting's value.
            value = now ?? undefined;
        }

        if (value !== undefined && value !== null && (beside === undefined || out[table][beside] !== undefined)) {
            out[table][role] = value;
        }
    }

    const leftOut = withLocationPath(out.nodes, known, carries);
    return { ...out, leftOut };
}

/** A role the built sources give different values, so no graph-wide setting can be its view. */
export interface MixedRole {
    readonly table: "nodes" | "edges";
    readonly role: string;
    readonly field: string;
    /** Each naming source's value, by source id, in step order. */
    readonly values: ReadonlyMap<string, unknown>;
}

/**
 * The graph-wide settings the built sources' roles give: a role's value when every source naming
 * it agrees, else null (none names it, or they differ, listed in `mixed`).
 * @param mappings - Each built source's id and mapping, in step order.
 * @returns The `knownFields` patch and the roles that differ.
 */
export function knownOf(mappings: readonly (readonly [string, JsonObject])[]): {
    readonly patch: JsonObject;
    readonly mixed: readonly MixedRole[];
} {
    const patch: JsonObject = {};
    const mixed: MixedRole[] = [];
    for (const { table, role, field } of ROLE_FIELDS) {
        const values = new Map<string, unknown>();
        for (const [id, mapping] of mappings) {
            const members = mapping[table] as JsonObject | undefined;
            if (members?.[role] !== undefined) {
                values.set(id, members[role]);
            }
        }

        const distinct = new Set([...values.values()].map((value) => JSON.stringify(value)));
        patch[field] = distinct.size === 1 ? [...values.values()][0] : null;
        if (distinct.size > 1) {
            mixed.push({ table, role, field, values });
        }
    }

    return { patch, mixed };
}
