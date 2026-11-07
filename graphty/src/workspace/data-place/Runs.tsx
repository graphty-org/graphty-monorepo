/**
 * The Data place's Calculated tab (the `selection-workspace` experiment, issue #5805): every result
 * the session holds, wherever it was started -- Analyze or a selection's card -- as graphty-element
 * lists its runs. A row at rest is its name and, only when they apply, two quiet marks: how many
 * things use it (style layers that draw it, selections that read it), and an icon when it ran over
 * something other than what is showing or is out of date. Its "..." (on hover or focus, or a right
 * click) holds Apply style and Remove; removing a result something uses asks first, naming them,
 * and the selections then wait for Run (design: algo-options cardruns.md, rules 3 to 5).
 */

import { ContextMenu, ModalFooter } from "@graphty/compact-mantine";
import type { GraphSession, Run, RunReader } from "@graphty/graphty-element/session";
import { ActionIcon, Badge, Button, Group, Kbd, Menu, Modal, Stack, Text, Tooltip } from "@mantine/core";
import React, { useState } from "react";

import { selectionWorkspaceOn } from "../features";
import { GLYPHS } from "../glyphs";
import { useSessionVersion } from "../inspector/hooks";
import { staleWords } from "../inspector/words";
import { ariaKey, formatKey } from "../keys/keys";
import { ranOverWords, runName } from "../runWords";
import { type SelectionMenuItem, SelectionMenuItems } from "../selection/SelectionMenu";
import { useCommand, useWorkspace } from "../state/WorkspaceContext";
import { unitOf } from "../time/timeActions";

/**
 * What a selection that reads a result goes by: its layer's name, or "Filter".
 * @param session - the element's session.
 * @param reader - the selection.
 * @returns the name.
 */
function readerName(session: GraphSession, reader: RunReader): string {
    return reader.kind === "layer" ? (session.styles.get(reader.id)?.name ?? reader.id) : "Filter";
}

/**
 * A chip naming a selection that reads the result.
 * @param props - Component props
 * @param props.name - the selection's name
 * @returns the chip
 */
function SelectionChip({ name }: Readonly<{ name: string }>): React.JSX.Element {
    return (
        <Badge size="sm" variant="light" color="gray" leftSection={<GLYPHS.selection size={10} aria-hidden />}>
            {name}
        </Badge>
    );
}

/**
 * The quiet mark of a result in an unusual state: out of date, or run over something other than
 * what is showing. Nothing for a result run over what is showing and still current.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.run - the result
 * @returns the mark, or nothing
 */
function StateMark({ session, run }: Readonly<{ session: GraphSession; run: Run }>): React.JSX.Element | null {
    let words: string;
    let Glyph = GLYPHS.outOfDate;
    if (run.status === "succeeded" && run.stale !== null) {
        words = staleWords(run.stale, unitOf(session));
    } else if (run.scope.spec === "visible") {
        return null;
    } else {
        const over = ranOverWords(session, run.scope.spec, run.scope.nodeCount);
        words = over.charAt(0).toUpperCase() + over.slice(1);
        Glyph = GLYPHS.everything;
    }
    return (
        <Tooltip label={words}>
            <span // NOSONAR(S6819): an icon drawn by a component, named as one image; there is no <img> to use
                className="dp-run-mark"
                role="img"
                aria-label={words}
            >
                <Glyph size={12} aria-hidden />
            </span>
        </Tooltip>
    );
}

/**
 * One result's row.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.run - the result
 * @returns the row
 */
function ResultRow({ session, run }: Readonly<{ session: GraphSession; run: Run }>): React.JSX.Element {
    const [asking, setAsking] = useState(false);
    const name = runName(session, run);
    const readers = session.runs.readers(run.id);
    const layers = session.runs.bindings(run.id);
    const users = [
        ...layers.map((id) => session.styles.get(id)?.name ?? id),
        ...readers.map((reader) => readerName(session, reader)),
    ];
    const remove = (): void => {
        setAsking(false);
        session.runs.remove(run.id);
    };
    // Kept, greyed, once it draws: the reader learns where the action lives.
    let applyReason: string | null = layers.length > 0 ? "Already styled" : null;
    if (applyReason === null && run.status !== "succeeded") {
        applyReason = "Not finished";
    }
    const items: SelectionMenuItem[] = [
        {
            id: "apply-style",
            label: "Apply style",
            icon: "layer",
            group: "edit",
            reason: applyReason,
            onRun: () => {
                // The same result, painted now: its suggested layers, in one step.
                const again = session.runs.start(run.algorithm, run.params, {
                    scope: run.scope.spec,
                    applySuggestedStyles: true,
                });
                again.then(undefined, () => undefined);
            },
        },
        {
            id: "remove",
            label: "Remove result",
            icon: "delete",
            group: "remove",
            onRun: () => {
                // A result nothing draws or reads goes at once; anything else asks first.
                if (users.length === 0) {
                    remove();
                    return;
                }
                setAsking(true);
            },
        },
    ];
    const menu = <SelectionMenuItems items={items} />;
    return (
        <li className="dp-run" data-run={run.id}>
            <ContextMenu
                target={
                    <div className="dp-run-head">
                        <GLYPHS.analyze size={14} aria-hidden />
                        <Text size="sm" truncate className="dp-run-name">
                            {name}
                        </Text>
                        {users.length > 0 && (
                            <Tooltip label={users.join(", ")} multiline maw={240}>
                                <span // NOSONAR(S6819): an icon and its count, named as one image; there is no <img> to use
                                    className="dp-run-uses"
                                    data-run-uses=""
                                    role="img"
                                    aria-label={`Used by ${users.join(", ")}`}
                                >
                                    <GLYPHS.link size={12} aria-hidden />
                                    {users.length}
                                </span>
                            </Tooltip>
                        )}
                        <StateMark session={session} run={run} />
                        <Menu position="bottom-end" withinPortal>
                            <Menu.Target>
                                <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    className="dp-run-more"
                                    aria-label={`More for ${name}`}
                                >
                                    <GLYPHS.more size={14} aria-hidden />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>{menu}</Menu.Dropdown>
                        </Menu>
                    </div>
                }
            >
                {menu}
            </ContextMenu>
            <Modal
                opened={asking}
                onClose={() => {
                    setAsking(false);
                }}
                title={`Remove ${name}`}
                size="xs"
            >
                <Stack gap={6} data-confirm-remove="">
                    {layers.map((id) => (
                        <Group key={id} gap={6} wrap="nowrap" data-goes="">
                            <Badge
                                size="sm"
                                variant="light"
                                color="gray"
                                leftSection={<GLYPHS.layer size={10} aria-hidden />}
                            >
                                {session.styles.get(id)?.name ?? id}
                            </Badge>
                            <GLYPHS.delete size={12} aria-label="removed" />
                        </Group>
                    ))}
                    {readers.map((reader) => (
                        <Group key={`${reader.kind}:${reader.id}`} gap={6} wrap="nowrap" data-waits="">
                            <SelectionChip name={readerName(session, reader)} />
                            <GLYPHS.waiting size={12} aria-label="waits for Run" />
                        </Group>
                    ))}
                </Stack>
                <ModalFooter mt="md">
                    <Button
                        variant="default"
                        data-autofocus
                        onClick={() => {
                            setAsking(false);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button color="red" onClick={remove}>
                        Remove
                    </Button>
                </ModalFooter>
            </Modal>
        </li>
    );
}

/**
 * The Calculated tab's body, drawn only while the `selection-workspace` experiment is on: the
 * results, or with none, Analyze and its key.
 * @returns the list, or nothing.
 */
export function ResultsList(): React.JSX.Element | null {
    const { session } = useWorkspace();
    useSessionVersion(session);
    const analyze = useCommand("analyze.open");
    if (session === null || !selectionWorkspaceOn(session)) {
        return null;
    }
    const runs = session.runs.list().filter((run) => run.status !== "removed");
    if (runs.length === 0) {
        const key = analyze?.command.keys?.[0];
        return (
            <div className="dp-results-empty">
                <Button
                    size="compact-sm"
                    variant="default"
                    leftSection={<GLYPHS.analyze size={14} aria-hidden />}
                    rightSection={key === undefined ? undefined : <Kbd>{formatKey(key)}</Kbd>}
                    aria-keyshortcuts={key === undefined ? undefined : ariaKey(key)}
                    disabled={analyze?.disabledReason !== null}
                    onClick={() => analyze?.run()}
                >
                    Analyze
                </Button>
            </div>
        );
    }
    return (
        <Stack component="ul" role="list" aria-label="Results" gap={2} className="dp-runs">
            {runs.map((run) => (
                <ResultRow key={run.id} session={session} run={run} />
            ))}
        </Stack>
    );
}
