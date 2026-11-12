/**
 * The Data place's Calculated tab (the `selection-workspace` experiment, issue #5805): every result
 * the session holds, wherever it was started -- Analyze or a selection's card -- as graphty-element
 * lists its runs. A row at rest is its value type's icon, its name and, only when they apply, quiet
 * marks: how many styles and how many filters use it, each by its own glyph, and an icon when it ran
 * over something other than what is showing or is out of date. A press opens it in the inspector;
 * its "..." (on hover or focus, or a right click) holds Apply style and Remove; removing a result
 * something uses asks first, naming them, and the selections then wait for Run (design: algo-options cardruns.md, rules 3 to 5).
 */

import { ContextMenu, MenuShortcut, ModalFooter } from "@graphty/compact-mantine";
import type { GraphSession, Run, RunReader } from "@graphty/graphty-element/session";
import { ActionIcon, Badge, Button, Group, Menu, Modal, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useState } from "react";

import { selectionWorkspaceOn } from "../features";
import { GLYPHS } from "../glyphs";
import { useSessionVersion } from "../inspector/hooks";
import { staleWords } from "../inspector/words";
import { ariaKey, formatKey } from "../keys/keys";
import { ranOverWords, runName } from "../runWords";
import { type SelectionMenuItem, SelectionMenuItems } from "../selection/SelectionMenu";
import type { WorkspaceStore } from "../state/store";
import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { unitOf } from "../time/timeActions";
import { namesOnce } from "./words";

/**
 * What a selection that reads a result goes by: its layer's name, or its filter's name or "Filter".
 * @param session - the element's session.
 * @param reader - the selection.
 * @returns the name.
 */
function readerName(session: GraphSession, reader: RunReader): string {
    if (reader.kind === "layer") {
        return session.styles.get(reader.id)?.name ?? reader.id;
    }
    // A filter goes by the name the reader gave it, else "Filter".
    return session.visibility.conditions.find((each) => each.id === reader.id)?.name ?? "Filter";
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
        Glyph = GLYPHS.ranOver;
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
 * One quiet mark of what uses a result: the users' own glyph (a style's brush, a filter's funnel)
 * and how many, its tooltip and its name naming them.
 * @param props - Component props
 * @param props.kind - what uses it
 * @param props.names - the users' names
 * @returns the mark, or nothing when none
 */
function UsesMark({
    kind,
    names,
}: Readonly<{ kind: "style" | "filter"; names: readonly string[] }>): React.JSX.Element | null {
    if (names.length === 0) {
        return null;
    }
    const Glyph = kind === "style" ? GLYPHS.layer : GLYPHS.filter;
    const said = `${kind === "style" ? "Styles" : "Filters"}: ${namesOnce(names)}`;
    return (
        <Tooltip label={said} multiline maw={240}>
            <span // NOSONAR(S6819): an icon and its count, named as one image; there is no <img> to use
                className="dp-run-uses"
                data-run-uses={kind}
                role="img"
                aria-label={said}
            >
                <Glyph size={12} aria-hidden />
                {names.length}
            </span>
        </Tooltip>
    );
}

/**
 * A result's value type as its row's icon: a number, or groups.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.run - the result
 * @returns the icon
 */
function ResultGlyph({ session, run }: Readonly<{ session: GraphSession; run: Run }>): React.JSX.Element {
    const primary = session.results.path(run.id);
    const field = run.fields.find((each) => session.results.path(run.id, each.name) === primary);
    let Glyph = GLYPHS.run;
    if (field !== undefined) {
        const groups = field.measurement === "categorical" || field.type === "string" || field.type === "boolean";
        Glyph = groups ? GLYPHS.category : GLYPHS.number;
    }
    return (
        <span className="dp-run-glyph">
            <Glyph size={14} aria-hidden />
        </span>
    );
}

/**
 * One result's row.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.store - the workspace store, which the inspector reads
 * @param props.run - the result
 * @param props.inspected - whether the inspector shows it
 * @returns the row
 */
function ResultRow({
    session,
    store,
    run,
    inspected,
}: Readonly<{ session: GraphSession; store: WorkspaceStore; run: Run; inspected: boolean }>): React.JSX.Element {
    const [asking, setAsking] = useState(false);
    const name = runName(session, run);
    const readers = session.runs.readers(run.id);
    const layers = session.runs.bindings(run.id);
    const styles = [
        ...layers.map((id) => session.styles.get(id)?.name ?? id),
        ...readers.filter((reader) => reader.kind === "layer").map((reader) => readerName(session, reader)),
    ];
    const filters = readers.filter((reader) => reader.kind !== "layer").map((reader) => readerName(session, reader));
    const users = [...styles, ...filters];
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
                    <div className="dp-run-head" data-selected={inspected ? "" : undefined}>
                        {/* The row opens the result in the inspector, as a Figma layer row opens what it is. */}
                        <UnstyledButton
                            className="dp-run-main"
                            aria-current={inspected ? "true" : undefined}
                            onClick={() => {
                                store.set({ inspected: { kind: "measure-row", id: run.id } });
                            }}
                        >
                            <ResultGlyph session={session} run={run} />
                            <Text size="sm" truncate span className="dp-run-name">
                                {name}
                            </Text>
                            <UsesMark kind="style" names={styles} />
                            <UsesMark kind="filter" names={filters} />
                            <StateMark session={session} run={run} />
                        </UnstyledButton>
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
                <div data-confirm-remove="">
                    <Stack gap={6}>
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
                </div>
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
    const { session, store } = useWorkspace();
    useSessionVersion(session);
    const analyze = useCommand("analyze.open");
    const open = useWorkspaceState((state) =>
        state.inspected?.kind === "measure-row" || state.inspected?.kind === "run-row" ? state.inspected.id : null,
    );
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
                    rightSection={key === undefined ? undefined : <MenuShortcut>{formatKey(key)}</MenuShortcut>}
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
                <ResultRow key={run.id} session={session} store={store} run={run} inspected={open === run.id} />
            ))}
        </Stack>
    );
}
