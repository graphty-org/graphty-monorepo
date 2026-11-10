import type { JoinRegion, JoinStepEntry, JoinStepOutcome } from "@graphty/graphty-element/session";
import { Text } from "@mantine/core";
import React, { useMemo, useRef, useState } from "react";

import { GLYPHS } from "../../glyphs";
import { formatNumber } from "../../inspector/words";
import {
    BOX_W,
    boxHeight,
    type CanvasBox,
    MAX_COLUMNS,
    placeBoxes,
    type Point,
    portOf,
    refusalWords,
    stepColor,
    wireOf,
} from "./model";
import { OP_GLYPHS } from "./opGlyphs";
import { addsThings, mainCount, OP_WORDS, opOf } from "./ops";
import { REGION_COLORS, REGIONS } from "./regions";
import { Venn } from "./Venn";

/** Where a drag of a column was let go: a box's column, a box, or empty canvas. */
export interface CanvasDrop {
    readonly from: { readonly box: string; readonly column: string };
    /** The box let go on, and its column when the pointer was on one. */
    readonly to: { readonly box: string; readonly column?: string } | null;
    /** The pointer, in the viewport. */
    readonly client: Point;
}

/** What the canvas picks out: a fate chip, a Venn region or a merge count, by an id of its own. */
export interface CanvasFocusKey {
    readonly key: string;
    readonly region?: JoinRegion;
}

/** Props for the canvas. */
export interface ModelCanvasProps {
    readonly boxes: readonly CanvasBox[];
    readonly steps: readonly JoinStepEntry[];
    /** Each step's outcome, by id. */
    readonly outcomes: ReadonlyMap<string, JoinStepOutcome>;
    /** The step the panes show. */
    readonly selected: string | undefined;
    /** The boxes each step's keys were let go on. */
    readonly targets: ReadonlyMap<string, readonly string[]>;
    /** What is picked out now. */
    readonly focus: CanvasFocusKey | null;
    readonly onSelect: (step: string) => void;
    /** Picks out a compare's region, or a merge's merged nodes; null lets go. */
    readonly onFocus: (step: string, focus: CanvasFocusKey | null) => void;
    readonly onDrop: (drop: CanvasDrop) => void;
    /** A list column's split chip: a split step from it. */
    readonly onSplit: (box: string, column: string) => void;
}

/** A drag in progress: a wire from a column, or a box moving. */
type Drag =
    | {
          readonly type: "wire";
          readonly box: string;
          readonly column: string;
          readonly at: Point;
          readonly over?: string;
      }
    | { readonly type: "box"; readonly box: string; readonly grab: Point };

/**
 * A point of the canvas world under the pointer.
 * @param world - the world element.
 * @param event - the pointer event.
 * @param event.clientX - its x in the viewport.
 * @param event.clientY - its y in the viewport.
 * @returns the point.
 */
function worldPoint(world: HTMLElement | null, event: { clientX: number; clientY: number }): Point {
    const rect = world?.getBoundingClientRect();
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
}

/**
 * What the pointer is over: a column of a box, a box, or nothing.
 * @param event - the pointer event.
 * @param event.clientX - its x in the viewport.
 * @param event.clientY - its y in the viewport.
 * @returns the drop target.
 */
function dropTarget(event: { clientX: number; clientY: number }): { box: string; column?: string } | null {
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const column = hit?.closest<HTMLElement>("[data-col]");
    const box = hit?.closest<HTMLElement>("[data-box]");
    if (box?.dataset.box === undefined) {
        return null;
    }
    return { box: box.dataset.box, ...(column?.dataset.col === undefined ? {} : { column: column.dataset.col }) };
}

/**
 * A wire's curve between two points.
 * @param a - one end.
 * @param b - the other end.
 * @returns the path.
 */
function curve(a: Point, b: Point): string {
    const bend = Math.max(40, Math.abs(b.x - a.x) / 2);
    const out = b.x >= a.x ? bend : -bend;
    return `M${String(a.x)} ${String(a.y)} C${String(a.x + out)} ${String(a.y)} ${String(b.x - out)} ${String(b.y)} ${String(b.x)} ${String(b.y)}`;
}

/**
 * The model canvas: a box per input, listing its columns; a wire per step from the columns its
 * rows come from to the columns they reach, with the step's numbered pill on it. Dragging a column
 * onto another column, a box or empty canvas starts a join; dragging a box's header moves it.
 * Pointer events only, so a drag works the same with a mouse, a pen or a finger (and in Safari).
 * @param props - Component props
 * @returns the canvas.
 */
export function ModelCanvas(props: ModelCanvasProps): React.JSX.Element {
    const { boxes, steps, outcomes, selected, targets, focus } = props;
    const world = useRef<HTMLDivElement>(null);
    const [placed, setPlaced] = useState<ReadonlyMap<string, Point>>(new Map());
    const [drag, setDrag] = useState<Drag | null>(null);
    const at = useMemo(() => placeBoxes(boxes, placed), [boxes, placed]);
    const size = useMemo(() => {
        let width = 0;
        let height = 0;
        for (const box of boxes) {
            const corner = at.get(box.key) ?? { x: 0, y: 0 };
            width = Math.max(width, corner.x + BOX_W + 160);
            height = Math.max(height, corner.y + boxHeight(box) + 120);
        }
        return { width, height };
    }, [boxes, at]);

    const wires = steps.flatMap((step, index) => {
        const wire = wireOf(boxes, step, targets.get(step.id));
        const ends = [...wire.from, ...wire.to].flatMap((end) => {
            const box = boxes.find((each) => each.key === end.box);
            const corner = at.get(end.box);
            return box === undefined || corner === undefined ? [] : [{ end, box, corner }];
        });
        if (ends.length === 0) {
            return [];
        }
        const centers = ends.map(({ corner }) => ({ x: corner.x + BOX_W / 2, y: corner.y }));
        const toward = {
            x: centers.reduce((sum, each) => sum + each.x, 0) / centers.length,
            y: centers.reduce((sum, each) => sum + each.y, 0) / centers.length,
        };
        const ports = ends.map(({ box, corner, end }) => portOf(box, corner, end.column, toward));
        const xs = ports.map((port) => port.x);
        // Ports on one edge (boxes stacked): the pill sits out beside them, not over a box.
        const stacked = Math.max(...xs) - Math.min(...xs) < BOX_W / 2;
        const middle = {
            x: stacked ? Math.max(...xs) + 56 : xs.reduce((sum, x) => sum + x, 0) / xs.length,
            y: ports.reduce((sum, port) => sum + port.y, 0) / ports.length,
        };
        const paths = ends.map(({ box, corner, end }) => curve(portOf(box, corner, end.column, middle), middle));
        const ontoName = boxes.find((box) => box.key === wire.to[0]?.box)?.name ?? "";
        return [{ step, index, middle, paths, ends, ontoName }];
    });
    const bound = new Set(wires.flatMap(({ ends }) => ends.map(({ end }) => `${end.box}\u0000${end.column}`)));

    return (
        <div className="jwc-canvas" data-testid="join-canvas">
            <div
                ref={world}
                className="jwc-world"
                style={{ width: size.width, height: size.height }}
                onPointerMove={(event) => {
                    if (drag?.type === "wire") {
                        const over = dropTarget(event);
                        setDrag({
                            ...drag,
                            at: worldPoint(world.current, event),
                            over: over === null ? undefined : `${over.box}\u0000${over.column ?? ""}`,
                        });
                    } else if (drag?.type === "box") {
                        const point = worldPoint(world.current, event);
                        setPlaced(
                            new Map(at).set(drag.box, {
                                x: Math.max(0, point.x - drag.grab.x),
                                y: Math.max(0, point.y - drag.grab.y),
                            }),
                        );
                    }
                }}
                onPointerUp={(event) => {
                    if (drag?.type === "wire") {
                        const to = dropTarget(event);
                        props.onDrop({
                            from: { box: drag.box, column: drag.column },
                            to,
                            client: { x: event.clientX, y: event.clientY },
                        });
                    }
                    setDrag(null);
                }}
                onPointerCancel={() => {
                    setDrag(null);
                }}
            >
                <svg className="jwc-wires" width={size.width} height={size.height} aria-hidden>
                    {wires.map(({ step, index, paths }) =>
                        paths.map((d, at) => (
                            <path
                                key={`${step.id}:${String(at)}`}
                                d={d}
                                fill="none"
                                stroke={stepColor(index)}
                                strokeWidth={step.id === selected ? 2.5 : 1.5}
                                strokeOpacity={selected === undefined || step.id === selected ? 1 : 0.45}
                            />
                        )),
                    )}
                    {drag?.type === "wire" ? <TempWire drag={drag} boxes={boxes} at={at} /> : null}
                </svg>
                {boxes.map((box) => (
                    <Box
                        key={box.key}
                        box={box}
                        at={at.get(box.key) ?? { x: 0, y: 0 }}
                        bound={bound}
                        over={drag?.type === "wire" ? drag.over : undefined}
                        dragging={drag?.type === "wire" ? drag.box : undefined}
                        onWireStart={(column, event) => {
                            event.preventDefault();
                            world.current?.setPointerCapture(event.pointerId);
                            setDrag({ type: "wire", box: box.key, column, at: worldPoint(world.current, event) });
                        }}
                        onMoveStart={(event) => {
                            event.preventDefault();
                            world.current?.setPointerCapture(event.pointerId);
                            const point = worldPoint(world.current, event);
                            const corner = at.get(box.key) ?? { x: 0, y: 0 };
                            setDrag({
                                type: "box",
                                box: box.key,
                                grab: { x: point.x - corner.x, y: point.y - corner.y },
                            });
                        }}
                        onSplit={(column) => {
                            props.onSplit(box.key, column);
                        }}
                    />
                ))}
                {wires.map(({ step, index, middle, ontoName }) => (
                    <Pill
                        key={step.id}
                        step={step}
                        index={index}
                        at={middle}
                        outcome={outcomes.get(step.id)}
                        selected={step.id === selected}
                        dimmed={selected !== undefined && step.id !== selected}
                        focus={step.id === selected ? focus : null}
                        boxes={boxes}
                        ontoName={ontoName}
                        onSelect={() => {
                            props.onSelect(step.id);
                        }}
                        onFocus={(next) => {
                            props.onFocus(step.id, next);
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

/**
 * The wire following the pointer while a column is dragged.
 * @param props - Component props
 * @param props.drag - the drag.
 * @param props.boxes - the boxes.
 * @param props.at - where each box sits.
 * @returns the wire.
 */
function TempWire({
    drag,
    boxes,
    at,
}: Readonly<{
    drag: Extract<Drag, { type: "wire" }>;
    boxes: readonly CanvasBox[];
    at: ReadonlyMap<string, Point>;
}>): React.JSX.Element | null {
    const box = boxes.find((each) => each.key === drag.box);
    const corner = at.get(drag.box);
    if (box === undefined || corner === undefined) {
        return null;
    }
    return (
        <path
            className="jwc-temp-wire"
            d={curve(portOf(box, corner, drag.column, drag.at), drag.at)}
            fill="none"
            stroke="var(--mantine-color-blue-6)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
        />
    );
}

/** Props for a box. */
interface BoxProps {
    readonly box: CanvasBox;
    readonly at: Point;
    /** The `box\0column` ends a step's wire reaches. */
    readonly bound: ReadonlySet<string>;
    /** The `box\0column` under a dragged wire. */
    readonly over?: string;
    /** The box a wire is dragged from. */
    readonly dragging?: string;
    readonly onWireStart: (column: string, event: React.PointerEvent) => void;
    readonly onMoveStart: (event: React.PointerEvent) => void;
    readonly onSplit: (column: string) => void;
}

/**
 * One box: its header (drag to move), then a row per column (drag to join), each with a port on
 * both edges; a list column carries a split chip.
 * @param props - Component props
 * @returns the box.
 */
function Box(props: BoxProps): React.JSX.Element {
    const { box, at, bound, over, dragging, onWireStart, onMoveStart, onSplit } = props;
    let Icon = box.held ? GLYPHS.tableFile : GLYPHS.graph;
    if (box.kind) {
        Icon = GLYPHS.tags;
    }
    const shown = box.columns.slice(0, MAX_COLUMNS);
    const isOver = over?.startsWith(`${box.key}\u0000`) === true && dragging !== box.key;
    return (
        <div
            className="jwc-box"
            data-box={box.key}
            data-kind={box.kind ? "" : undefined}
            data-held={box.held ? "" : undefined}
            data-over={isOver && over === `${box.key}\u0000` ? "" : undefined}
            role="group"
            aria-label={box.name}
            style={{ left: at.x, top: at.y, width: BOX_W }}
        >
            <div className="jwc-box-head" onPointerDown={onMoveStart}>
                <Icon size={14} aria-hidden />
                <Text span size="sm" fw={600} truncate className="jwc-box-name">
                    {box.name}
                </Text>
                {box.rows === undefined ? null : (
                    <Text span size="sm" c="dimmed" className="jwc-box-count">
                        {formatNumber(box.rows)}
                    </Text>
                )}
            </div>
            {shown.map((column) => {
                const key = `${box.key}\u0000${column}`;
                return (
                    <div
                        key={column}
                        className="jwc-col"
                        data-col={column}
                        data-bound={bound.has(key) ? "" : undefined}
                        data-over={over === key && dragging !== box.key ? "" : undefined}
                        aria-label={`${box.name} ${column}`}
                        onPointerDown={(event) => {
                            if (!box.kind) {
                                onWireStart(column, event);
                            }
                        }}
                    >
                        <span className="jwc-port jwc-port-l" aria-hidden />
                        <Text span size="sm" truncate className="jwc-col-name">
                            {column}
                        </Text>
                        {box.lists[column] === undefined ? null : (
                            <button
                                type="button"
                                className="jwc-list"
                                aria-label={`Split ${column}`}
                                onPointerDown={(event) => {
                                    event.stopPropagation();
                                }}
                                onClick={() => {
                                    onSplit(column);
                                }}
                            >
                                a{box.lists[column]}b
                            </button>
                        )}
                        <span className="jwc-port jwc-port-r" aria-hidden />
                    </div>
                );
            })}
            {box.columns.length > MAX_COLUMNS ? (
                <div className="jwc-col jwc-more">
                    <Text span size="sm" c="dimmed">
                        +{formatNumber(box.columns.length - MAX_COLUMNS)}
                    </Text>
                </div>
            ) : null}
        </div>
    );
}

/** Props for a step's pill. */
interface PillProps {
    readonly step: JoinStepEntry;
    readonly index: number;
    readonly at: Point;
    readonly outcome?: JoinStepOutcome;
    readonly selected: boolean;
    readonly dimmed: boolean;
    readonly focus: CanvasFocusKey | null;
    readonly boxes: readonly CanvasBox[];
    /** The name of the box the step's first key reaches. */
    readonly ontoName: string;
    readonly onSelect: () => void;
    readonly onFocus: (focus: CanvasFocusKey | null) => void;
}

/**
 * A step's pill on its wire: its number, its kind's glyph and its count; a compare's Venn and its
 * groups, a merge's merged count, each a button that picks those nodes out.
 * @param props - Component props
 * @returns the pill.
 */
function Pill(props: PillProps): React.JSX.Element {
    const { step, index, at, outcome, selected, dimmed, focus, boxes, ontoName, onSelect, onFocus } = props;
    const op = opOf(step.choices);
    const Icon = OP_GLYPHS[op];
    const report = outcome?.report;
    const refusal = outcome === undefined ? undefined : refusalWords(outcome);
    const count = report === undefined ? 0 : mainCount(op, report, step.choices);
    const fromName = boxes.find((box) => box.key === step.from)?.name ?? step.from;
    const regions = report?.regions?.nodes;
    const regionWords = {
        both: "both",
        "only-from": `only ${fromName.replace(/\.[^.]+$/, "")}`,
        "only-onto": `only ${ontoName.replace(/\.[^.]+$/, "")}`,
    } as const;
    return (
        <div
            className="jwc-pill"
            data-step={step.id}
            data-selected={selected ? "" : undefined}
            data-dim={dimmed ? "" : undefined}
            data-error={refusal === undefined ? undefined : ""}
            data-zero={refusal === undefined && report !== undefined && count === 0 ? "" : undefined}
            style={{ left: at.x, top: at.y, ["--jc" as string]: stepColor(index) }}
        >
            <button
                type="button"
                className="jwc-pill-main"
                aria-label={`${String(index + 1)} ${OP_WORDS[op].name}`}
                aria-pressed={selected}
                onPointerDown={(event) => {
                    event.stopPropagation();
                }}
                onClick={onSelect}
            >
                <span className="jwc-no">{index + 1}</span>
                <Icon size={14} aria-hidden />
                {(op === "compare" || op === "merge") && refusal === undefined ? null : (
                    <span className="jwc-pill-count">
                        {refusal === undefined
                            ? `${addsThings(op, step.choices) ? "+" : ""}${formatNumber(count)}`
                            : `! ${refusal}`}
                    </span>
                )}
            </button>
            {op === "merge" && report !== undefined ? (
                <button
                    type="button"
                    className="jwc-pill-chip"
                    aria-pressed={focus?.key === "merged"}
                    onPointerDown={(event) => {
                        event.stopPropagation();
                    }}
                    onClick={() => {
                        onFocus(focus?.key === "merged" ? null : { key: "merged" });
                    }}
                >
                    {formatNumber(report.merged)} merged
                </button>
            ) : null}
            {op === "compare" && regions !== undefined ? (
                <>
                    <Venn
                        labels={regionWords}
                        picked={focus?.region ?? null}
                        onPick={(region) => {
                            onFocus(region === null ? null : { key: `region:${region}`, region });
                        }}
                    />
                    <span className="jwc-pill-count">{formatNumber(regions.both)}</span>
                    <div className="jwc-groups" role="group" aria-label="Comparison groups">
                        {REGIONS.map((region) => (
                            <button
                                key={region}
                                type="button"
                                className="jwc-group"
                                aria-pressed={focus?.region === region}
                                style={{ ["--rc" as string]: REGION_COLORS[region] }}
                                onPointerDown={(event) => {
                                    event.stopPropagation();
                                }}
                                onClick={() => {
                                    onFocus(focus?.region === region ? null : { key: `region:${region}`, region });
                                }}
                            >
                                <span className="jwc-group-name">{regionWords[region]}</span>
                                <span className="jwc-group-count">{formatNumber(regions[region])}</span>
                            </button>
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    );
}
