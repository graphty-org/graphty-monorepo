import "./style.css";

import { ComboInput, CompactColorInput, FieldRow } from "@graphty/compact-mantine";
import { channelsFor, toColorValue } from "@graphty/graphty-element/catalog";
import { type Binding, DEFAULT_SELECTION_STYLE, type LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { Box, Checkbox, Stack, Tabs, Tooltip, VisuallyHidden } from "@mantine/core";
import React, { useEffect, useId, useRef, useState } from "react";

import { cosmographOn, fileStylesOn, stylePanelV2On } from "../features";
import { findTreeRow, isLocked, rowLayers as treeRowLayers } from "../graph-place/rows";
import { errorWords } from "../project/words";
import { RenderCount } from "../renderCount";
import { StyleOpenLine } from "../selection/StyleOpenLine";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { type CardField, isBlankRow, writeKind } from "./cards";
import { ControlLabel } from "./ControlLabel";
import { GroupDetail } from "./Groups";
import { LabelSection } from "./LabelSection";
import { PartsPanel } from "./parts/PartsPanel";
import { ruleLine } from "./parts/ruleLine";
import type { RowContext } from "./PropertyRow";
import {
    beneathOf,
    EVERYTHING_LAYER,
    everythingRow,
    hiddenByOf,
    type NewLayer,
    paintedOverOf,
    rowLayers,
    selectedLayerRow,
    sourceName,
    type Target,
    wholeGraphRow,
} from "./row";
import { Section } from "./Section";
import { useFocusLine } from "./useFocusLine";
import { useLabelColumn } from "./useLabelColumn";
import { useDataVersion, useStyleVersion } from "./useStyleVersion";
import { StylePanelV2 } from "./v2/StylePanelV2";
import { WhichPicker } from "./WhichPicker";

/** A kind the row does not style yet: its Select line counts none. */
const NO_COUNT = { short: "None", full: "none" } as const;
import { sectionsFor } from "./words";

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
            const whole = wholeGraphRow(session);
            return whole === undefined ? everythingRow(session) : treeRowLayers(session, whole);
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
        wholeGraphRow(session) === undefined;
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
                store.set({
                    notice: { message: errorWords("Could not change what the layer styles", error), error: true },
                });
            }
        },
        pick: (side, justOn, elsewhere) => (
            <WhichPicker
                key={side}
                session={session}
                rows={[rowId]}
                side={side}
                autoOpen={justOn || isBlankRow(session, rowId)}
                openWorkspace={justOn && stylePanelV2On(session)}
                {...(fileStylesOn(session) ? { summary: ruleLine } : {})}
                {...elsewhere}
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
function TreeRowPanel({
    session,
    rowId,
}: Readonly<{ session: GraphSession; rowId: string }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const found = findTreeRow(session.styles.tree(), rowId);
    if (found === undefined) {
        return null;
    }
    const row = treeRowLayers(session, rowId);
    // Every layer says which elements it paints, whoever made it: provenance never changes what a
    // layer offers. Keyed by the row, not its layers, so a change of kind keeps the editor open.
    return (
        <LockedGroup locked={isLocked(found)}>
            <RowStyle
                key={rowId}
                session={session}
                row={row}
                below={rowId}
                kinds={row.length > 0 ? rowKinds(session, store, rowId) : undefined}
            />
        </LockedGroup>
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
            {/* Heard as each control's description; the Style sidebar draws no note (#8739). */}
            {locked && <VisuallyHidden id={reasonId}>This layer is locked</VisuallyHidden>}
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
 * How a row's Node and Edge tabs turn a kind on and off and pick its elements: a tree row's, or
 * several rows' together.
 */
export interface KindControl {
    /** How many of the rows style the kind, of how many. */
    readonly state: (side: Target) => { readonly on: number; readonly of: number };
    /** Turns the kind on or off on every row, as one undo step. */
    readonly toggle: (side: Target, on: boolean) => Promise<void>;
    /**
     * The kind's picker: Which nodes or Which edges, open on arrival when `justOn` and it has no
     * cards; `elsewhere` opens it with a card on a field and sends a field of the other kind to its tab.
     */
    readonly pick: (side: Target, justOn: boolean, elsewhere?: Elsewhere) => React.ReactNode;
}

/** How a kind's picker and the other kind's tab hand a field between them. */
interface Elsewhere {
    /** The field to open on with a card on it. */
    readonly adding?: string;
    /** Goes to the other kind's tab with a card on a field it carries. */
    readonly onElsewhere: (field: CardField) => void;
}

/** A kind's tab label and its noun. */
const KIND_WORDS: Readonly<Record<Target, { tab: string; many: string }>> = {
    node: { tab: "Node", many: "nodes" },
    edge: { tab: "Edge", many: "edges" },
};

/**
 * One row's Style tab (V7, the owner's choice of 2026-10-16): Node and Edge tabs; each tab holds
 * the kind's switch (v1 only) and its Select nodes... or Select edges... line (a tree row), then its sections.
 * One tab state for the panel: kept while the next row styles that kind, else the kind the row
 * styles, Node on a tie.
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
    const { store, element } = useWorkspace();
    const stored = useWorkspaceState((state) => state.styleSide);
    const scope = useFocusLine<HTMLDivElement>(session, panel ?? below ?? row.join(" "));
    const sides = offered.filter((t) => fresh !== undefined || rowLayers(session, row, t).length > 0);
    const tabs: readonly Target[] = kinds === undefined ? sides : ["node", "edge"];
    const styled = (side: Target): boolean => (kinds === undefined ? sides.includes(side) : kinds.state(side).on > 0);
    const [tab, setTab] = useState<Target>(() => {
        // A new layer (nothing set, nothing picked) opens on its first kind, whichever tab was last open.
        if (below !== undefined && isBlankRow(session, below) && styled("node")) {
            return "node";
        }
        return styled(stored) || !tabs.some(styled) ? stored : (tabs.find(styled) ?? "node");
    });
    const [justOn, setJustOn] = useState<Target | null>(null);
    // A field of the other kind the reader asked for from this kind's Add a condition.
    const [adding, setAdding] = useState<{ readonly side: Target; readonly path: string } | null>(null);
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
    // A selection's row not written yet paints the selection: read beneath over it.
    const fresher = fresh !== undefined && fresh.selector.match !== "everything";
    const beneath = beneathOf(session, treeRow, fresher ? "selection" : "graph");
    const hiddenBy = treeRow === undefined || many !== undefined ? undefined : hiddenByOf(session, treeRow, row);
    const paintedOverBy =
        treeRow === undefined || many !== undefined ? undefined : paintedOverOf(session, treeRow, row);
    const colors = documentColors(session);
    const dataVersion = useDataVersion(session, element);
    const ctxOf = (side: Target): RowContext => ({
        session,
        row,
        side,
        layers: rowLayers(session, row, side),
        fresh,
        beneath,
        hiddenBy,
        paintedOverBy,
        documentColors: colors,
        ...many?.(side),
    });
    // What a kind's sections read, as the element answers it: its layers and their counts, what
    // lies beneath and over the row per channel, the document's colors, and every change that is
    // not to the layers alone. Unchanged, the sections are not drawn again: an animation updating
    // another layer once a frame redrew every section of this one (#9423). Several rows edited
    // together carry their writes in the context, so they are always drawn again.
    const signatureOf = (side: Target, ctx: RowContext): string | null =>
        many === undefined
            ? JSON.stringify([
                  row,
                  side,
                  fresh,
                  ctx.layers,
                  // Its revision moves with every repaint, whatever it painted.
                  ctx.layers.map((layer) => ({ ...session.styles.counts(layer.id), revision: undefined })),
                  channelsFor(side).map(({ channel }) => [
                      beneath(channel),
                      hiddenBy?.(channel),
                      paintedOverBy?.(channel),
                  ]),
                  colors,
                  dataVersion,
                  fileStylesOn(session),
                  cosmographOn(session),
                  stylePanelV2On(session),
              ])
            : null;
    const drawn = new Map(
        offered.map((side) => {
            const ctx = ctxOf(side);
            return [side, { ctx, signature: signatureOf(side, ctx) }] as const;
        }),
    );
    // The label column is measured again only when what the sections draw has changed.
    const signatures = [...drawn.values()].map(({ signature }) => signature);
    useLabelColumn(scope, signatures.includes(null) ? undefined : JSON.stringify([tab, signatures]));
    const sectionsOf = (side: Target): React.JSX.Element => {
        const { ctx, signature } = drawn.get(side) ?? { ctx: ctxOf(side), signature: null };
        return <SideSections ctx={ctx} signature={signature} />;
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
    const v2 = stylePanelV2On(session);
    const show = (side: Target): void => {
        setAdding(null);
        if (v2) {
            // Back on a tab, its workspace does not open again.
            setJustOn(null);
        }
        setTab(side);
    };
    const turn = async (side: Target, on: boolean): Promise<void> => {
        if (kinds === undefined) {
            return;
        }
        // Set before the write: the picker the new part draws reads it as it arrives.
        if (on) {
            setJustOn(side);
        }
        await kinds.toggle(side, on);
        if (!on) {
            setJustOn(null);
        }
        setTab(side);
    };
    const elsewhere = (side: Target): Elsewhere => ({
        ...(adding?.side === side ? { adding: adding.path } : {}),
        onElsewhere: (field) => {
            // The card is asked for before the kind is turned on, so the picker the turn draws
            // opens with it (#9537).
            setAdding({ side: field.on, path: field.path });
            void (async () => {
                if (!styled(field.on)) {
                    await turn(field.on, true);
                }
                setTab(field.on);
            })();
        },
    });
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
                        <Tabs.Tab key={side} value={side}>
                            {KIND_WORDS[side].tab}
                        </Tabs.Tab>
                    ))}
                </Tabs.List>
                {tabs.map((side) => {
                    const other: Target = side === "node" ? "edge" : "node";
                    return (
                        <Tabs.Panel key={side} value={side}>
                            {kinds !== undefined && v2 && !styled(side) && (
                                // v2 has no switch: a kind the row does not style yet is its Select
                                // line, which starts the kind on every element and opens the workspace.
                                <StyleOpenLine
                                    side={side}
                                    count={NO_COUNT}
                                    onOpen={() => {
                                        void turn(side, true);
                                    }}
                                />
                            )}
                            {kinds !== undefined && !v2 && (
                                <KindSwitch
                                    side={side}
                                    state={kinds.state(side)}
                                    only={styled(side) && !styled(other)}
                                    onTurn={(on) => turn(side, on)}
                                />
                            )}
                            {styled(side) && (
                                <>
                                    {kinds?.pick(side, justOn === side, elsewhere(side))}
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
 * One kind's sections, drawn again only when their signature changes; with no signature, on every
 * render.
 * @param props - Component props
 * @param props.ctx - the kind's row context
 * @param props.signature - what the sections read, or null to draw them on every render
 * @returns The sections
 */
const SideSections = React.memo(
    function SideSections({ ctx }: Readonly<{ ctx: RowContext; signature: string | null }>): React.JSX.Element {
        // Style panel v2 (with file styles) draws its own sections; file styles alone, by part of the drawing.
        let sections: React.JSX.Element;
        if (stylePanelV2On(ctx.session)) {
            sections = <StylePanelV2 ctx={ctx} />;
        } else if (fileStylesOn(ctx.session)) {
            sections = <PartsPanel ctx={ctx} />;
        } else {
            sections = (
                <section className="ws-style-group" data-group={ctx.side}>
                    {sectionsFor(ctx.side, { cosmograph: cosmographOn(ctx.session) }).map((spec) =>
                        spec.id === "text" ? (
                            <LabelSection key={spec.id} ctx={ctx} />
                        ) : (
                            <Section key={spec.id} ctx={ctx} spec={spec} />
                        ),
                    )}
                </section>
            );
        }
        return <RenderCount id={`style-sections-${ctx.side}`}>{sections}</RenderCount>;
    },
    (before, after) => before.signature !== null && before.signature === after.signature,
);

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
    const all = state.on === state.of;
    // A checked or clear box already says "all" or "none"; only a mixed one counts its layers.
    const label =
        state.of > 1 && state.on > 0 && !all
            ? `Style ${words.many}, on in ${String(state.on)} of ${String(state.of)} layers`
            : `Style ${words.many}`;
    const fixed = only && all && state.of === 1;
    const other = KIND_WORDS[side === "node" ? "edge" : "node"].many;
    // Why it cannot be cleared, in its tooltip and its description, not as lines on the panel.
    const reason = fixed ? `Stays on: style ${other} first to stop styling ${words.many}` : undefined;
    const box = (
        <Checkbox
            size="xs"
            className="ws-kind-switch"
            label={label}
            checked={state.on > 0 && all}
            indeterminate={state.on > 0 && !all}
            disabled={fixed}
            aria-description={reason}
            onChange={() => {
                void onTurn(!all);
            }}
        />
    );
    return reason === undefined ? (
        box
    ) : (
        <Tooltip label={reason} position="bottom-start">
            <div className="ws-kind-switch-tip">{box}</div>
        </Tooltip>
    );
}

/**
 * The Style tab of a node, an edge or several selected: the selected layer's (owner, 2026-10-21),
 * the style tree row the reader last opened, else the row that paints every element. An edit
 * goes to a layer the reader chose, never to a new layer for what is selected; the tree's Layer
 * from selection makes one of those.
 * @returns The tab, or nothing before the element has come up
 */
export function SelectionRowStyle(): React.JSX.Element | null {
    const { session, element } = useWorkspace();
    useStyleVersion(session, element);
    const styleRow = useWorkspaceState((state) => state.styleRow);
    if (session === null) {
        return null;
    }
    const row = selectedLayerRow(session, styleRow);
    return row === undefined ? <StylePanel /> : <StylePanel rowId={row} />;
}

/** The element's selection highlight, as `session.config.selectionStyle` reads. */
type Highlight = GraphSession["config"]["selectionStyle"];

/**
 * The two parts of the highlight: the ring a selected node is drawn with and the band a selected
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
                    <ControlLabel size="xs" fw={600} pl={4}>
                        {part.title}
                    </ControlLabel>
                    <div // eslint-disable-line jsx-a11y/prefer-tag-over-role -- an ARIA group naming the paint field's controls; a fieldset would draw its own border and legend
                        role="group"
                        aria-label="Color"
                    >
                        <ControlLabel size="xs" aria-hidden>
                            Color
                        </ControlLabel>
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
                        <ControlLabel size="xs" truncate>
                            Size
                        </ControlLabel>
                        <ComboInput
                            label="Size"
                            width="100%"
                            numeric
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
        for (const binding of Object.values<Binding | undefined>(layer.encode ?? {})) {
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
        // A run that paints each group as a layer of its own: the group's Style is that layer's,
        // the row the Graph place lists under the run's folder.
        const own = session.styles
            .list()
            .find(
                (layer) =>
                    owned.includes(layer.id) &&
                    layer.selector.match === "rule" &&
                    layer.selector.where.kind === "categories" &&
                    layer.selector.where.values.includes(String(group)),
            );
        if (own !== undefined) {
            return <StylePanel rowId={own.row ?? own.id} />;
        }
        return null;
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
