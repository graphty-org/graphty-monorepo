import { FieldRow, PanelField, PanelLabelsProvider, ResetButton, SegmentedControl } from "@graphty/compact-mantine";
import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { LayoutDescriptor, OptionDescriptor } from "@graphty/graphty-element/catalog";
import type { BasemapConfig } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Button, Checkbox, Group, Stack, Text } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { costLine, optionWords } from "../analyze/words";
import { selectionWorkspaceOn } from "../features";
import { OptionRow, OptionsForm } from "../options/OptionsForm";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { MapSourceFields } from "./MapSourceFields";
import { engineOf, isDrawn, LAYOUT_SEED, layoutName, randomSeed, startingValues, unavailable } from "./methods";
import { columnFitWords, layoutErrorWords, locationFieldWords } from "./refusalWords";
import { TransitionRow } from "./TransitionRow";
import { SHOWN_ONLY_WORDS } from "./words";

/** The location map's id, whose form names the columns it read and picks the map it draws on. */
const MAP_LAYOUT = "location-map";

/**
 * The map's options its form does not draw: Data > Fields designates its location columns, Shape
 * is its 3D | 2D, and a reader has no use for another name for the same choice in Projection.
 */
const MAP_UNDRAWN_OPTIONS: ReadonlySet<string> = new Set([
    "location",
    "latitude",
    "longitude",
    "mapDimension",
    "projection",
]);

/**
 * The columns the map reads: the ones its options name, else what the element says (the
 * designated columns, or the ones it finds itself), as one line.
 * @param session - the element's session.
 * @param values - the layout's options.
 * @returns the column, or the pair; empty when there is none.
 */
function locationLine(session: GraphSession, values: Readonly<Record<string, unknown>>): string {
    const named = (name: string): string | null => (typeof values[name] === "string" ? values[name] : null);
    const own = { location: named("location"), latitude: named("latitude"), longitude: named("longitude") };
    const { location, latitude, longitude } =
        own.location === null && own.latitude === null && own.longitude === null
            ? session.layout.locationColumns()
            : own;
    return location ?? [latitude, longitude].filter((column) => column !== null).join(", ");
}

/**
 * The columns the drawn map read, as {@link locationLine} writes them.
 * @param element - the element.
 * @returns the line, or undefined when no map is drawn.
 */
function drawnLine(element: GraphtyElement | null): string | undefined {
    const location = element?.mapFrame?.location;
    if (location === undefined) {
        return undefined;
    }
    return location.kind === "columns" ? `${location.latitude}, ${location.longitude}` : location.column;
}

/** Props for LayoutForm. */
interface LayoutFormProps {
    session: GraphSession;
    /** The layout being edited. */
    descriptor: LayoutDescriptor;
    /** Drawn above the description (the popover's Back and name). */
    header?: React.ReactNode;
    /** Focus starts on the button (the popover), so Enter applies at once. */
    focusButton?: boolean;
    /** Called once a layout has been applied (the popover closes). */
    onApplied?: () => void;
    /** Key handling of the host (the popover's Esc). */
    onKeyDown?: (event: React.KeyboardEvent) => void;
    /**
     * Whether the form offers its own 3D | 2D Shape (the popover). Graph settings leaves it out:
     * the toolbar's Mode menu is the one 3D | 2D control there.
     */
    shapeChoice?: boolean;
}

/**
 * Whether two option sets hold the same values; a missing key and an undefined one are the same.
 * @param a - one set.
 * @param b - the other.
 * @returns true when every key holds the same value.
 */
function sameValues(a: Readonly<Record<string, unknown>>, b: Readonly<Record<string, unknown>>): boolean {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].every(
        // An object value (the map's `map`) is the same when it says the same.
        (key) => Object.is(a[key], b[key]) || JSON.stringify(a[key]) === JSON.stringify(b[key]),
    );
}

/**
 * The shape a set of values asks for: its `dim`, else what is drawn when it is the current layout
 * with its own engine, else the element's default in the 3D view.
 * @param values - the values.
 * @param drawn - what the current layout is drawn in, when these values are its own.
 * @returns "2d" or "3d".
 */
function shapeOf(values: Readonly<Record<string, unknown>>, drawn: "2d" | "3d" | undefined): "2d" | "3d" {
    if (values.dim === 2) {
        return "2d";
    }
    return values.dim === 3 ? "3d" : (drawn ?? "3d");
}

/**
 * The map's shape: the map it asks for, which is the element's default 3D map unless it says 2D.
 * @param values - the values.
 * @returns "2d" or "3d".
 */
function mapShapeOf(values: Readonly<Record<string, unknown>>): "2d" | "3d" {
    return values.mapDimension === "2d" ? "2d" : "3d";
}

/**
 * The form's last row: the cost of applying, or why it cannot be, and Apply ("Applied" when the
 * graph is drawn so already).
 * @param props - Component props
 * @param props.reason - Why the layout cannot run, or null
 * @param props.seconds - The estimated run time
 * @param props.differs - Whether applying would change the drawing
 * @returns The row
 */
function ApplyRow({
    reason,
    seconds,
    differs,
}: Readonly<{ reason: string | null; seconds: number; differs: boolean }>): React.JSX.Element {
    return (
        <Group justify="space-between" wrap="nowrap" className="ws-layout-apply">
            <Text size="xs" c={reason === null ? "dimmed" : "red"}>
                {reason ?? costLine(seconds)}
            </Text>
            <Button size="xs" type="submit" disabled={!differs || reason !== null}>
                {differs ? "Apply" : "Applied"}
            </Button>
        </Group>
    );
}

/**
 * What picking a shape asks for.
 * @param picked - The shape picked.
 * @param start - What the form started with, when the shape picked is the one it is drawn in.
 * @param values - The form's values.
 * @param isMap - Whether the layout is the map, whose shape is its `mapDimension`, not its `dim`.
 * @returns The values.
 */
function shapePicked(
    picked: "2d" | "3d",
    start: Readonly<Record<string, unknown>> | null,
    values: Record<string, unknown>,
    isMap: boolean,
): Record<string, unknown> {
    const key = isMap ? "mapDimension" : "dim";
    if (start !== null) {
        // Back to what is drawn: its own value (or none).
        const { [key]: _shape, ...rest } = values;
        return start[key] === undefined ? rest : { ...rest, [key]: start[key] };
    }
    if (isMap) {
        return { ...values, mapDimension: picked };
    }
    return { ...values, dim: picked === "2d" ? 2 : 3 };
}

/**
 * Shape: whether the layout is drawn in 3D or flat in the 3D view.
 * @param props - Component props
 * @param props.id - The layout's id, for the label's id
 * @param props.shape - The shape asked for
 * @param props.onPick - Called with the shape picked
 * @param props.row - Drawn as a line of the `selection-workspace` forms
 * @returns The field
 */
function ShapeField({
    id,
    shape,
    onPick,
    row,
}: Readonly<{
    id: string;
    shape: "2d" | "3d";
    onPick: (picked: "2d" | "3d") => void;
    row: boolean;
}>): React.JSX.Element {
    const control = (
        <SegmentedControl
            {...(row ? { "aria-label": "Shape" } : { "aria-labelledby": `layout-shape-${id}` })}
            fullWidth
            value={shape}
            data={[
                { value: "3d", label: "3D" },
                { value: "2d", label: "2D" },
            ]}
            onChange={(picked) => {
                onPick(picked === "2d" ? "2d" : "3d");
            }}
        />
    );
    return row ? (
        <OptionRow label="Shape">{control}</OptionRow>
    ) : (
        <Stack gap={2}>
            <Text size="xs" id={`layout-shape-${id}`}>
                Shape
            </Text>
            {control}
        </Stack>
    );
}

/**
 * Seed, with its reset, and Reshuffle, which applies a new seed at once.
 * @param props - Component props
 * @param props.values - The form's values
 * @param props.edit - Writes the form's values
 * @param props.onReshuffle - Applies the layout with a new random seed
 * @param props.row - Drawn as a line of the `selection-workspace` forms
 * @returns The fields
 */
function SeedField({
    values,
    edit,
    onReshuffle,
    row,
}: Readonly<{
    values: Record<string, unknown>;
    edit: (next: Record<string, unknown>) => void;
    onReshuffle: () => void;
    row: boolean;
}>): React.JSX.Element {
    const seed = typeof values.seed === "number" ? values.seed : undefined;
    if (row) {
        return (
            <OptionRow
                label="Seed"
                after={
                    <Button size="compact-xs" variant="default" onClick={onReshuffle}>
                        Reshuffle
                    </Button>
                }
            >
                <PanelField
                    label="Seed"
                    kind="number"
                    width="fill"
                    value={seed ?? LAYOUT_SEED}
                    step={1}
                    decimalScale={0}
                    onChange={(next) => {
                        edit({ ...values, seed: Number(next) });
                    }}
                />
            </OptionRow>
        );
    }
    return (
        <Group gap={8} wrap="nowrap" align="flex-end">
            <div style={{ flex: 1, minWidth: 0 }}>
                <PanelLabelsProvider showLabels>
                    <FieldRow
                        trailing={
                            seed !== undefined && (
                                <ResetButton
                                    label="Seed"
                                    onClick={() => {
                                        edit({ ...values, seed: undefined });
                                    }}
                                />
                            )
                        }
                    >
                        <PanelField
                            label="Seed"
                            kind="number"
                            value={seed ?? LAYOUT_SEED}
                            step={1}
                            decimalScale={0}
                            onChange={(next) => {
                                edit({ ...values, seed: Number(next) });
                            }}
                        />
                    </FieldRow>
                </PanelLabelsProvider>
            </div>
            <Button size="compact-xs" variant="default" onClick={onReshuffle}>
                Reshuffle
            </Button>
        </Group>
    );
}

/**
 * The map's columns: the drawn map's element (only when this map is the one drawn), the columns its
 * options read, and the ones the drawn map read.
 * @param input - what to read
 * @param input.session - the element's session
 * @param input.element - the element
 * @param input.values - the layout's options
 * @param input.isMap - whether the layout is the map
 * @param input.isCurrent - whether the layout is the one drawn
 * @returns the drawn map, and the two lines
 */
function mapLines(input: {
    session: GraphSession;
    element: GraphtyElement | null;
    values: Readonly<Record<string, unknown>>;
    isMap: boolean;
    isCurrent: boolean;
}): { mapDrawn: GraphtyElement | null; reads: string; read: string | undefined } {
    const { session, element, values, isMap, isCurrent } = input;
    const mapDrawn = isMap && isCurrent ? element : null;
    const reads = isMap ? locationLine(session, values) : "";
    return { mapDrawn, reads, read: drawnLine(mapDrawn) };
}

/**
 * Whether Apply would change the drawing: another layout, engine or options than the drawn one.
 * @param input - what to compare
 * @param input.isCurrent - whether the layout is the one drawn
 * @param input.engine - the form's engine
 * @param input.descriptor - the layout
 * @param input.current - the drawn layout
 * @param input.values - the form's options
 * @param input.read - the columns the drawn map read
 * @param input.reads - the columns the map reads now
 * @returns true when it differs
 */
function layoutDiffers(input: {
    isCurrent: boolean;
    engine: string | undefined;
    descriptor: LayoutDescriptor;
    current: GraphSession["layout"];
    values: Readonly<Record<string, unknown>>;
    read: string | undefined;
    reads: string;
}): boolean {
    const { isCurrent, engine, descriptor, current, values, read, reads } = input;
    return (
        !isCurrent ||
        (engine ?? descriptor.engine) !== current.engine ||
        !sameValues(values, current.options) ||
        // Another location designated since the map was drawn: Apply reads it.
        (read !== undefined && read !== reads)
    );
}

/**
 * The map's Location row, naming the columns it reads, with a note on what they held.
 * @param props - Component props
 * @param props.reads - the columns the map reads
 * @param props.mapNote - what the columns held
 * @param props.onLocation - goes to Data > Fields
 * @returns the row
 */
function MapLocation({
    reads,
    mapNote,
    onLocation,
}: Readonly<{ reads: string; mapNote: string; onLocation: () => void }>): React.JSX.Element {
    return (
        <Stack gap={2}>
            <FieldRow>
                <Text size="xs">Location</Text>
                <Button size="compact-xs" variant="default" aria-label="Location" onClick={onLocation}>
                    {reads === "" ? "none" : reads}
                </Button>
            </FieldRow>
            {mapNote === "" ? null : (
                <Text size="xs" c="dimmed">
                    {mapNote}
                </Text>
            )}
        </Stack>
    );
}

/**
 * The layout form's "Shown nodes only" row: a layout over only the nodes the filter shows, laid
 * out again when the filter changes. A view preference, written on the element by the host.
 * @param props - Component props
 * @param props.row - Whether the form draws its settings as rows.
 * @returns The row
 */
function ShownOnlyRow({ row }: Readonly<{ row: boolean }>): React.JSX.Element {
    const { store } = useWorkspace();
    const checked = useWorkspaceState((state) => state.layoutShownOnly);
    const box = {
        checked,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            store.set({ layoutShownOnly: event.currentTarget.checked });
        },
    };
    return row ? (
        <OptionRow label={SHOWN_ONLY_WORDS.shownOnly}>
            <Checkbox size="xs" aria-label={SHOWN_ONLY_WORDS.shownOnly} {...box} />
        </OptionRow>
    ) : (
        <Checkbox size="xs" label={SHOWN_ONLY_WORDS.shownOnly} {...box} />
    );
}

/**
 * The form for one layout (the Layout popover's second level, and inline in the graph's
 * inspector): Shape, its key options, the Advanced fold with Seed and Reshuffle, the cost line
 * and Apply. Nothing runs while the reader edits; Apply (or Enter) lays the graph out, as one
 * undoable step of the element's, and a disabled "Applied" says the graph is drawn so already.
 * A refusal shows above the button and the form stays.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.descriptor - The layout
 * @param props.header - Drawn above the description
 * @param props.focusButton - Whether focus starts on the button
 * @param props.onApplied - Called once a layout has been applied
 * @param props.onKeyDown - The host's key handling
 * @param props.shapeChoice - Whether the form offers its own Shape
 * @returns The form
 */
export function LayoutForm({
    session,
    descriptor,
    header,
    focusButton = false,
    onApplied,
    onKeyDown,
    shapeChoice = true,
}: Readonly<LayoutFormProps>): React.JSX.Element {
    const { element, store } = useWorkspace();
    const current = session.layout;
    // The descriptor carries the engine its row applies: an engine row's, else the default.
    const isCurrent = isDrawn(session, descriptor);
    const [start] = useState(() => ({
        values: startingValues(session, descriptor),
        engine: engineOf(descriptor),
    }));
    const [values, setValues] = useState<Record<string, unknown>>(start.values);
    // Undefined: the catalog's default engine for the layout. Each engine has a row of its own.
    const { engine } = start;
    const [error, setError] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);
    // Focus starts on the button so Enter applies; on the first control when it is disabled
    // ("Applied"), so focus stays in the form and Esc still steps back.
    useEffect(() => {
        if (focusButton) {
            const form = formRef.current;
            const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]:not(:disabled)');
            (submit ?? form?.querySelector<HTMLElement>("button, input"))?.focus();
        }
    }, [focusButton]);

    // The map's form: its Shape picks the map, and it names the columns it reads (designated in
    // Data > Fields), the warnings about what they held, and the map it draws on.
    const isMap = descriptor.id === MAP_LAYOUT;
    const arranged = isCurrent ? current.arrangedDimension : undefined;
    const drawnShape = values.dim === start.values.dim ? arranged : undefined;
    const shape = isMap ? mapShapeOf(values) : shapeOf(values, drawnShape);
    const startShape = isMap ? mapShapeOf(start.values) : shapeOf(start.values, arranged);
    const showShape = shapeChoice && current.dimension === "3d" && descriptor.maxDimensions === 3;
    const { mapDrawn, reads, read } = mapLines({ session, element, values, isMap, isCurrent });
    const differs = layoutDiffers({ isCurrent, engine, descriptor, current, values, read, reads });
    const reason = unavailable(session, descriptor, values);
    const estimate = session.estimate({ op: "layout.set", id: descriptor.id, engine, options: values });

    const edit = (next: Record<string, unknown>): void => {
        setValues(next);
        setError(null);
    };
    const apply = (asked: Record<string, unknown>): void => {
        setError(null);
        session.layout
            .set(descriptor.id, engine === undefined ? { options: asked } : { engine, options: asked })
            .then(onApplied, (failure: unknown) => {
                setError(
                    layoutErrorWords(failure) ??
                        `${layoutName(descriptor)} could not lay out this graph, so the drawing is unchanged`,
                );
            });
    };
    // A new map is drawn under nodes that stay where they are, so on the applied map with nothing
    // else edited it applies at once, and the form stays open.
    const pickMap = (map: BasemapConfig): void => {
        const next = { ...values, map };
        if (isCurrent && !differs) {
            setValues(next);
            setError(null);
            session.layout.set(descriptor.id, { options: next }).catch(() => {
                setError(`${layoutName(descriptor)} could not draw this map`);
            });
            return;
        }
        edit(next);
    };
    const pickShape = (picked: "2d" | "3d"): void => {
        edit(shapePicked(picked, picked === startShape ? start.values : null, values, isMap));
    };

    // One note under Location: what the columns held.
    const mapNote = (mapDrawn?.mapFrame?.warnings ?? [])
        .flatMap((w) => locationFieldWords(w.code, w.params) ?? [])
        .join("; ");
    const words = (option: OptionDescriptor): ReturnType<typeof optionWords> => optionWords(descriptor.id, option);

    const takesSeed = descriptor.options.some((o) => o.name === "seed");
    const row = selectionWorkspaceOn(session);
    const seed = takesSeed ? (
        <SeedField
            row={row}
            values={values}
            edit={edit}
            onReshuffle={() => {
                const next = { ...values, seed: randomSeed() };
                setValues(next);
                apply(next);
            }}
        />
    ) : undefined;

    return (
        <form // NOSONAR(S6847): catches Esc bubbling from the form's own controls for the host
            aria-label={layoutName(descriptor)}
            ref={formRef}
            onKeyDown={onKeyDown}
            onSubmit={(event) => {
                event.preventDefault();
                if (differs && reason === null) {
                    apply(values);
                }
            }}
        >
            <Stack gap={row ? 4 : 8} className={row ? "ws-options-rows" : undefined}>
                {header}
                {descriptor.description === "" || row ? null : (
                    <Text size="xs" c="dimmed">
                        {descriptor.description}
                    </Text>
                )}
                {showShape ? <ShapeField id={descriptor.id} shape={shape} onPick={pickShape} row={row} /> : null}
                {current.dimension === "3d" && descriptor.maxDimensions === 2 ? (
                    <Text size="xs" c="dimmed">
                        Draws flat
                    </Text>
                ) : null}
                {isMap ? (
                    <MapLocation
                        reads={reads}
                        mapNote={mapNote}
                        onLocation={() => {
                            store.set({ page: "panels", place: "data" });
                        }}
                    />
                ) : null}
                <OptionsForm
                    session={session}
                    // Shape is the dim control; Seed is drawn with Reshuffle below.
                    options={descriptor.options
                        // The map has fields of its own: its location columns above, its map below.
                        .filter(
                            (o) =>
                                o.name !== "dim" &&
                                o.name !== "seed" &&
                                o.name !== "map" &&
                                !(isMap && MAP_UNDRAWN_OPTIONS.has(o.name)),
                        )}
                    values={values}
                    words={words}
                    canUseSelectedNode
                    onChange={(name, value) => {
                        edit({ ...values, [name]: value });
                    }}
                    after={seed}
                    choiceNote={(_option, refusal) => columnFitWords(refusal) ?? ""}
                />
                <ShownOnlyRow row={row} />
                <TransitionRow session={session} />
                {isMap ? (
                    <MapSourceFields value={values.map as BasemapConfig | null | undefined} onChange={pickMap} />
                ) : null}
                {error === null ? null : (
                    <Text size="xs" c="var(--cm-text-danger)" role="alert">
                        {error}
                    </Text>
                )}
                <ApplyRow reason={reason} seconds={estimate.seconds} differs={differs} />
            </Stack>
        </form>
    );
}
