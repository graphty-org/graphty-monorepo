import "./style.css";

import { ComboInput, CompactColorInput, FieldRow } from "@graphty/compact-mantine";
import { channelsFor, toColorValue } from "@graphty/graphty-element/catalog";
import { type Channel, DEFAULT_SELECTION_STYLE, type LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { Group, Stack, Text } from "@mantine/core";
import React, { useEffect, useId, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { discardDraft, draftAnchor } from "../graph-place/actions";
import { findTreeRow, isHidden, isLocked, rowLayers as treeRowLayers } from "../graph-place/rows";
import { useAsyncValue } from "../inspector/hooks";
import type { DraftPaints } from "../inspector/inspected";
import { edgeName } from "../inspector/words";
import { isPanelEscape } from "../keys/keys";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { LabelSection } from "./LabelSection";
import type { RowContext } from "./PropertyRow";
import {
    beneathOf,
    colorBlockOf,
    EVERYTHING_LAYER,
    everythingRow,
    type NewLayer,
    paintedOverOf,
    rowLayers,
    runColorOf,
    selectionLayer,
    selectionRow,
    startingEverything,
    type Target,
    writeGroupColor,
} from "./row";
import { Section } from "./Section";
import { focusLineNext, useFocusLine } from "./useFocusLine";
import { useStyleVersion } from "./useStyleVersion";
import { RuleEditor, WhichElements } from "./WhichElements";
import {
    BLANK_FORM,
    DRAFT_NAME,
    draftCount,
    fieldsOf,
    type Form,
    formOf,
    ruleName,
    selectorOf,
    sentenceOf,
} from "./whichRule";
import { SECTIONS } from "./words";

/**
 * The row the Style tab edits when the caller names none, read from `inspected` as the inspector
 * writes it (`{ kind, id }`): the Everything row while nothing is inspected or the Everything row
 * is; a run's row (measure or run) is the run's layers, its id being the run id; a reader's own
 * layer row is that layer. Anything else (a group, an element, the selection) has no row here, so
 * an edit never lands on a row the reader is not looking at.
 * @param session - the element's session.
 * @param inspected - what is inspected, if anything.
 * @returns the row's layer ids, or null when the inspected thing has no layers to edit.
 */
function defaultRow(
    session: GraphSession,
    inspected: { readonly kind: string; readonly id?: string } | null | undefined,
): readonly LayerId[] | null {
    const id = inspected?.id;
    switch (inspected?.kind) {
        case undefined:
        case "everything-row": {
            // The starting Everything row holds the base look when the project has one.
            const starting = startingEverything(session);
            return starting === undefined ? everythingRow(session) : treeRowLayers(session, starting);
        }
        case "measure-row":
        case "run-row": {
            // A run that has painted nothing yet (queued, failed, styled off) has no row to edit.
            const layers = id === undefined ? [] : session.runs.bindings(id);
            return layers.length === 0 ? null : layers;
        }
        case "layer-row":
            return id !== undefined && session.styles.get(id) !== undefined ? [id] : null;
        default:
            return null;
    }
}

/**
 * Every color the document's layers set, for the color picker's swatches.
 * @param session - the element's session.
 * @returns the colors as hex, each once.
 */
function documentColors(session: GraphSession): string[] {
    const colors = new Set<string>();
    for (const layer of session.styles.list()) {
        for (const [channel, value] of Object.entries(layer.set ?? {})) {
            const descriptor = channelsFor(layer.target).find((d) => d.channel === channel);
            if (descriptor?.accepts === "color" && (typeof value === "string" || typeof value === "object")) {
                const color = toColorValue(value as Parameters<typeof toColorValue>[0]);
                if (color !== null) {
                    colors.add(color.hex.toUpperCase());
                }
            }
        }
    }
    return [...colors];
}

/** Props for StylePanel. */
interface StylePanelProps {
    /** The row's style layers (one per kind it paints). Left out, the row is the inspected row's. */
    layers?: readonly LayerId[];
    /** The style tree row it is, which draws the panel's header and reads what lies beneath it. */
    rowId?: string;
}

/**
 * The Style tab (the owner's style panel design, 2026-10-13): for a tree row, Which elements; then
 * a Nodes group and an Edges group, each only when the row paints that kind, each with its fixed
 * sections. A section lists only the properties the layer sets, and its "+" adds the rest; nothing
 * the layer does not set is drawn as a value. Generated from graphty-element's channel descriptors
 * (`channelsFor`), never typed.
 * @param props - Component props
 * @param props.layers - the row's style layers
 * @param props.rowId - the style tree row, when the panel is a tree row's
 * @returns The tab, or nothing before the element has come up
 */
export function StylePanel({ layers, rowId }: Readonly<StylePanelProps>): React.JSX.Element | null {
    const { session, element } = useWorkspace();
    useStyleVersion(session, element);
    const inspected = useWorkspaceState((state) => state.inspected);
    if (session === null) {
        return null;
    }
    if (rowId !== undefined) {
        return <TreeRowPanel session={session} rowId={rowId} />;
    }
    const row = layers ?? defaultRow(session, inspected);
    if (row === null) {
        return null;
    }
    // Only the Everything row adds a layer of its own; a run's or a layer's row writes to its own.
    const everything =
        layers === undefined &&
        (inspected?.kind ?? "everything-row") === "everything-row" &&
        startingEverything(session) === undefined;
    // Keyed by the row, so an empty label line is dropped when the row changes.
    return (
        <RowStyle key={row.join(" ")} session={session} row={row} fresh={everything ? EVERYTHING_LAYER : undefined} />
    );
}

/**
 * A style tree row's panel: a line while it is locked or hidden, and its Style tab, disabled while
 * it or a folder holding it is locked. The inspector's header names the row and carries its menu.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rowId - the row
 * @returns The panel
 */
function TreeRowPanel({ session, rowId }: Readonly<{ session: GraphSession; rowId: string }>): React.JSX.Element {
    const found = findTreeRow(session.styles.tree(), rowId);
    if (found === undefined) {
        return <StateLine>This row is gone</StateLine>;
    }
    const row = treeRowLayers(session, rowId);
    // Every layer says which elements it paints, whoever made it: provenance never changes what a
    // layer offers. Keyed by the row, not its layers, so a change of kind keeps the editor open.
    return (
        <>
            {isHidden(found) && (
                <StateLine icon={<GLYPHS.hide size={14} aria-hidden />}>
                    Hidden: changes will not show until it is shown
                </StateLine>
            )}
            <LockedGroup locked={isLocked(found)}>
                <RowStyle
                    key={rowId}
                    session={session}
                    row={row}
                    below={rowId}
                    head={row.length > 0 ? <WhichElements session={session} layer={rowId} /> : undefined}
                />
            </LockedGroup>
        </>
    );
}

/** The controls a locked row keeps focusable and marks as doing nothing. */
const CONTROLS = "input, textarea, button, [role=combobox], [role=switch], [role=radio], [role=checkbox]";

/** The keys a locked row lets through: moving focus, and closing what is open. */
const PASSING_KEYS = new Set(["Tab", "Shift", "Escape"]);

/**
 * A row's controls while it is locked: still in the Tab order, each `aria-disabled` with the
 * reason as its description, and every press, click and typed key stopped before it reaches them.
 * A native disabled fieldset took them out of the Tab order, so a keyboard skipped the panel.
 * @param props - Component props
 * @param props.locked - whether the row is locked
 * @param props.children - the row's Style tab
 * @returns The group
 */
function LockedGroup({
    locked,
    children,
}: Readonly<{ locked: boolean; children: React.ReactNode }>): React.JSX.Element {
    const box = useRef<HTMLDivElement>(null);
    const reasonId = useId();
    useEffect(() => {
        const root = box.current;
        if (!locked || root === null) {
            return undefined;
        }
        const tokens = (control: Element): string[] =>
            (control.getAttribute("aria-describedby") ?? "").split(" ").filter((id) => id !== "");
        // Idempotent, so it can run again whenever a control is drawn or a library rewrites its
        // description (a tooltip does).
        const mark = (): void => {
            for (const control of root.querySelectorAll<HTMLElement>(CONTROLS)) {
                if (control.getAttribute("aria-disabled") !== "true") {
                    control.setAttribute("aria-disabled", "true");
                    control.dataset.wsLocked = "";
                }
                const ids = tokens(control);
                if (!ids.includes(reasonId)) {
                    control.setAttribute("aria-describedby", [...ids, reasonId].join(" "));
                }
                if (
                    (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) &&
                    !control.readOnly
                ) {
                    control.readOnly = true;
                    control.dataset.wsLockedReadOnly = "";
                }
            }
        };
        mark();
        const observer = new MutationObserver(mark);
        observer.observe(root, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["aria-describedby", "aria-disabled"],
        });
        return () => {
            observer.disconnect();
            for (const control of root.querySelectorAll<HTMLElement>(CONTROLS)) {
                const ids = tokens(control).filter((id) => id !== reasonId);
                if (ids.length === 0) {
                    control.removeAttribute("aria-describedby");
                } else {
                    control.setAttribute("aria-describedby", ids.join(" "));
                }
                if (control.dataset.wsLocked !== undefined) {
                    control.removeAttribute("aria-disabled");
                    delete control.dataset.wsLocked;
                }
                if (control.dataset.wsLockedReadOnly !== undefined) {
                    (control as HTMLInputElement).readOnly = false;
                    delete control.dataset.wsLockedReadOnly;
                }
            }
        };
    }, [locked, reasonId]);
    const stop = (event: React.SyntheticEvent): void => {
        if (locked) {
            event.preventDefault();
            event.stopPropagation();
        }
    };
    return (
        <>
            {locked && (
                <StateLine icon={<GLYPHS.lock size={14} aria-hidden />} id={reasonId}>
                    This layer is locked
                </StateLine>
            )}
            <div
                ref={box}
                className={locked ? "ws-row-locked" : undefined}
                onPointerDownCapture={stop}
                onMouseDownCapture={stop}
                onClickCapture={stop}
                onBeforeInputCapture={stop}
                onPasteCapture={stop}
                onDropCapture={stop}
                onKeyDownCapture={(event) => {
                    if (!PASSING_KEYS.has(event.key)) {
                        stop(event);
                    }
                }}
            >
                {children}
            </div>
        </>
    );
}

/**
 * A line at the top of a panel saying the state of what it shows, at the panel's text size.
 * @param props - Component props
 * @param props.children - the words
 * @param props.icon - a glyph before the words (a lock, a closed eye)
 * @param props.id - an id, for controls the line describes
 * @returns The line
 */
export function StateLine({
    children,
    icon,
    id,
}: Readonly<{ children: React.ReactNode; icon?: React.ReactNode; id?: string }>): React.JSX.Element {
    return (
        <Group gap={6} px="md" py={4} wrap="nowrap" id={id}>
            {icon}
            <Text size="sm">{children}</Text>
        </Group>
    );
}

/**
 * One row's Style tab: a group per kind the row paints, Nodes then Edges, each heading sticking to
 * the top of the panel while it scrolls (tier3 design, decisions 1.3 and 1.4).
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.row - the row's layers
 * @param props.sides - the kinds the row may paint; a row that adds no layer shows only the kinds
 *   it has a layer on
 * @param props.fresh - the layer the row's first edit adds; left out, the row adds none
 * @param props.below - the tree row whose beneath "+" starts a property from
 * @param props.head - what the tab shows above the groups (a layer's Which elements)
 * @param props.many - for several rows edited together, per kind: what they share and how a
 *   write reaches each
 * @returns The tab
 */
export function RowStyle({
    session,
    row,
    sides: offered = ["node", "edge"],
    fresh,
    below,
    head,
    many,
}: Readonly<{
    session: GraphSession;
    row: readonly LayerId[];
    sides?: readonly Target[];
    fresh?: NewLayer;
    below?: string;
    head?: React.ReactNode;
    many?: (side: Target) => Pick<RowContext, "many" | "beneath">;
}>): React.JSX.Element {
    const scope = useFocusLine<HTMLDivElement>();
    const sides = offered.filter((t) => fresh !== undefined || rowLayers(session, row, t).length > 0);
    // Beneath the row, over its own elements: its tree row, else its lowest layer's, else (a row
    // not written yet) the stack as it is.
    const lowest = session.styles.list().find((layer) => row.includes(layer.id));
    const treeRow = below ?? (lowest === undefined ? undefined : (lowest.row ?? lowest.id));
    const beneath = beneathOf(session, treeRow);
    const paintedOver = treeRow === undefined || many !== undefined ? undefined : paintedOverOf(session, treeRow, row);
    const colors = documentColors(session);
    return (
        <Stack ref={scope} gap={0} data-testid="style-tab" className="ws-style-panel">
            {head === undefined ? null : <div className="ws-style-panel-which">{head}</div>}
            {sides.map((side) => {
                const ctx: RowContext = {
                    session,
                    row,
                    side,
                    layers: rowLayers(session, row, side),
                    fresh,
                    beneath,
                    paintedOver,
                    documentColors: colors,
                    ...many?.(side),
                };
                const title = side === "node" ? "Nodes" : "Edges";
                return (
                    <section key={side} className="ws-style-group" data-group={side} aria-label={title}>
                        <h3 className="ws-style-group-title">{title}</h3>
                        {SECTIONS[side].map((spec) =>
                            spec.id === "text" ? (
                                <LabelSection key={spec.id} ctx={ctx} />
                            ) : (
                                <Section key={spec.id} ctx={ctx} spec={spec} />
                            ),
                        )}
                    </section>
                );
            })}
        </Stack>
    );
}

/**
 * The name of the selection's own row: the rule that selected it (its text without the "="), a
 * node's label, an edge's ends, or how many are selected.
 * @param session - the element's session.
 * @returns the name.
 */
function selectionName(session: GraphSession): string {
    const { nodes, edges, origin } = session.selection;
    if (origin !== null && "text" in origin && origin.text.startsWith("=")) {
        return origin.text.slice(1).trim();
    }
    // A node is named by its id until graphty-element publishes its name (#895), as the header does.
    if (nodes.length === 1 && edges.length === 0) {
        return String(nodes[0]);
    }
    const edge = edges.length === 1 && nodes.length === 0 ? session.data.edge(edges[0]) : undefined;
    if (edge !== undefined) {
        return edgeName(session, edge);
    }
    const count = (n: number, word: string): string[] => (n === 0 ? [] : [`${String(n)} ${word}${n === 1 ? "" : "s"}`]);
    return [...count(nodes.length, "node"), ...count(edges.length, "edge")].join(", ");
}

/**
 * The Style tab of a node, an edge or several selected: the selection's own row, a reader layer
 * whose selector names exactly what is selected. The first edit adds it above the topmost row,
 * named after the selection, and selects it, so later edits land on it.
 * @returns The tab, or nothing before the element has come up
 */
export function SelectionRowStyle(): React.JSX.Element | null {
    const { session, element } = useWorkspace();
    useStyleVersion(session, element);
    if (session === null) {
        return null;
    }
    const { nodes, edges } = session.selection;
    // Keyed by what is selected, so whether the row already existed is read afresh per selection.
    return <SelectionRow key={JSON.stringify([nodes, edges])} session={session} />;
}

/**
 * The selection's row, once the element has come up.
 * @param props - Component props
 * @param props.session - the element's session
 * @returns The tab
 */
function SelectionRow({ session }: Readonly<{ session: GraphSession }>): React.JSX.Element {
    const { store } = useWorkspace();
    const row = selectionRow(session);
    const [had] = useState(row.length > 0);
    const added = had ? undefined : row.at(-1);
    useEffect(() => {
        if (added !== undefined) {
            store.set({ inspected: { kind: "layer-row", id: added } });
        }
    }, [added, store]);
    const { nodes, edges } = session.selection;
    const sides: Target[] = [
        ...(nodes.length > 0 ? ["node" as const] : []),
        ...(edges.length > 0 ? ["edge" as const] : []),
    ];
    return (
        <RowStyle
            key={row.join(" ")}
            session={session}
            row={row}
            sides={sides}
            fresh={selectionLayer(session, selectionName(session))}
        />
    );
}

/** The element's selection highlight, as `session.config.selectionStyle` reads. */
type Highlight = GraphSession["config"]["selectionStyle"];

/**
 * The two parts of the highlight: the halo a selected node is drawn with and the band a selected
 * edge is drawn with, each its own color, opacity and size in the element's `selectionStyle`.
 */
const HIGHLIGHT_PARTS = [
    { title: "Nodes", color: "color", opacity: "opacity", scale: "scale" },
    { title: "Edges", color: "edgeColor", opacity: "edgeOpacity", scale: "edgeScale" },
] as const satisfies readonly {
    title: string;
    color: keyof Highlight;
    opacity: keyof Highlight;
    scale: keyof Highlight;
}[];

/**
 * The Selection row's Style: the highlight selected nodes and edges are drawn with, which is the
 * element's `selectionStyle` setting rather than a style layer. Each settled change is one
 * undoable step.
 * @returns The section, or nothing before the element has come up
 */
export function SelectionStyle(): React.JSX.Element | null {
    const { session, element, store } = useWorkspace();
    useStyleVersion(session, element);
    if (session === null) {
        return null;
    }
    const current = session.config.selectionStyle;
    const write = (patch: Partial<Highlight>): void => {
        // `selectionStyle` is replaced whole, so the settings not changed are written back as they are.
        session.config.set({ selectionStyle: { ...current, ...patch } }).catch(() => {
            store.set({ notice: { message: "The highlight could not be changed", error: true } });
        });
    };
    const hex = (color: string): string => color.slice(0, 7).toUpperCase();
    return (
        <Stack gap={8} p={8} data-testid="selection-style" role="group" aria-label="Highlight">
            {HIGHLIGHT_PARTS.map((part) => (
                <Stack key={part.title} gap={2} role="group" aria-label={part.title}>
                    <Text size="xs" fw={600} pl={4}>
                        {part.title}
                    </Text>
                    <div // NOSONAR(S6819): an ARIA group naming the paint field's controls; a fieldset would draw its own border and legend
                        role="group"
                        aria-label="Color"
                    >
                        <Text size="xs" aria-hidden>
                            Color
                        </Text>
                        <CompactColorInput
                            color={hex(current[part.color])}
                            defaultColor={hex(DEFAULT_SELECTION_STYLE[part.color])}
                            opacity={Math.round(current[part.opacity] * 100)}
                            defaultOpacity={Math.round(DEFAULT_SELECTION_STYLE[part.opacity] * 100)}
                            onChangeEnd={(color, opacity) => {
                                write({
                                    [part.color]: color ?? DEFAULT_SELECTION_STYLE[part.color],
                                    [part.opacity]: (opacity ?? DEFAULT_SELECTION_STYLE[part.opacity] * 100) / 100,
                                });
                            }}
                        />
                    </div>
                    <FieldRow>
                        <Text size="xs" truncate>
                            Size
                        </Text>
                        <ComboInput
                            label="Size"
                            width="100%"
                            numeric
                            variant="outlined"
                            options={[]}
                            value={current[part.scale]}
                            min={0.1}
                            step={0.05}
                            onChange={(scale) => {
                                if (typeof scale === "number" && scale > 0) {
                                    write({ [part.scale]: scale });
                                }
                            }}
                        />
                    </FieldRow>
                </Stack>
            ))}
        </Stack>
    );
}

/**
 * A group row's Style: the color its run paints the group, written into the run's color binding
 * as that group's own entry. A run that paints no color has nothing here to edit.
 * @param props - Component props
 * @param props.run - the run
 * @param props.group - the group, as the run's summary spells it
 * @returns The section, or nothing before the element has come up
 */
export function GroupStyle({
    run,
    group,
}: Readonly<{ run: string; group: string | number }>): React.JSX.Element | null {
    const { session, element, store } = useWorkspace();
    useStyleVersion(session, element);
    if (session === null) {
        return null;
    }
    const bound = runColorOf(session, run);
    if (bound === undefined) {
        return (
            <Text size="xs" c="dimmed" p="md">
                This run paints no color
            </Text>
        );
    }
    const block = colorBlockOf(session, run);
    const mapped = bound.binding.map?.[String(group)];
    const painted = (
        typeof mapped === "string" ? mapped : block?.swatches.find((swatch) => swatch.value === group)?.color
    )
        ?.slice(0, 7)
        .toUpperCase();
    return (
        <Stack gap={8} p={8} data-testid="group-style" role="group" aria-label="Fill">
            <Text size="xs" fw={600} pl={4}>
                Fill
            </Text>
            <CompactColorInput
                label="Color"
                color={painted}
                defaultColor={painted ?? "#000000"}
                showOpacity={false}
                onChangeEnd={(color) => {
                    if (color !== undefined) {
                        writeGroupColor(session, bound, block?.palette, group, color).catch(() => {
                            store.set({ notice: { message: "The group's color could not be changed", error: true } });
                        });
                    }
                }}
            />
        </Stack>
    );
}

/**
 * The new layer's panel before it is written (tier3 design, section 2.2): the whole Which elements
 * editor (kind, find, rule) first, focus on the kind; then, once a kind is chosen, its groups.
 * As soon as it has a rule it shows the rule's sentence and the element's count of what it
 * matches. Nothing reaches the element until a value is set, and that first write adds the layer
 * (a row on both kinds for Both) painting only what the rule matches, named by its rule, opens it
 * as its own row with focus on the line just set, and says "Layer ... added". Escape discards the draft, says so, and gives focus back to the Add button;
 * opening anything else abandons it too. Either leaves nothing behind.
 * @param props - Component props
 * @param props.paints - what it paints, once chosen
 * @returns The panel
 */
export function DraftPanel({ paints }: Readonly<{ paints: DraftPaints | undefined }>): React.JSX.Element | null {
    const { session, element, store } = useWorkspace();
    const version = useStyleVersion(session, element);
    const [before] = useState(() => new Set(session?.styles.list().map((layer) => layer.id)));
    const [form, setForm] = useState<Form>(BLANK_FORM);
    // A find offer's own selector, kept as the element built it until the rule is edited.
    const [picked, setPicked] = useState<Layer["selector"] | null>(null);
    // The first write added the layer: from here on it is a row like any other.
    const added = session?.styles.list().find((layer) => !before.has(layer.id) && layer.source.by === "user");
    const addedRow = added === undefined ? undefined : (added.row ?? added.id);
    useEffect(() => {
        if (addedRow === undefined || session === null) {
            return;
        }
        // Focus stays on the line just set, in the layer's own panel, and the add is said.
        const line = document.activeElement?.closest<HTMLElement>("[data-line]")?.dataset.line;
        if (line !== undefined) {
            focusLineNext(line as Channel);
        }
        const name = findTreeRow(session.styles.tree(), addedRow)?.row.name ?? "New layer";
        store.set({ inspected: { kind: "layer-row", id: addedRow }, announcement: `Layer ${name} added` });
    }, [addedRow, session, store]);
    const attributes = session === null ? [] : fieldsOf(session);
    const selector = picked ?? selectorOf(form, attributes, paints !== "edge");
    const shown = picked === null ? form : formOf(picked, attributes, paints === "edge" ? "edge" : "node");
    // What the rule matches, as soon as there is one, before any value is written.
    const counted = useAsyncValue(
        () => (session === null || selector === null ? null : draftCount(session, selector, paints ?? "node")),
        `${JSON.stringify(selector)}:${paints ?? ""}:${String(version)}`,
    );
    if (session === null) {
        return null;
    }
    const ruled = selector !== null && selector.match !== "everything";
    // A rule begun and not finished is not "every element": the draft stays a draft until it is.
    const unfinished = selector === null && !(form.mode === "where" && form.conditions.length === 0);
    const name = ruled ? ruleName(session, attributes, shown, paints ?? "node") : DRAFT_NAME;
    const choose = (kind: DraftPaints): void => {
        store.set((state) => ({ inspected: { ...state.inspected, kind: "draft-row", id: kind } }));
    };
    const hint = "added when a property is set";
    const statusOf = (): string => {
        if (unfinished) {
            return "Finish the rule to set its properties";
        }
        return ruled && counted !== undefined && counted !== null
            ? `${counted}, ${hint}`
            : "Nothing is added until a property is set";
    };
    return (
        <Stack
            gap={0}
            onKeyDown={(event) => {
                if (isPanelEscape(event.nativeEvent)) {
                    event.preventDefault();
                    event.stopPropagation();
                    discardDraft(store);
                }
            }}
        >
            <Stack gap={6} p={8} role="group" aria-label="Which elements" data-testid="which-elements">
                <RuleEditor
                    session={session}
                    attributes={attributes}
                    kind={paints}
                    onKind={choose}
                    form={form}
                    onForm={(next) => {
                        setPicked(null);
                        setForm(next);
                    }}
                    onPick={(selected, kind) => {
                        setPicked(selected);
                        setForm(formOf(selected, attributes, kind));
                        if (paints === undefined) {
                            choose(kind);
                        }
                    }}
                    sentence={ruled ? sentenceOf(session, attributes, shown, paints ?? "node") : undefined}
                    status={statusOf()}
                />
            </Stack>
            {paints !== undefined && !unfinished && (
                <RowStyle
                    key={paints}
                    session={session}
                    row={[]}
                    sides={paints === "both" ? ["node", "edge"] : [paints]}
                    fresh={{
                        name,
                        selector: selector ?? { match: "everything" },
                        both: paints === "both",
                        above: draftAnchor(session, store.get().inspected),
                    }}
                />
            )}
        </Stack>
    );
}
