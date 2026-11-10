/**
 * The model canvas's drawing: a box per input of the recipe (and per node kind a step makes), where
 * each box sits, where a column's port is, and which box each end of a step's wire reaches. Only
 * geometry and names; graphty-element's draft holds the joins and does every count.
 */

import type { JoinInput, JoinStepEntry, JoinStepOutcome } from "@graphty/graphty-element/session";

import { columnOf, kindsOf, opOf } from "./ops";

/** A box's width, its header's height and a column row's height, in CSS pixels. */
export const BOX_W = 220;
export const HEAD = 29;
export const ROW = 22;
// ponytail: a box draws its first columns only; a table with more scrolls nothing, add a filter
// field to the box when real sources pass it.
export const MAX_COLUMNS = 24;

/** Half a pill's width and height, with room for a compare pill's Venn, in CSS pixels. */
export const PILL_HALF_W = 64;
const PILL_HALF_H = 12;
/** The space kept between a pill and a box. */
const PILL_GAP = 8;

/** Where a box sits and how tall it is, for keeping a pill off it. */
export interface BoxRect {
    readonly x: number;
    readonly y: number;
    readonly height: number;
}

/**
 * Where a pill centered on a point covers no box: the point itself when it is clear, else the
 * nearest place beside a box, at the same height (never past the canvas's left edge).
 * @param point - the pill's center.
 * @param rects - every box.
 * @returns the center to draw it at.
 */
export function clearOfBoxes(point: Point, rects: readonly BoxRect[]): Point {
    const clear = (x: number): boolean =>
        x >= PILL_HALF_W &&
        rects.every(
            (box) =>
                x + PILL_HALF_W + PILL_GAP <= box.x ||
                x - PILL_HALF_W - PILL_GAP >= box.x + BOX_W ||
                point.y + PILL_HALF_H <= box.y ||
                point.y - PILL_HALF_H >= box.y + box.height,
        );
    if (clear(point.x)) {
        return point;
    }
    const sides = rects.flatMap((box) => [box.x - PILL_HALF_W - PILL_GAP, box.x + BOX_W + PILL_HALF_W + PILL_GAP]);
    const best = sides.filter(clear).sort((a, b) => Math.abs(a - point.x) - Math.abs(b - point.x))[0];
    return best === undefined ? point : { x: best, y: point.y };
}

/** One box of the canvas. */
export interface CanvasBox {
    /** An input's key, or `kind:<kind>` for a kind a step makes. */
    readonly key: string;
    readonly name: string;
    readonly columns: readonly string[];
    /** Its list columns, by separator. */
    readonly lists: Readonly<Record<string, string>>;
    /** How many rows a step reads from it; absent for a kind. */
    readonly rows?: number;
    /** A table held apart from the graph. */
    readonly held: boolean;
    /** A node kind a step makes, not an input. */
    readonly kind: boolean;
}

/** A point on the canvas. */
export interface Point {
    readonly x: number;
    readonly y: number;
}

/** The step colors, by position in the recipe. */
const STEP_COLORS = ["#7048e8", "#e8590c", "#1098ad", "#d6336c", "#2f9e44", "#f59f00", "#1c7ed6", "#ae3ec9"];

/**
 * A step's color.
 * @param index - its position.
 * @returns the color.
 */
export function stepColor(index: number): string {
    return STEP_COLORS[index % STEP_COLORS.length];
}

/**
 * The boxes: every input, then every node kind a step makes.
 * @param inputs - the draft's inputs.
 * @param steps - the draft's steps.
 * @returns the boxes.
 */
export function boxesOf(inputs: readonly JoinInput[], steps: readonly JoinStepEntry[]): readonly CanvasBox[] {
    const boxes: CanvasBox[] = inputs.map((input) => ({
        key: input.key,
        name: input.name,
        columns: input.columns,
        lists: input.lists,
        rows: input.rows,
        held: input.held,
        kind: false,
    }));
    for (const step of steps) {
        for (const made of kindsOf(step.choices)) {
            const key = `kind:${made.kind}`;
            const found = boxes.findIndex((box) => box.key === key);
            const columns = [...new Set([...(found === -1 ? [] : boxes[found].columns), ...made.columns])];
            const box: CanvasBox = { key, name: made.kind, columns, lists: {}, held: false, kind: true };
            if (found === -1) {
                boxes.push(box);
            } else {
                boxes[found] = box;
            }
        }
    }
    return boxes;
}

/**
 * A box's height.
 * @param box - the box.
 * @returns the height.
 */
export function boxHeight(box: CanvasBox): number {
    const shown = Math.min(box.columns.length, MAX_COLUMNS) + (box.columns.length > MAX_COLUMNS ? 1 : 0);
    return HEAD + shown * ROW;
}

/**
 * Where each box sits before the reader moves it: the loaded sources along the top, the held
 * tables under them, the kinds the steps make under those.
 * @param boxes - the boxes.
 * @param placed - the boxes the reader moved.
 * @returns every box's top left corner.
 */
export function placeBoxes(
    boxes: readonly CanvasBox[],
    placed: ReadonlyMap<string, Point>,
): ReadonlyMap<string, Point> {
    const rows = [
        boxes.filter((box) => !box.held && !box.kind),
        boxes.filter((box) => box.held),
        boxes.filter((box) => box.kind),
    ];
    const at = new Map<string, Point>();
    let y = 24;
    for (const row of rows) {
        row.forEach((box, index) => {
            at.set(box.key, placed.get(box.key) ?? { x: 24 + index * (BOX_W + 80), y });
        });
        if (row.length > 0) {
            y += Math.max(...row.map(boxHeight)) + 72;
        }
    }
    return at;
}

/**
 * A column's port on a box: on its left or right edge, at the column's row (the header for a
 * column the box does not draw).
 * @param box - the box.
 * @param at - its top left corner.
 * @param column - the column.
 * @param toward - the point the wire runs to, which picks the edge.
 * @returns the port.
 */
export function portOf(box: CanvasBox, at: Point, column: string, toward: Point): Point {
    const index = box.columns.indexOf(column);
    const y = index === -1 || index >= MAX_COLUMNS ? at.y + HEAD / 2 : at.y + HEAD + index * ROW + ROW / 2;
    const right = toward.x >= at.x + BOX_W / 2;
    return { x: right ? at.x + BOX_W : at.x, y };
}

/** One end of a step's wire: a box and its column. */
export interface WireEnd {
    readonly box: string;
    readonly column: string;
}

/** The wire of one step: the columns its rows come from, and the columns they reach. */
export interface StepWire {
    readonly from: readonly WireEnd[];
    readonly to: readonly WireEnd[];
}

/**
 * The box a key of a step reaches: the one the reader let go on, else the made kind's box for a
 * kind's new end, else the first other box drawing the column.
 * @param boxes - the boxes.
 * @param step - the step.
 * @param index - the key's position.
 * @param chosen - the boxes the reader let go on, by key position.
 * @param used - boxes the step's other keys reach already.
 * @returns the box's key, or undefined when no box draws the column.
 */
export function reached(
    boxes: readonly CanvasBox[],
    step: JoinStepEntry,
    index: number,
    chosen: readonly string[] | undefined,
    used: readonly string[],
): string | undefined {
    const path = step.choices.keys[index]?.graph ?? "id";
    const column = columnOf(path);
    const pick = chosen?.[index];
    if (pick !== undefined && boxes.some((box) => box.key === pick && box.columns.includes(column))) {
        return pick;
    }
    const kinds = step.choices.endKinds;
    // A new kind's other end, read from a loaded source, is that source's own nodes.
    if (kinds !== undefined && index === 0 && boxes.some((box) => box.key === step.from && !box.held)) {
        return step.from;
    }
    const made = index === 0 ? kinds?.source : kinds?.target;
    if (made !== undefined) {
        return `kind:${made}`;
    }
    const others = boxes.filter((box) => box.key !== step.from && !box.held && box.columns.includes(column));
    return (others.find((box) => !used.includes(box.key)) ?? others[0])?.key;
}

/**
 * A step's wire.
 * @param boxes - the boxes.
 * @param step - the step.
 * @param chosen - the boxes the reader let go on, by key position.
 * @returns the wire.
 */
export function wireOf(
    boxes: readonly CanvasBox[],
    step: JoinStepEntry,
    chosen: readonly string[] | undefined,
): StepWire {
    const from: WireEnd[] = [];
    const to: WireEnd[] = [];
    const { via } = step.choices;
    step.choices.keys.forEach((key, index) => {
        from.push({ box: step.from, column: key.file });
        const mapping = step.choices.mapping?.columns;
        if (via !== undefined && mapping !== undefined && index === 0) {
            to.push({ box: via, column: mapping[0] });
            from.push({ box: via, column: mapping[1] });
        }
        const box = reached(
            boxes,
            step,
            index,
            chosen,
            to.map((end) => end.box),
        );
        if (box !== undefined) {
            to.push({ box, column: columnOf(key.graph) });
        }
    });
    return { from, to };
}

/**
 * A step's refusal as the canvas words it.
 * @param outcome - the step's outcome.
 * @returns the words, or undefined when it runs.
 */
export function refusalWords(outcome: JoinStepOutcome): string | undefined {
    const { error } = outcome;
    if (error === undefined) {
        return undefined;
    }
    const { reason } = error.details;
    const { column } = error.details;
    if (error.code === "E_SOURCE_UNKNOWN") {
        return "no input";
    }
    if (reason === "unknown-column" && typeof column === "string") {
        return `no ${column}`;
    }
    if (reason === "keys") {
        return "no key";
    }
    if (reason === "link") {
        return "no columns";
    }
    return "cannot run";
}

/**
 * A step's name: its kind and the input it reads.
 * @param step - the step.
 * @param boxes - the boxes, for the input's name.
 * @param words - each kind's name.
 * @returns the name.
 */
export function stepName(
    step: JoinStepEntry,
    boxes: readonly CanvasBox[],
    words: Readonly<Record<string, { readonly name: string }>>,
): string {
    const name = boxes.find((box) => box.key === step.from)?.name ?? step.from;
    return `${words[opOf(step.choices)].name} ${name.replace(/\.[^.]+$/, "")}`;
}
