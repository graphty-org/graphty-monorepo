import { EntityChip } from "@graphty/compact-mantine";
import type { AiEffect, AiTarget } from "@graphty/graphty-element/catalog";
import { Button, Group, Text, UnstyledButton } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { useVisibilityVersion } from "../data-place/useVisibilityVersion";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../settings/numberFormat";
import { useWorkspace } from "../state/WorkspaceContext";
import { chipName, effectLine, emptyWords, excludedLine, moreWords, WORDS } from "./words";

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
}

/**
 * A result's chips, one Tab stop with arrows inside, and Show in table. A target that left the graph
 * reads Not in this graph as plain text.
 * @param props - Component props
 * @param props.target - what the chips point at
 * @param props.kinds - the kinds it names
 * @param props.table - whether it offers Show in table
 * @returns The row, or nothing until it is read
 */
export function ChipRow({ target, kinds, table = false }: Readonly<ChipRowProps>): React.JSX.Element | null {
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
        return <Text size="sm">{WORDS["assistant.chip.gone"]}</Text>;
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
            <div
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
            {table ? (
                <Button
                    variant="subtle"
                    color="gray"
                    size="compact-xs"
                    onClick={() => {
                        void session?.selection.apply(target, "replace", { cause: "user" }).then(({ nodes, edges }) => {
                            store.set({ dockOpen: true, dockTab: nodes === 0 && edges > 0 ? "edges" : "nodes" });
                        });
                    }}
                >
                    {WORDS["assistant.table"]}
                </Button>
            ) : null}
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
 * @returns The row, or nothing for an effect that names no elements
 */
export function ResultRow({
    effect,
    table = false,
}: Readonly<{ effect: AiEffect; table?: boolean }>): React.JSX.Element | null {
    if (effect.code === "AI_EFFECT_EMPTY") {
        return (
            <Group gap={4} wrap="nowrap">
                <GLYPHS.warning size={12} aria-hidden />
                <Text size="sm">{emptyWords(effect.params.searched)}</Text>
            </Group>
        );
    }
    return effect.target === undefined ? null : (
        <ChipRow target={effect.target} kinds={kindsOf(effect)} table={table} />
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
    /** Opens the turn's steps. */
    readonly onMore: () => void;
}

/**
 * What a turn did to the graph: one line per effect, up to three, then the links to the real editor
 * and Undo on the newest step only. Once no step of the message stands, it reads Undone.
 * @param props - Component props
 * @param props.changes - the turn's changes
 * @param props.provenance - the id its steps carry
 * @param props.undone - whether none of its changes stands
 * @param props.onMore - opens the turn's steps
 * @returns The rows
 */
export function ChangeRows({ changes, provenance, undone, onMore }: Readonly<ChangeRowsProps>): React.JSX.Element {
    const { store, session, run } = useWorkspace();
    useVisibilityVersion(session);
    const next = session?.history.nextUndo;
    const newest = next?.kind === "undo" && provenance !== undefined && next.step.provenance.message === provenance;
    const lines = changes.map((effect) => effectLine(session, effect));
    const excluded = excludedLine(changes);
    const layer = changes.find((effect) => effect.params.layer !== undefined)?.params.layer;
    const ran = changes.find((effect) => effect.params.run !== undefined)?.params.run;
    return (
        <div className="ws-assistant-change">
            {lines.slice(0, MAX_LINES).map((line, index) => (
                // A turn's lines never reorder.
                <Text key={index} size="sm">
                    {line}
                </Text>
            ))}
            {lines.length > MAX_LINES ? (
                <Button variant="subtle" color="gray" size="compact-xs" onClick={onMore}>
                    {moreWords(lines.length - MAX_LINES)}
                </Button>
            ) : null}
            {excluded === null ? null : <Text size="sm">{excluded}</Text>}
            <Group gap={4} justify="space-between">
                <Group gap={4}>
                    {layer === undefined || undone ? null : (
                        <Button
                            variant="subtle"
                            color="gray"
                            size="compact-xs"
                            onClick={() => {
                                store.set({ inspected: { kind: "layer-row", id: String(layer) } });
                            }}
                        >
                            {WORDS["assistant.open-layer"]}
                        </Button>
                    )}
                    {ran === undefined || undone ? null : (
                        <Button
                            variant="subtle"
                            color="gray"
                            size="compact-xs"
                            onClick={() => {
                                store.set({ inspected: { kind: "run-row", id: String(ran) } });
                            }}
                        >
                            {WORDS["assistant.open-run"]}
                        </Button>
                    )}
                </Group>
                {newest ? (
                    <Button
                        variant="default"
                        size="compact-xs"
                        onClick={() => {
                            run("history.undo");
                        }}
                    >
                        {WORDS["assistant.undo"]}
                    </Button>
                ) : null}
                {undone ? <Text size="sm">{WORDS["assistant.undone"]}</Text> : null}
            </Group>
        </div>
    );
}
