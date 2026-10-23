import {
    DataRow,
    FieldRow,
    PanelField,
    PanelLabelsProvider,
    ResetButton,
    SegmentedControl,
} from "@graphty/compact-mantine";
import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { LayoutDescriptor, OptionDescriptor } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Button, Group, Stack, Text } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { costLine, optionWords } from "../analyze/words";
import { MAP_SOURCE_FIELD_ID, mapSourceName } from "../inspector/mapSource";
import { OptionsForm } from "../options/OptionsForm";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace } from "../state/WorkspaceContext";
import { LAYOUT_SEED, layoutName, randomSeed, startingValues, unavailable } from "./methods";
import { columnFitWords, layoutErrorWords, locationFieldWords, optionEffectWords } from "./refusalWords";

/** The location map's id, whose form names the columns it read and the map it draws on. */
const MAP_LAYOUT = "location-map";

/** The map's Latitude and Longitude share one row, as X and Y do; Location stands apart. */
const MAP_ROWS = [["latitude", "longitude"]] as const;

/**
 * The column the map read for a location option it was left to find itself, from the element's
 * frame of the map it drew, or undefined when it has not drawn one.
 * @param element - the element.
 * @param option - the option.
 * @returns the column's name, or undefined.
 */
function columnUsed(element: GraphtyElement | null, option: string): string | undefined {
    const location = element?.mapFrame?.location;
    if (location === undefined) {
        return undefined;
    }
    if (location.kind === "location") {
        return option === "location" ? location.column : undefined;
    }
    if (option === "latitude") {
        return location.latitude;
    }
    return option === "longitude" ? location.longitude : undefined;
}

/**
 * Opens Graph settings on its Style tab and moves focus to the Map section's Source select, once
 * it is drawn.
 * @param store - the chrome store.
 */
function openMapSource(store: WorkspaceStore): void {
    store.set({ inspected: { kind: "graph", tab: "style" } });
    let frames = 0;
    const focus = (): void => {
        const field = document.getElementById(MAP_SOURCE_FIELD_ID);
        if (field !== null) {
            field.focus();
        } else if (frames++ < 30) {
            requestAnimationFrame(focus);
        }
    };
    requestAnimationFrame(focus);
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
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].every((key) => Object.is(a[key], b[key]));
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
    const isCurrent = descriptor.id === current.id;
    const [start] = useState(() => ({
        values: startingValues(session, descriptor),
        engine: isCurrent ? current.engine : undefined,
    }));
    const [values, setValues] = useState<Record<string, unknown>>(start.values);
    // Undefined: the catalog's default engine for the layout.
    const [engine, setEngine] = useState<string | undefined>(start.engine);
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

    const ownEngine = isCurrent && engine === start.engine;
    const shape = shapeOf(values, ownEngine && values.dim === start.values.dim ? current.arrangedDimension : undefined);
    const startShape = shapeOf(start.values, isCurrent ? current.arrangedDimension : undefined);
    const showShape = shapeChoice && current.dimension === "3d" && descriptor.maxDimensions === 3;

    const differs =
        !isCurrent || (engine ?? descriptor.engine) !== current.engine || !sameValues(values, current.options);
    const reason = unavailable(session, descriptor, values);
    const estimate = session.estimate({ op: "layout.set", id: descriptor.id, engine, options: values });

    const edit = (next: Record<string, unknown>): void => {
        setValues(next);
        setError(null);
    };
    const apply = (options: Record<string, unknown>): void => {
        setError(null);
        session.layout
            .set(descriptor.id, engine === undefined ? { options } : { engine, options })
            .then(onApplied, (failure: unknown) => {
                setError(
                    layoutErrorWords(failure) ??
                        `${layoutName(descriptor)} could not lay out this graph, so the drawing is unchanged`,
                );
            });
    };
    const pickShape = (picked: "2d" | "3d"): void => {
        if (picked === startShape) {
            // Back to what is drawn: its own dim (or none) and engine.
            const { dim: _dim, ...rest } = values;
            edit(start.values.dim === undefined ? rest : { ...rest, dim: start.values.dim });
            setEngine(start.engine);
            return;
        }
        edit({ ...values, dim: picked === "2d" ? 2 : 3 });
        // A flat-only engine cannot draw 3D: the layout's default engine does.
        if (picked === "3d") {
            setEngine(undefined);
        }
    };

    // The map's form: which columns "Automatic" used, the warnings about what they held, Surface
    // off in 2D, and a row naming the map it draws on.
    const isMap = descriptor.id === MAP_LAYOUT;
    const mapDrawn = isMap && isCurrent ? element : null;
    const warnings = mapDrawn?.mapFrame?.warnings ?? [];
    // One note, under the field the locations were read from: Location, or Latitude for a pair.
    const notedField = mapDrawn?.mapFrame?.location.kind === "location" ? "location" : "latitude";
    const fieldNote = (option: OptionDescriptor): string | null => {
        if (option.name !== notedField) {
            return null;
        }
        const lines = warnings.flatMap((w) => locationFieldWords(w.code, w.params) ?? []);
        return lines.length === 0 ? null : lines.join("; ");
    };
    const words = (option: OptionDescriptor): ReturnType<typeof optionWords> => {
        const base = optionWords(descriptor.id, option);
        const used = isMap ? columnUsed(mapDrawn, option.name) : undefined;
        return used === undefined || base.empty === undefined ? base : { ...base, empty: `${base.empty} (${used})` };
    };
    // The view the layout would be drawn in: the 2D view draws every layout flat.
    const drawnIn = current.dimension === "2d" ? "2d" : shape;
    const disabledReason = (option: OptionDescriptor): string | null =>
        optionEffectWords(session.layout.optionInEffect(descriptor.id, option.name, drawnIn).code);

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
                <OptionsForm
                    session={session}
                    // Shape is the dim control; Seed is drawn with Reshuffle below.
                    options={descriptor.options.filter((o) => o.name !== "dim" && o.name !== "seed")}
                    values={values}
                    words={words}
                    canUseSelectedNode
                    onChange={(name, value) => {
                        edit({ ...values, [name]: value });
                    }}
                    advanced={seed}
                    note={fieldNote}
                    disabledReason={disabledReason}
                    choiceNote={(_option, refusal) => columnFitWords(refusal) ?? ""}
                    rows={isMap ? MAP_ROWS : undefined}
                />
                {isMap && session.config.inEffect("basemap").inEffect ? (
                    // The map is a graph setting, chosen in Graph settings: this row names it and goes there.
                    <DataRow
                        stat
                        name="Map"
                        value={mapSourceName(session.config.basemap)}
                        onClick={() => {
                            openMapSource(store);
                        }}
                    />
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
