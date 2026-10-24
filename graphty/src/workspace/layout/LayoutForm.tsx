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
import { LAYOUT_SEED, layoutName, randomSeed, startingValues, unavailable } from "./methods";
import { columnFitWords, layoutErrorWords, locationFieldWords, optionEffectWords } from "./refusalWords";

/** The location map's id, whose form names the columns it read and picks the map it draws on. */
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
 * How a layout's options are offered in the view it would be drawn in.
 * @param session - The element's session.
 * @param descriptor - The layout.
 * @param drawnIn - The view the layout would be drawn in.
 * @returns `drawnOnly`: the one value the view draws for an option it does not draw as asked
 *     (the map's Map type in 2D), else undefined; `defaultOnly`: whether an option is so; and
 *     `inView`: a set of values as the view draws them.
 */
function viewChoices(
    session: GraphSession,
    descriptor: LayoutDescriptor,
    drawnIn: "2d" | "3d",
): {
    drawnOnly: (option: OptionDescriptor) => unknown;
    defaultOnly: (option: OptionDescriptor) => boolean;
    inView: (asked: Record<string, unknown>) => Record<string, unknown>;
} {
    // An option the 2D view does not draw (the map's Map type) offers only the value the view
    // draws instead, as the element names it, else its default.
    const drawnOnly = (option: OptionDescriptor): unknown => {
        const effect = session.layout.optionInEffect(descriptor.id, option.name, drawnIn);
        if (typeof option.default !== "string" || effect.code !== "setting.notIn2d") {
            return undefined;
        }
        return effect.params.drawn ?? option.default;
    };
    const defaultOnly = (option: OptionDescriptor): boolean => drawnOnly(option) !== undefined;
    // Shown as the value the view draws; the reader's own choice is kept for the 3D view.
    const inView = (asked: Record<string, unknown>): Record<string, unknown> => {
        const shown = { ...asked };
        for (const option of descriptor.options) {
            const drawn = drawnOnly(option);
            if (drawn !== undefined) {
                shown[option.name] = drawn;
            }
        }
        return shown;
    };
    return { drawnOnly, defaultOnly, inView };
}

/**
 * The map form's words: which column "Automatic" used, and the warnings about what the columns
 * held, as one note under the field the locations were read from (Location, or Latitude for a pair).
 * @param descriptor - The layout.
 * @param isMap - Whether the layout is the map.
 * @param mapDrawn - The element, when the map is the layout drawn.
 * @returns The field note and the option words.
 */
function mapFieldWords(
    descriptor: LayoutDescriptor,
    isMap: boolean,
    mapDrawn: GraphtyElement | null,
): {
    fieldNote: (option: OptionDescriptor) => string | null;
    words: (option: OptionDescriptor) => ReturnType<typeof optionWords>;
} {
    const warnings = mapDrawn?.mapFrame?.warnings ?? [];
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
    return { fieldNote, words };
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
    const { element } = useWorkspace();
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

    // The view the layout would be drawn in: the 2D view draws every layout flat.
    const drawnIn = current.dimension === "2d" ? "2d" : shape;
    const { drawnOnly, defaultOnly, inView } = viewChoices(session, descriptor, drawnIn);

    const edit = (next: Record<string, unknown>): void => {
        setValues(next);
        setError(null);
    };
    const apply = (asked: Record<string, unknown>): void => {
        setError(null);
        // The reader's own values: one the 2D view does not draw is kept for the 3D view.
        const options = asked;
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
            session.layout.set(descriptor.id, { options: next }).catch(() => {
                setError(`${layoutName(descriptor)} could not draw this map`);
            });
            return;
        }
        edit(next);
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

    // The map's form: which columns "Automatic" used, the warnings about what they held, Map type
    // offering only the 2D map in 2D, and the map it draws on.
    const isMap = descriptor.id === MAP_LAYOUT;
    const { fieldNote, words } = mapFieldWords(descriptor, isMap, isMap && isCurrent ? element : null);
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
                <OptionsForm
                    session={session}
                    // Shape is the dim control; Seed is drawn with Reshuffle below.
                    options={descriptor.options
                        // The map has fields of its own, below.
                        .filter((o) => o.name !== "dim" && o.name !== "seed" && o.name !== "map")
                        .map((o) =>
                            defaultOnly(o) ? { ...o, values: o.values?.filter((v) => v.value === drawnOnly(o)) } : o,
                        )}
                    values={inView(values)}
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
