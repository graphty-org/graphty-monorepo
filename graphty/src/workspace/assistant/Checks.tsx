import { EntityChip, TooltipShortcut } from "@graphty/compact-mantine";
import type { AiEffect, AiTarget } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Group, Text, Tooltip, UnstyledButton, VisuallyHidden } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { useVisibilityVersion } from "../data-place/useVisibilityVersion";
import { GLYPHS } from "../glyphs";
import { findTreeRow, rowName } from "../graph-place/rows";
import { ariaKey, formatKey } from "../keys/keys";
import { runName } from "../runWords";
import { formatNumber } from "../settings/numberFormat";
import { useWorkspace } from "../state/WorkspaceContext";
import { changeLines, chipName, emptyWords, excludedLine, moreWords, openedWords, WORDS } from "./words";

type Kind = "node" | "edge";

/** What a target counts now: a count, null once it is gone, undefined until it is read. */
type Live = { readonly nodes: number; readonly edges: number } | null | undefined;

/**
 * What a target holds now: the count is the rule's, read again on every change to the graph.
 * @param target - the target.
 * @returns the count.
 */
function useLiveCount(target: AiTarget): Live {
    const { session } = useWorkspace();
    const version = useVisibilityVersion(session);
    const [live, setLive] = useState<Live>(undefined);
    const key = JSON.stringify(target);
    useEffect(() => {
        let current = true;
        session?.selection.count(JSON.parse(key) as AiTarget).then(
            (count) => {
                if (current) {
                    setLive(count);
                }
            },
            () => {
                // Its layer or run left the graph.
                if (current) {
                    setLive(null);
                }
            },
        );
        return () => {
            current = false;
        };
    }, [session, key, version]);
    return live;
}

/** Props for Chip. */
interface ChipProps {
    readonly kind: Kind;
    readonly count: number;
    readonly target: AiTarget;
    /** Whether Tab reaches it: its group's one stop. */
    readonly stop: boolean;
    readonly onFocused: () => void;
}

/**
 * One chip: compact-mantine's chip in a button that supplies hover and focus. Hover or focus peeks,
 * with no undo step; a click selects.
 * @param props - Component props
 * @param props.kind - nodes or edges
 * @param props.count - how many
 * @param props.target - what it points at
 * @param props.stop - whether Tab reaches it
 * @param props.onFocused - called as it takes focus
 * @returns The chip
 */
function Chip({ kind, count, target, stop, onFocused }: Readonly<ChipProps>): React.JSX.Element {
    const { session } = useWorkspace();
    const peeking = useRef(false);
    const peek = (on: boolean): void => {
        peeking.current = on;
        // A target that went between the hover and the read has nothing to show.
        session?.selection.peek(on ? target : null).catch(() => undefined);
    };
    useEffect(
        () => () => {
            if (peeking.current) {
                session?.selection.peek(null).catch(() => undefined);
            }
        },
        [session],
    );
    return (
        <UnstyledButton
            className="ws-assistant-chip cm-focus-outside"
            aria-label={chipName(kind, count)}
            tabIndex={stop ? 0 : -1}
            onPointerEnter={() => {
                peek(true);
            }}
            onPointerLeave={() => {
                peek(false);
            }}
            onFocus={() => {
                onFocused();
                peek(true);
            }}
            onBlur={() => {
                peek(false);
            }}
            onClick={() => {
                void session?.selection.apply(target, "replace", { cause: "user" });
            }}
        >
            <EntityChip kind={kind}>{formatNumber(count)}</EntityChip>
        </UnstyledButton>
    );
}

/** Props for ChipRow. */
interface ChipRowProps {
    readonly target: AiTarget;
    /** The kinds it names. */
    readonly kinds: readonly Kind[];
    /** Whether it offers Show in table. */
    readonly table?: boolean;
    /** More icons for its right end: the reply's own. */
    readonly actions?: React.ReactNode;
}

/**
 * A result's chips, one Tab stop with arrows inside, and Show in table. A target that left the graph
 * reads Not in this graph as plain text.
 * @param props - Component props
 * @param props.target - what the chips point at
 * @param props.kinds - the kinds it names
 * @param props.table - whether it offers Show in table
 * @param props.actions - more icons for its right end
 * @returns The row, or nothing until it is read
 */
export function ChipRow({ target, kinds, table = false, actions }: Readonly<ChipRowProps>): React.JSX.Element | null {
    const { store, session } = useWorkspace();
    const live = useLiveCount(target);
    const [stop, setStop] = useState(0);
    const group = useRef<HTMLDivElement>(null);
    if (live === undefined) {
        return null;
    }
    const chips = kinds.flatMap((kind) => {
        const count = live === null ? 0 : live[`${kind}s`];
        return count > 0 ? [{ kind, count }] : [];
    });
    if (chips.length === 0) {
        return (
            <Group gap={4} justify="space-between" wrap="nowrap">
                <Text size="sm">{WORDS["assistant.chip.gone"]}</Text>
                <Group gap={2}>{actions}</Group>
            </Group>
        );
    }
    const move = (event: React.KeyboardEvent): void => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
        if (step !== undefined) {
            event.preventDefault();
            const next = (stop + step + chips.length) % chips.length;
            group.current?.querySelectorAll("button")[next]?.focus();
        }
    };
    return (
        <Group gap={4} justify="space-between">
            <div // NOSONAR(S6819): one Tab stop with arrows inside, the roving pattern; a fieldset would bring its own frame
                ref={group}
                role="group"
                aria-label={WORDS["assistant.chips.name"]}
                className="ws-assistant-chips"
                onKeyDown={move}
            >
                {chips.map((chip, index) => (
                    <Chip
                        key={chip.kind}
                        {...chip}
                        target={target}
                        stop={index === Math.min(stop, chips.length - 1)}
                        onFocused={() => {
                            setStop(index);
                        }}
                    />
                ))}
            </div>
            <Group gap={2} wrap="nowrap">
                {table ? (
                    <Tooltip label={WORDS["assistant.table"]}>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label={WORDS["assistant.table"]}
                            onClick={() => {
                                // The table lists the reply's rows; the selection, and with it the
                                // next message's scope, stays the reader's.
                                session?.selection.members(target).then(
                                    ({ nodes, edges }) => {
                                        const edgesOnly = nodes.length === 0 && edges.length > 0;
                                        store.set({
                                            dockOpen: true,
                                            dockTab: edgesOnly ? "edges" : "nodes",
                                            dockRows: edgesOnly
                                                ? {
                                                      kind: "edge",
                                                      scope: {
                                                          define: {
                                                              kind: "fixed",
                                                              nodes: [],
                                                              edges,
                                                              reading: "listed",
                                                          },
                                                      },
                                                  }
                                                : { kind: "node", scope: { nodes } },
                                        });
                                    },
                                    () => {
                                        store.set({ notice: { message: "Rows not shown" } });
                                    },
                                );
                            }}
                        >
                            <GLYPHS.table size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                ) : null}
                {actions}
            </Group>
        </Group>
    );
}

/**
 * The kinds a found effect names.
 * @param effect - the effect.
 * @returns them.
 */
function kindsOf(effect: AiEffect): readonly Kind[] {
    const { params } = effect;
    return [
        ...(Number(params.nodes ?? 0) > 0 ? ["node" as const] : []),
        ...(Number(params.edges ?? 0) > 0 ? ["edge" as const] : []),
    ];
}

/**
 * A tool's result as chips, or an empty result as a warning row naming what was searched.
 * @param props - Component props
 * @param props.effect - the found or empty effect
 * @param props.table - whether it offers Show in table
 * @param props.actions - more icons for its right end
 * @returns The row, or nothing for an effect that names no elements
 */
export function ResultRow({
    effect,
    table = false,
    actions,
}: Readonly<{ effect: AiEffect; table?: boolean; actions?: React.ReactNode }>): React.JSX.Element | null {
    if (effect.code === "AI_EFFECT_EMPTY") {
        return (
            <Group gap={4} wrap="nowrap">
                <GLYPHS.warning size={12} aria-hidden />
                <Text size="sm" flex={1}>
                    {emptyWords(effect.params.searched)}
                </Text>
                {actions}
            </Group>
        );
    }
    return effect.target === undefined ? null : (
        <ChipRow target={effect.target} kinds={kindsOf(effect)} table={table} actions={actions} />
    );
}

/** Lines shown before "and {N} more". */
const MAX_LINES = 3;

/** Props for ChangeRows. */
interface ChangeRowsProps {
    readonly changes: readonly AiEffect[];
    /** The id the turn's steps carry. */
    readonly provenance: string | undefined;
    /** Whether none of the turn's changes stands. */
    readonly undone: boolean;
    /** Called as the reader opens the rest of the lines. */
    readonly onMore: () => void;
    /** More icons for the row of icons: the reply's own. */
    readonly actions?: React.ReactNode;
}

/** A link from a turn to the real editor of what it made. */
interface OpenLink {
    readonly label: string;
    readonly inspected: { readonly kind: "layer-row" | "run-row"; readonly id: string };
    /** What it opens, for the status line. */
    readonly name: string;
}

/**
 * The links a turn draws: its first layer and its first run that still stand, and that it did not
 * itself remove.
 * @param session - the session.
 * @param changes - the turn's changes.
 * @returns the links.
 */
function openLinks(session: GraphSession, changes: readonly AiEffect[]): readonly OpenLink[] {
    const tree = session.styles.tree();
    const layer = changes
        .map((effect) => String(effect.params.layer))
        .find((id) => findTreeRow(tree, id) !== undefined);
    // A later run of the same algorithm and options takes the same id, so a run this turn removed
    // must not link to it: each run's last effect decides.
    const lastOfEach = new Map(changes.map((effect) => [String(effect.params.run), effect]));
    const run = [...lastOfEach.values()]
        .filter((effect) => effect.code !== "AI_EFFECT_RUN_REMOVED")
        .map((effect) => session.runs.get(String(effect.params.run)))
        .find((each) => each !== undefined);
    return [
        ...(layer === undefined
            ? []
            : [
                  {
                      label: WORDS["assistant.open-layer"],
                      inspected: { kind: "layer-row", id: layer } as const,
                      name: rowName(session, layer),
                  },
              ]),
        ...(run === undefined
            ? []
            : [
                  {
                      label: WORDS["assistant.open-run"],
                      inspected: { kind: "run-row", id: run.id } as const,
                      name: runName(session, run),
                  },
              ]),
    ];
}

/**
 * What a turn did to the graph: one line per change, up to three until "and {N} more" opens the rest in
 * place, then the links to the real editor as icons,
 * each only while its layer or run stands, and Undo on the newest step only. Once no step of the
 * message stands, its lines are struck through and screen readers hear Undone.
 * @param props - Component props
 * @param props.changes - the turn's changes
 * @param props.provenance - the id its steps carry
 * @param props.undone - whether none of its changes stands
 * @param props.onMore - called as the reader opens the rest of the lines
 * @param props.actions - more icons for the row of icons
 * @returns The rows
 */
export function ChangeRows({
    changes,
    provenance,
    undone,
    onMore,
    actions,
}: Readonly<ChangeRowsProps>): React.JSX.Element {
    const { store, session, run } = useWorkspace();
    useVisibilityVersion(session);
    const next = session?.history.nextUndo;
    const newest = next?.kind === "undo" && provenance !== undefined && next.step.provenance.message === provenance;
    const lines = changeLines(session, changes);
    const excluded = excludedLine(changes);
    const links = session === null || undone ? [] : openLinks(session, changes);
    const [all, setAll] = useState(false);
    const shown = all ? lines : lines.slice(0, MAX_LINES);
    // The button goes as the lines it stood for arrive, so focus moves to the first of them.
    const firstMore = useRef<HTMLParagraphElement>(null);
    useEffect(() => {
        if (all) {
            firstMore.current?.focus();
        }
    }, [all]);
    return (
        <div className="ws-assistant-change">
            {shown.map((line, index) => (
                // A turn's lines never reorder. Each starts with the layers glyph, as a change.
                <Group
                    key={index} // NOSONAR(S6479): a line's place is its identity
                    gap={6}
                    wrap="nowrap"
                    align="flex-start"
                >
                    <GLYPHS.changed size={14} aria-hidden className="ws-assistant-changed" />
                    <Text
                        size="sm"
                        td={undone ? "line-through" : undefined}
                        ref={index === MAX_LINES ? firstMore : undefined}
                        tabIndex={index === MAX_LINES ? -1 : undefined}
                    >
                        {line}
                    </Text>
                </Group>
            ))}
            {shown.length < lines.length ? (
                <Button
                    variant="subtle"
                    color="gray"
                    size="compact-xs"
                    onClick={() => {
                        onMore();
                        setAll(true);
                    }}
                >
                    {moreWords(lines.length - MAX_LINES)}
                </Button>
            ) : null}
            {excluded === null ? null : <Text size="sm">{excluded}</Text>}
            {undone ? <VisuallyHidden>{WORDS["assistant.undone"]}</VisuallyHidden> : null}
            <Group gap={2} justify="flex-end">
                {links.map((link) => (
                    <Tooltip key={link.label} label={link.label}>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label={link.label}
                            onClick={() => {
                                store.set({ inspected: link.inspected, announcement: openedWords(link.name) });
                            }}
                        >
                            <GLYPHS.openLayer size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                ))}
                {newest ? (
                    <Tooltip label={<TooltipShortcut label={WORDS["assistant.undo"]} shortcut={formatKey("Mod+Z")} />}>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label={WORDS["assistant.undo"]}
                            aria-keyshortcuts={ariaKey("Mod+Z")}
                            onClick={() => {
                                run("history.undo");
                            }}
                        >
                            <GLYPHS.undo size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                ) : null}
                {actions}
            </Group>
        </div>
    );
}
