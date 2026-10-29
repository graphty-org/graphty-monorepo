import { FieldRow, PanelField, PanelLabelsProvider, ResetButton, SegmentedControl } from "@graphty/compact-mantine";
import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { LayoutDescriptor, OptionDescriptor } from "@graphty/graphty-element/catalog";
import type { BasemapConfig } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Button, Group, Stack, Text } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { costLine, optionWords } from "../analyze/words";
import { OptionsForm } from "../options/OptionsForm";
import { useWorkspace } from "../state/WorkspaceContext";
import { MapSourceFields } from "./MapSourceFields";
import { engineOf, isDrawn, LAYOUT_SEED, layoutName, randomSeed, startingValues, unavailable } from "./methods";
import { columnFitWords, layoutErrorWords, locationFieldWords, optionEffectWords } from "./refusalWords";
import { TransitionRow } from "./TransitionRow";

/** The location map's id, whose form names the columns it read and picks the map it draws on. */
const MAP_LAYOUT = "location-map";

/** The map's options that name its location columns: Data > Fields designates them instead. */
const LOCATION_OPTIONS: ReadonlySet<string> = new Set(["location", "latitude", "longitude"]);

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
     * its View is the one 3D | 2D control there.
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

    const shape = shapeOf(values, isCurrent && values.dim === start.values.dim ? current.arrangedDimension : undefined);
    const startShape = shapeOf(start.values, isCurrent ? current.arrangedDimension : undefined);
    const showShape = shapeChoice && current.dimension === "3d" && descriptor.maxDimensions === 3;

    // The map's form: the columns it reads (designated in Data > Fields), the warnings about what
    // they held, Surface offering only the flat map in 2D, and the map it draws on.
    const isMap = descriptor.id === MAP_LAYOUT;
    const mapDrawn = isMap && isCurrent ? element : null;
    const reads = isMap ? locationLine(session, values) : "";
    const read = drawnLine(mapDrawn);
    const differs =
        !isCurrent ||
        (engine ?? descriptor.engine) !== current.engine ||
        !sameValues(values, current.options) ||
        // Another location designated since the map was drawn: Apply reads it.
        (read !== undefined && read !== reads);
    const reason = unavailable(session, descriptor, values);
    const estimate = session.estimate({ op: "layout.set", id: descriptor.id, engine, options: values });

    // The view the layout would be drawn in: the 2D view draws every layout flat.
    const drawnIn = current.dimension === "2d" ? "2d" : shape;
    // An option the 2D view does not draw (the map's Surface) offers only its default there.
    const defaultOnly = (option: OptionDescriptor): boolean =>
        typeof option.default === "string" &&
        session.layout.optionInEffect(descriptor.id, option.name, drawnIn).code === "setting.notIn2d";
    const inView = (asked: Record<string, unknown>): Record<string, unknown> => {
        const shown = { ...asked };
        for (const option of descriptor.options) {
            if (shown[option.name] !== undefined && defaultOnly(option)) {
                shown[option.name] = option.default;
            }
        }
        return shown;
    };

    const edit = (next: Record<string, unknown>): void => {
        setValues(next);
        setError(null);
    };
    const apply = (asked: Record<string, unknown>): void => {
        setError(null);
        const options = inView(asked);
        session.layout
            .set(descriptor.id, engine === undefined ? { options } : { engine, options })
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
            session.layout.set(descriptor.id, { options: inView(next) }).catch(() => {
                setError(`${layoutName(descriptor)} could not draw this map`);
            });
            return;
        }
        edit(next);
    };
    const pickShape = (picked: "2d" | "3d"): void => {
        if (picked === startShape) {
            // Back to what is drawn: its own dim (or none).
            const { dim: _dim, ...rest } = values;
            edit(start.values.dim === undefined ? rest : { ...rest, dim: start.values.dim });
            return;
        }
        edit({ ...values, dim: picked === "2d" ? 2 : 3 });
    };

    // One note under Location: what the columns held.
    const mapNote = (mapDrawn?.mapFrame?.warnings ?? [])
        .flatMap((w) => locationFieldWords(w.code, w.params) ?? [])
        .join("; ");
    const words = (option: OptionDescriptor): ReturnType<typeof optionWords> => optionWords(descriptor.id, option);
    const disabledReason = (option: OptionDescriptor): string | null =>
        defaultOnly(option)
            ? null
            : optionEffectWords(session.layout.optionInEffect(descriptor.id, option.name, drawnIn).code);

    const takesSeed = descriptor.options.some((o) => o.name === "seed");
    const seed = takesSeed ? (
        <Group gap={8} wrap="nowrap" align="flex-end">
            <div style={{ flex: 1, minWidth: 0 }}>
                <PanelLabelsProvider showLabels>
                    <FieldRow
                        trailing={
                            typeof values.seed === "number" && (
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
                            value={typeof values.seed === "number" ? values.seed : LAYOUT_SEED}
                            step={1}
                            decimalScale={0}
                            onChange={(next) => {
                                edit({ ...values, seed: Number(next) });
                            }}
                        />
                    </FieldRow>
                </PanelLabelsProvider>
            </div>
            <Button
                size="compact-xs"
                variant="default"
                onClick={() => {
                    const next = { ...values, seed: randomSeed() };
                    setValues(next);
                    apply(next);
                }}
            >
                Reshuffle
            </Button>
        </Group>
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
            <Stack gap={8}>
                {header}
                {descriptor.description === "" ? null : (
                    <Text size="xs" c="dimmed">
                        {descriptor.description}
                    </Text>
                )}
                {showShape ? (
                    <Stack gap={2}>
                        <Text size="xs" id={`layout-shape-${descriptor.id}`}>
                            Shape
                        </Text>
                        <SegmentedControl
                            aria-labelledby={`layout-shape-${descriptor.id}`}
                            fullWidth
                            value={shape}
                            data={[
                                { value: "3d", label: "3D" },
                                { value: "2d", label: "2D" },
                            ]}
                            onChange={(picked) => {
                                pickShape(picked === "2d" ? "2d" : "3d");
                            }}
                        />
                    </Stack>
                ) : null}
                {current.dimension === "3d" && descriptor.maxDimensions === 2 ? (
                    <Text size="xs" c="dimmed">
                        Draws flat
                    </Text>
                ) : null}
                {isMap ? (
                    <Stack gap={2}>
                        <FieldRow>
                            <Text size="xs">Location</Text>
                            <Button
                                size="compact-xs"
                                variant="default"
                                aria-label="Location"
                                onClick={() => {
                                    store.set({ page: "panels", place: "data" });
                                }}
                            >
                                {reads === "" ? "none" : reads}
                            </Button>
                        </FieldRow>
                        {mapNote === "" ? null : (
                            <Text size="xs" c="dimmed">
                                {mapNote}
                            </Text>
                        )}
                    </Stack>
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
                                !(isMap && LOCATION_OPTIONS.has(o.name)),
                        )
                        .map((o) =>
                            defaultOnly(o) ? { ...o, values: o.values?.filter((v) => v.value === o.default) } : o,
                        )}
                    values={inView(values)}
                    words={words}
                    canUseSelectedNode
                    onChange={(name, value) => {
                        edit({ ...values, [name]: value });
                    }}
                    advanced={seed}
                    disabledReason={disabledReason}
                    choiceNote={(_option, refusal) => columnFitWords(refusal) ?? ""}
                />
                <TransitionRow session={session} />
                {isMap ? (
                    <MapSourceFields value={values.map as BasemapConfig | null | undefined} onChange={pickMap} />
                ) : null}
                {error === null ? null : (
                    <Text size="xs" c="red" role="alert">
                        {error}
                    </Text>
                )}
                <Group justify="space-between" wrap="nowrap">
                    <Text size="xs" c={reason === null ? "dimmed" : "red"}>
                        {reason ?? costLine(estimate.seconds)}
                    </Text>
                    <Button size="xs" type="submit" disabled={!differs || reason !== null}>
                        {differs ? "Apply" : "Applied"}
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}
