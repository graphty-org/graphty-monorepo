import "./style.css";

import { ComboInput, CompactColorInput, FieldRow } from "@graphty/compact-mantine";
import { channelsFor, toColorValue } from "@graphty/graphty-element/catalog";
import { DEFAULT_SELECTION_STYLE, type LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { Box, Button, Checkbox, Group, Stack, Tabs, Text } from "@mantine/core";
import React, { useEffect, useId, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { findTreeRow, isHidden, isLocked, rowLayers as treeRowLayers } from "../graph-place/rows";
import { edgeName } from "../inspector/words";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { isBlankRow, writeKind } from "./cards";
import { GroupDetail } from "./Groups";
import { LabelSection } from "./LabelSection";
import type { RowContext } from "./PropertyRow";
import {
    beneathOf,
    EVERYTHING_LAYER,
    everythingRow,
    type NewLayer,
    paintedOverOf,
    rowLayers,
    selectionLayer,
    selectionRow,
    sourceName,
    startingEverything,
    type Target,
} from "./row";
import { Section } from "./Section";
import { useFocusLine } from "./useFocusLine";
import { useLabelColumn } from "./useLabelColumn";
import { useStyleVersion } from "./useStyleVersion";
import { WhichPicker } from "./WhichPicker";
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
 * The Style tab (the owner's style panel design, 2026-10-13, in tabs since 2026-10-16): a Node tab
 * and an Edge tab, a tree row's with its Which picker, each with its fixed sections. A section lists only the properties the layer sets, and its "+" adds the rest; nothing
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
        <RowStyle
            key={row.join(" ")}
            session={session}
            row={row}
            fresh={everything ? EVERYTHING_LAYER : undefined}
            panel={layers === undefined ? `${inspected?.kind ?? "everything-row"} ${inspected?.id ?? ""}` : undefined}
        />
    );
}

/**
 * A tree row's kinds: on when it has a part of that kind; turned on or off with the element's
 * `writeRow` target, which gives a new edge part the node part's pick (so it paints the edges
 * between the picked nodes: the Ends card); its picker is Which nodes or Which edges.
 * @param session - the element's session.
 * @param store - the workspace store, for the notice when a change is refused.
 * @param rowId - the tree row.
 * @returns the control.
 */
function rowKinds(session: GraphSession, store: WorkspaceStore, rowId: string): KindControl {
    const parts = session.styles.parts(rowId);
    const has = (side: Target): boolean => (side === "node" ? parts?.node : parts?.edge) !== undefined;
    return {
        state: (side) => ({ on: has(side) ? 1 : 0, of: 1 }),
        toggle: async (side, on) => {
            try {
                await session.transaction(`${on ? "Style" : "Stop styling"} ${KIND_WORDS[side].many}`, (tx) =>
                    writeKind(session, tx, rowId, side, on),
                );
                const name = findTreeRow(session.styles.tree(), rowId)?.row.name ?? "The layer";
                store.set({
                    announcement: `${name} ${on ? "now styles" : "no longer styles"} ${KIND_WORDS[side].many}`,
                });
            } catch (error) {
                const why = error instanceof Error ? ` ${error.message}` : "";
                store.set({ notice: { message: `Could not change what the layer styles.${why}`, error: true } });
            }
        },
        pick: (side, justOn) => (
            <WhichPicker
                key={side}
                session={session}
                rows={[rowId]}
                side={side}
                autoOpen={justOn || isBlankRow(session, rowId)}
            />
        ),
    };
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
    const { store } = useWorkspace();
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
                    kinds={row.length > 0 ? rowKinds(session, store, rowId) : undefined}
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
 * How a row's Node and Edge tabs turn a kind on and off and pick its elements: a tree row's, or
 * several rows' together.
 */
export interface KindControl {
    /** How many of the rows style the kind, of how many. */
    readonly state: (side: Target) => { readonly on: number; readonly of: number };
    /** Turns the kind on or off on every row, as one undo step. */
    readonly toggle: (side: Target, on: boolean) => Promise<void>;
    /** The kind's picker: Which nodes or Which edges, open on arrival when `justOn` and it has no cards. */
    readonly pick: (side: Target, justOn: boolean) => React.ReactNode;
}

/** A kind's tab label and its noun. */
const KIND_WORDS: Readonly<Record<Target, { tab: string; many: string; title: string }>> = {
    node: { tab: "Node", many: "nodes", title: "Nodes" },
    edge: { tab: "Edge", many: "edges", title: "Edges" },
};

/**
 * How many properties a kind's layers set, for the other kind's line: "2 styles".
 * @param layers - the kind's layers.
 * @returns the words.
 */
function stylesWords(layers: readonly Layer[]): string {
    const channels = new Set(
        layers.flatMap((layer) => [...Object.keys(layer.set ?? {}), ...Object.keys(layer.encode ?? {})]),
    );
    return channels.size === 1 ? "1 style" : `${String(channels.size)} styles`;
}

/**
 * One row's Style tab (V7, the owner's choice of 2026-10-16): Node and Edge tabs; each tab names the
 * other kind in one line, then the kind's switch and its Which picker (a tree row), then its
 * sections. One tab state for the panel: kept while the next row styles that kind, else the kind
 * the row styles, Node on a tie.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.row - the row's layers
 * @param props.sides - the kinds the row may paint; a row that adds no layer shows only the kinds
 *   it has a layer on
 * @param props.fresh - the layer the row's first edit adds; left out, the row adds none
 * @param props.below - the tree row whose beneath "+" starts a property from
 * @param props.kinds - the kinds' switches and pickers, for tree rows
 * @param props.many - for several rows edited together, per kind: what they share and how a
 *   write reaches each
 * @param props.panel - which row the tab shows, when its layers can come and go under it (the
 *   Everything row's first line adds its layer); by default its tree row, else its layers
 * @returns The tab
 */
export function RowStyle({
    session,
    row,
    sides: offered = ["node", "edge"],
    fresh,
    below,
    kinds,
    many,
    panel,
}: Readonly<{
    session: GraphSession;
    row: readonly LayerId[];
    sides?: readonly Target[];
    fresh?: NewLayer;
    below?: string;
    kinds?: KindControl;
    many?: (side: Target) => Pick<RowContext, "many" | "beneath">;
    panel?: string;
}>): React.JSX.Element {
    const { store } = useWorkspace();
    const stored = useWorkspaceState((state) => state.styleSide);
    const scope = useFocusLine<HTMLDivElement>(panel ?? below ?? row.join(" "));
    useLabelColumn(scope);
    const sides = offered.filter((t) => fresh !== undefined || rowLayers(session, row, t).length > 0);
    const tabs: readonly Target[] = kinds === undefined ? sides : ["node", "edge"];
    const styled = (side: Target): boolean => (kinds === undefined ? sides.includes(side) : kinds.state(side).on > 0);
    const [tab, setTab] = useState<Target>(() =>
        styled(stored) || !tabs.some(styled) ? stored : (tabs.find(styled) ?? "node"),
    );
    const [justOn, setJustOn] = useState<Target | null>(null);
    useEffect(() => {
        if (tab !== stored) {
            store.set({ styleSide: tab });
        }
        // Only when the tab moves here: another panel's tab is that panel's.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);
    // Beneath the row, over its own elements: its tree row, else its lowest layer's, else (a row
    // not written yet) the stack as it is.
    const lowest = session.styles.list().find((layer) => row.includes(layer.id));
    const treeRow = below ?? (lowest === undefined ? undefined : (lowest.row ?? lowest.id));
    const beneath = beneathOf(session, treeRow);
    const paintedOver = treeRow === undefined || many !== undefined ? undefined : paintedOverOf(session, treeRow, row);
    const colors = documentColors(session);
    const sectionsOf = (side: Target): React.JSX.Element => {
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
        return (
            <section className="ws-style-group" data-group={side}>
                {SECTIONS[side].map((spec) =>
                    spec.id === "text" ? (
                        <LabelSection key={spec.id} ctx={ctx} />
                    ) : (
                        <Section key={spec.id} ctx={ctx} spec={spec} />
                    ),
                )}
            </section>
        );
    };
    if (tabs.length < 2) {
        return (
            <Stack ref={scope} gap={0} data-testid="style-tab" className="ws-style-panel">
                {sides.map((side) => (
                    <React.Fragment key={side}>{sectionsOf(side)}</React.Fragment>
                ))}
            </Stack>
        );
    }
    const show = (side: Target): void => {
        setTab(side);
    };
    const turn = async (side: Target, on: boolean): Promise<void> => {
        if (kinds === undefined) {
            return;
        }
        await kinds.toggle(side, on);
        setJustOn(on ? side : null);
        setTab(side);
    };
    return (
        <Stack ref={scope} gap={0} data-testid="style-tab" className="ws-style-panel">
            <Tabs
                value={tab}
                onChange={(value) => {
                    if (value === "node" || value === "edge") {
                        show(value);
                    }
                }}
                keepMounted={false}
                className="ws-style-tabs"
            >
                <Tabs.List aria-label="Style for">
                    {tabs.map((side) => (
                        <Tabs.Tab
                            key={side}
                            value={side}
                            rightSection={
                                styled(side) ? undefined : (
                                    <Text span size="xs" c="var(--cm-text-secondary)">
                                        off
                                    </Text>
                                )
                            }
                        >
                            {KIND_WORDS[side].tab}
                        </Tabs.Tab>
                    ))}
                </Tabs.List>
                {tabs.map((side) => {
                    const other: Target = side === "node" ? "edge" : "node";
                    return (
                        <Tabs.Panel key={side} value={side}>
                            <OtherLine
                                session={session}
                                row={row}
                                side={other}
                                kinds={kinds}
                                styled={styled(other)}
                                onEdit={() => {
                                    show(other);
                                }}
                                onTurnOn={() => turn(other, true)}
                            />
                            {kinds !== undefined && (
                                <KindSwitch
                                    side={side}
                                    state={kinds.state(side)}
                                    only={styled(side) && !styled(other)}
                                    onTurn={(on) => turn(side, on)}
                                />
                            )}
                            {styled(side) && (
                                <>
                                    {kinds?.pick(side, justOn === side)}
                                    {rowLayers(session, row, side).length > 0 || fresh !== undefined
                                        ? sectionsOf(side)
                                        : null}
                                </>
                            )}
                        </Tabs.Panel>
                    );
                })}
            </Tabs>
        </Stack>
    );
}

/**
 * The other kind in one line, so the whole layer reads from either tab: "Edges: 2 styles" with
 * Edit, or "Edges: not styled" with Style edges. One Tab stop.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.row - the row
 * @param props.side - nodes or edges
 * @param props.kinds - the kinds' switches, when the rows have them
 * @param props.styled - whether the kind is styled
 * @param props.onEdit - goes to the kind's tab
 * @param props.onTurnOn - turns the kind on
 * @returns The line
 */
function OtherLine({
    session,
    row,
    side,
    kinds,
    styled,
    onEdit,
    onTurnOn,
}: Readonly<{
    session: GraphSession;
    row: readonly LayerId[];
    side: Target;
    kinds: KindControl | undefined;
    styled: boolean;
    onEdit: () => void;
    onTurnOn: () => Promise<void>;
}>): React.JSX.Element {
    const words = KIND_WORDS[side];
    const state = kinds?.state(side);
    let what = "not styled";
    if (styled) {
        what =
            state !== undefined && state.of > 1
                ? `on in ${String(state.on)} of ${String(state.of)} layers`
                : stylesWords(rowLayers(session, row, side));
    }
    return (
        <Group gap={6} wrap="nowrap" className="ws-other-line" data-other={side}>
            <Text size="xs" c="dimmed" style={{ flex: 1, minWidth: 0 }} truncate>
                {words.title}: {what}
            </Text>
            {styled ? (
                <Button size="compact-xs" variant="subtle" aria-label={`Edit ${words.many}`} onClick={onEdit}>
                    Edit
                </Button>
            ) : (
                kinds !== undefined && (
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        onClick={() => {
                            void onTurnOn();
                        }}
                    >
                        Style {words.many}
                    </Button>
                )
            )}
        </Group>
    );
}

/**
 * A kind's switch: "Style edges", or on several layers "Style edges, on in 3 of 10 layers", mixed
 * when some do. A layer keeps at least one kind.
 * @param props - Component props
 * @param props.side - nodes or edges
 * @param props.state - how many rows style the kind, of how many
 * @param props.only - whether it is the row's only kind
 * @param props.onTurn - turns the kind on or off
 * @returns The switch
 */
function KindSwitch({
    side,
    state,
    only,
    onTurn,
}: Readonly<{
    side: Target;
    state: { readonly on: number; readonly of: number };
    only: boolean;
    onTurn: (on: boolean) => Promise<void>;
}>): React.JSX.Element {
    const words = KIND_WORDS[side];
    const label =
        state.of > 1
            ? `Style ${words.many}, on in ${String(state.on)} of ${String(state.of)} layers`
            : `Style ${words.many}`;
    const all = state.on === state.of;
    return (
        <Checkbox
            size="xs"
            className="ws-kind-switch"
            label={label}
            checked={state.on > 0 && all}
            indeterminate={state.on > 0 && !all}
            disabled={only && all && state.of === 1}
            description={only && all && state.of === 1 ? "A layer styles nodes, edges or both" : undefined}
            onChange={() => {
                void onTurn(!all);
            }}
        />
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
            panel={`selection ${JSON.stringify([nodes, edges])}`}
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
 * A group row's Style: every property the run's layer varies by its groups, for this one group,
 * in the group detail the binding popover opens (tier3 decisions, round 6: "any property per
 * group"), with "+ Set another property". A run that paints nothing by group has nothing to edit.
 * @param props - Component props
 * @param props.run - the run
 * @param props.group - the group, as the run's summary spells it
 * @returns The section, or nothing before the element has come up
 */
export function GroupStyle({
    run,
    group,
}: Readonly<{ run: string; group: string | number }>): React.JSX.Element | null {
    const { session, element } = useWorkspace();
    useStyleVersion(session, element);
    if (session === null) {
        return null;
    }
    // The run's first layer that paints something by a value its groups are values of.
    const owned = session.runs.bindings(run);
    let found: { layer: Layer; path: string } | undefined;
    for (const layer of session.styles.list()) {
        if (!owned.includes(layer.id)) {
            continue;
        }
        for (const binding of Object.values(layer.encode ?? {})) {
            if (
                binding !== undefined &&
                "by" in binding &&
                session.styles.groups(layer.id, binding.by).some((g) => String(g.value) === String(group))
            ) {
                found = { layer, path: binding.by };
                break;
            }
        }
        if (found !== undefined) {
            break;
        }
    }
    if (found === undefined) {
        return (
            <Text size="xs" c="dimmed" p="md">
                This run paints nothing by group
            </Text>
        );
    }
    const source = sourceName(session, { by: found.path }) ?? found.path;
    return (
        <Box p={8} data-testid="group-style">
            <GroupDetail
                session={session}
                layer={found.layer}
                path={found.path}
                source={source}
                keys={[String(group)]}
            />
        </Box>
    );
}
