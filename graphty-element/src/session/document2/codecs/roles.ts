/**
 * @file Each source's weight, time and location roles (spec 4.1.3) and the graph-wide
 * `data.knownFields` settings that are their view. Experimental (`save-files-v2`).
 *
 * The session holds one setting per role for the whole graph. A save writes that setting as the
 * role of each source whose rows carry the column it names; an open sets it from the roles of the
 * built sources when they agree, and to null when none names it or they differ.
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
    const leftOut: string[] = [];
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

    // A whole-location column is written as the kind of place it reads; "auto" has no spelling.
    const path = known.nodeLocationPath;
    if (typeof path === "string" && carries("nodes", path)) {
        const member = LOCATION_MEMBER[String(known.nodeLocationRole)] as string | undefined;
        if (member === undefined || out.nodes[member] !== undefined) {
            leftOut.push("nodeLocationPath");
        } else {
            out.nodes[member] = path;
        }
    }

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
