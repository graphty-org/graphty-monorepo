/**
 * Latitude and longitude columns a format does not declare (CSV, a plain JSON node list), read as a geographic
 * position column by their names and their values. The plain columns stay as they are; the importer only adds a
 * role-`position` column of `{ kind: "geographic" }` built from them, for a layout that places nodes on the Earth.
 *
 * The rule is conservative: a node column named `lat` or `latitude` and one named `lon`, `lng` or `longitude` (any
 * case; `long` is not read, it is as often a length), both holding only numbers, every latitude within -90..90 and
 * every longitude within -180..180, at least one node carrying both. An `alt` or `altitude` column of numbers is the
 * third component. Nothing is added when the file already has a role-`position` column or a column named `position`.
 */

import {
    type ColumnHandle,
    coordinateSystemOf,
    type GraphSink,
    type GraphSnapshot,
    INVALID_INDEX,
} from "@graphty/graph-format";

import { ROLE_ASSUMED_CODE } from "../common/codes.js";
import type { CommonExportOptions, GraphExporter, LossNote } from "../types.js";

/** The name of the position column added. */
const POSITION = "position";

/** The axis each recognized column name reads as. */
const AXES: Readonly<Partial<Record<string, "lat" | "lon" | "alt">>> = {
    lat: "lat",
    latitude: "lat",
    lon: "lon",
    lng: "lon",
    longitude: "lon",
    alt: "alt",
    altitude: "alt",
};

/** The largest magnitude of each angle, in degrees. */
const LIMIT = { lat: 90, lon: 180 } as const;

/** The values one recognized column received, or null once a value ruled it out. */
interface Candidate {
    readonly axis: "lat" | "lon" | "alt";
    handle: ColumnHandle;
    values: Map<number, number> | null;
}

/**
 * A sink that passes everything through to `sink` and watches the node columns named like latitude, longitude and
 * altitude; `finish()` adds the geographic position column when they qualify.
 * @param sink - the importer's sink
 * @returns the watching sink and its finish step
 */
export function watchGeographic(sink: GraphSink): { readonly sink: GraphSink; finish(): void } {
    const byName = new Map<string, Candidate>();
    let declaredPosition = false;

    const note = (name: string): Candidate | undefined => {
        const axis = AXES[name.toLowerCase()];
        if (axis === undefined) {
            return undefined;
        }
        let candidate = byName.get(name);
        if (candidate === undefined) {
            candidate = { axis, handle: INVALID_INDEX as ColumnHandle, values: new Map() };
            byName.set(name, candidate);
        }
        return candidate;
    };
    const ofHandle = (handle: ColumnHandle): Candidate | undefined => {
        for (const [name, candidate] of byName) {
            if (candidate.handle === INVALID_INDEX) {
                candidate.handle = sink.nodeColumn(name);
            }
            if (candidate.handle === handle) {
                return candidate;
            }
        }
        return undefined;
    };

    const watching = new Proxy(sink, {
        get(target, key) {
            if (key === "declareNodeColumn") {
                return (decl: Parameters<GraphSink["declareNodeColumn"]>[0]): ColumnHandle => {
                    declaredPosition ||= decl.role === "position";
                    const handle = target.declareNodeColumn(decl);
                    const candidate = note(decl.name);
                    if (candidate !== undefined) {
                        candidate.handle = handle;
                    }
                    return handle;
                };
            }
            if (key === "setNodeValue") {
                return (column: ColumnHandle | string, index: number, value: unknown): void => {
                    target.setNodeValue(column, index, value);
                    const candidate = typeof column === "string" ? note(column) : ofHandle(column);
                    if (candidate === undefined || candidate.values === null) {
                        return;
                    }
                    const limit = candidate.axis === "alt" ? Infinity : LIMIT[candidate.axis];
                    if (typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit) {
                        candidate.values.set(index, value);
                    } else if (value !== null && value !== undefined) {
                        candidate.values = null;
                    }
                };
            }
            const member: unknown = Reflect.get(target, key, target);
            return typeof member === "function" ? (member as (...args: unknown[]) => unknown).bind(target) : member;
        },
    });

    return {
        sink: watching,
        finish(): void {
            const pick = (axis: Candidate["axis"]): [string, Map<number, number>] | null => {
                const found = [...byName].filter(([, c]) => c.axis === axis);
                // two columns of one axis (lat and latitude): ambiguous, read neither
                const values = found.length === 1 ? found[0][1].values : null;
                return values === null ? null : [found[0][0], values];
            };
            const lat = pick("lat");
            const lon = pick("lon");
            if (lat === null || lon === null || declaredPosition || sink.nodeColumn(POSITION) !== INVALID_INDEX) {
                return;
            }
            const rows = [...lat[1].keys()].filter((row) => lon[1].has(row));
            if (rows.length === 0) {
                return;
            }
            const alt = pick("alt");
            const handle = sink.declareNodeColumn({
                name: POSITION,
                dtype: "f64",
                components: 3,
                role: "position",
                nullable: true,
                extra: {
                    sourceDims: alt === null ? 2 : 3,
                    columns: [lon[0], lat[0], ...(alt === null ? [] : [alt[0]])],
                },
                coordinates: { kind: "geographic", dims: alt === null ? 2 : 3 },
            });
            for (const row of rows) {
                sink.setNodeValue(handle, row, [lon[1].get(row), lat[1].get(row), alt?.[1].get(row) ?? 0]);
            }
        },
    };
}

/** The dtypes that hold one number. */
const NUMERIC: ReadonlySet<string> = new Set(["f64", "f32", "i32", "u32", "u8"]);

/**
 * The latitude and longitude columns of a snapshot its CSV or JSON importer would read as a geographic position
 * column, by the rule above, when written as plain attributes.
 * @param snapshot - the graph
 * @returns the latitude column's name and how many nodes carry both, or null when nothing would be read
 */
function geographicSource(snapshot: GraphSnapshot): { readonly latitude: string; readonly count: number } | null {
    const { nodes } = snapshot;
    if (nodes.byRole("position") !== null || nodes.get(POSITION) !== null) {
        return null;
    }
    const pick = (axis: "lat" | "lon"): { name: string; rows: Set<number> } | null => {
        const found = nodes.names().filter((name) => AXES[name.toLowerCase()] === axis);
        const column = found.length === 1 ? nodes.get(found[0]) : null;
        if (column?.meta.components !== 1 || !NUMERIC.has(column.dtype)) {
            return null;
        }
        const rows = new Set<number>();
        for (let row = 0; row < snapshot.nodeCount; row++) {
            if (column.isSet(row)) {
                const value = Number(column.value(row));
                if (!Number.isFinite(value) || Math.abs(value) > LIMIT[axis]) {
                    return null;
                }
                rows.add(row);
            }
        }
        return { name: found[0], rows };
    };
    const lat = pick("lat");
    const lon = pick("lon");
    if (lat === null || lon === null) {
        return null;
    }
    const latitude = lat.name;
    const count = [...lat.rows].filter((row) => lon.rows.has(row)).length;
    return count === 0 ? null : { latitude, count };
}

/**
 * The snapshot without the geographic position column an importer built from latitude and longitude columns it still
 * holds: a writer writes those columns, and the copy would be written twice (or as drawing coordinates).
 * @param snapshot - the graph to write
 * @returns the snapshot, or a copy without that column
 */
function withoutBuiltPosition(snapshot: GraphSnapshot): GraphSnapshot {
    const column = snapshot.nodes.byRole("position");
    const columns = column?.meta.extra.columns;
    if (
        column === null ||
        !Array.isArray(columns) ||
        coordinateSystemOf(column.meta).kind !== "geographic" ||
        !columns.every((name) => typeof name === "string" && snapshot.nodes.get(name) !== null)
    ) {
        return snapshot;
    }
    const copy = snapshot.withColumns();
    copy.nodes.remove(column.meta.name);
    return copy;
}

/**
 * An exporter that writes a geographic position column read from latitude and longitude columns as those columns
 * alone, and, for a format whose importer reads such columns, says when a plain pair will read back as one.
 * @param exporter - the format's exporter
 * @param readsBack - whether the format's importer, under these options, reads the pair back
 * @returns the exporter
 */
export function writingGeographicAsColumns<O>(
    exporter: GraphExporter<O>,
    readsBack: (options: (O & CommonExportOptions) | undefined) => boolean = () => false,
): GraphExporter<O> {
    return Object.freeze({
        ...exporter,
        check(snapshot: GraphSnapshot, options?: O & CommonExportOptions): readonly LossNote[] {
            const notes = exporter.check(withoutBuiltPosition(snapshot), options);
            const source = readsBack(options) ? geographicSource(snapshot) : null;
            return source === null
                ? notes
                : Object.freeze([
                      ...notes,
                      Object.freeze({
                          code: ROLE_ASSUMED_CODE,
                          message: `node column "${source.latitude}" and its longitude read back as a geographic position column "${POSITION}" too`,
                          column: POSITION,
                          count: source.count,
                      }),
                  ]);
        },
        export(snapshot: GraphSnapshot, options?: O & CommonExportOptions): AsyncIterable<Uint8Array> {
            return exporter.export(withoutBuiltPosition(snapshot), options);
        },
        exportToString(snapshot: GraphSnapshot, options?: O & CommonExportOptions): Promise<string> {
            return exporter.exportToString(withoutBuiltPosition(snapshot), options);
        },
    });
}
