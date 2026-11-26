/**
 * @file A layout record as every section saves it (spec/README.md 5 rule 9): the arrangement in
 * `id`, its own options by the names the format gives them, and the engine that drew it, with the
 * options only that engine takes, as provenance in `drawnBy`. Recipe `layout.set`, results'
 * `layout` and view's `layout` all write and read it here.
 */

import { engineOptionNames, layoutDescriptor, savedLayoutOptions } from "../../catalog/layouts";
import type { GraphSession } from "../types";
import { isObject, resolvedLayoutOptions } from "./codecs/viewParts";
import type { JsonObject } from "./types";

/** Where a layout record's read reports what it could not apply. */
export type LayoutReport = (
    code: "W_LAYOUT_ENGINE_UNAVAILABLE" | "W_LAYOUT_OPTION_NOT_APPLIED",
    params: Readonly<Record<string, string>>,
) => void;

/** What a layout record asks the session for. */
export interface LayoutRequest {
    readonly id: string;
    /** The engine to draw it with, when the record's `drawnBy` names one this release can use. */
    readonly engine?: string;
    readonly options: JsonObject;
}

/**
 * A layout as a file writes it: its resolved options (9 rule 10) split between the arrangement's
 * own and the engine's.
 * @param session - The session, for its catalog.
 * @param layout - The layout in force.
 * @param layout.id - The arrangement.
 * @param layout.engine - The engine that draws it.
 * @param layout.options - The options asked for.
 * @returns `{ id, options?, drawnBy }`, with no empty object written.
 */
export function layoutRecordJson(
    session: GraphSession,
    layout: { readonly id: string; readonly engine: string; readonly options: Readonly<Record<string, unknown>> },
): JsonObject {
    const saved = new Set(savedLayoutOptions(layout.id));
    const own: JsonObject = {};
    const engines: JsonObject = {};
    for (const [key, value] of Object.entries(resolvedLayoutOptions(session, layout))) {
        (saved.has(key) ? own : engines)[key] = value;
    }

    return {
        id: layout.id,
        ...(Object.keys(own).length === 0 ? {} : { options: own }),
        drawnBy: { engine: layout.engine, ...(Object.keys(engines).length === 0 ? {} : { options: engines }) },
    };
}

/**
 * The engine a record's `drawnBy` names, when this release draws the arrangement with it.
 * @param id - The arrangement.
 * @param named - `drawnBy.engine` as read.
 * @param report - Where to report an engine this release lacks.
 * @returns The engine, or undefined for the default.
 */
function drawingEngine(id: string, named: unknown, report: LayoutReport): string | undefined {
    if (typeof named !== "string" || named === "") {
        return undefined;
    }

    if (engineOptionNames(id, named) === undefined) {
        report("W_LAYOUT_ENGINE_UNAVAILABLE", { layout: id, engine: named });
        return undefined;
    }

    return named;
}

/**
 * What a saved layout record asks for: the engine it was drawn with when this release can draw the
 * arrangement with it, and the options that arrangement and that engine take. Whatever is left
 * out is reported.
 * @param record - The record as read.
 * @param report - Where to report.
 * @returns The request, or undefined when the record names no arrangement.
 */
export function layoutRequest(record: JsonObject, report: LayoutReport): LayoutRequest | undefined {
    const { id } = record;
    if (typeof id !== "string") {
        return undefined;
    }

    const options = isObject(record.options) ? record.options : {};
    const drawnBy = isObject(record.drawnBy) ? record.drawnBy : {};
    const defaultEngine = layoutDescriptor(id)?.engine;
    if (defaultEngine === undefined) {
        // An arrangement nothing answers to fails when it is set; nothing here can be checked.
        return { id, options };
    }

    const engine = drawingEngine(id, drawnBy.engine, report);

    const drawing = engine ?? defaultEngine;
    const takes = new Set(engineOptionNames(id, drawing) ?? []);
    const saved = new Set(savedLayoutOptions(id));
    const applied: JsonObject = {};
    const offer = (key: string, value: unknown, own: boolean): void => {
        if (takes.has(key) && (!own || saved.has(key))) {
            applied[key] = value;
        } else {
            report("W_LAYOUT_OPTION_NOT_APPLIED", { layout: id, engine: drawing, option: key });
        }
    };
    for (const [key, value] of Object.entries(options)) {
        offer(key, value, true);
    }

    if (engine !== undefined && isObject(drawnBy.options)) {
        for (const [key, value] of Object.entries(drawnBy.options)) {
            offer(key, value, false);
        }
    }

    return { id, ...(engine === undefined ? {} : { engine }), options: applied };
}
