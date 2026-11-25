import "../selection/selection.css";
import "./source-steps.css";

import { ControlSection } from "@graphty/compact-mantine";
import type { GraphSession, SourceDraft, SourceKey } from "@graphty/graphty-element/session";
import { Button, Group, Stack, Text } from "@mantine/core";
import React, { type RefObject, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { sourceStepsOn } from "../features";
import { focusIsLost } from "../frame/focus";
import { isTypingTarget, matchesKey } from "../keys/keys";
import { cardPalette } from "../selection/cardPalette";
import { usePreviewCanvas } from "../selection/previewCanvas";
import { useSessionEvents } from "../sessionEvents";
import type { JoinWorkspaceOpen } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { commitWorkspace } from "./actions";
import { nameOf, namingLines, rowNames, sideChoices, type SourceNames, sourceNames, spaceName } from "./cardWords";
import { JoinCardBody, RemoveButton } from "./JoinCard";
import { isHalf, type JoinCardView, type OpenCard } from "./joinCards";
import { JoinHead, JoinKey } from "./JoinHead";
import { JoinList, type JoinListRow } from "./JoinList";
import { JoinPane, type Picked, type RowsView, type TableShows } from "./JoinPane";
import {
    DELETE_KEY,
    JOIN_WORKSPACE_KEY,
    READER_EDITS_KEY,
    SIDE_KEY,
    WORKSPACE_REDO_KEY,
    WORKSPACE_UNDO_KEY,
} from "./keys";
import { ReaderEdits } from "./ReaderEdits";
import { StagedRows } from "./StagedFields";
import { type FirstCards, type JoinCards, useJoinCards } from "./useJoinCards";
import { refusedWords, WORKSPACE_WORDS } from "./words";
import {
    addCardId,
    changesOf,
    firstCards,
    hasPane,
    MERGED_COLOR,
    NEW_COLOR,
    newNodeIds,
    REMOVED_COLOR,
    stepsOf,
    waitingIn,
} from "./workspaceCards";
import { AddStepBody, RemoveStrip, TableActions } from "./WorkspaceParts";

/** The element's events after which the workspace reads its draft again. */
const DRAFT_EVENTS = ["data:draft-changed"] as const;

/** Lists, menus and popovers close themselves on Escape: never the workspace too. */
const SELF_CLOSING =
    "[data-portal], [data-popout-portal-container], .mantine-Combobox-dropdown, .mantine-Popover-dropdown";

/** What can take focus over the workspace: lists, menus, popovers, and a dialog of its own. */
const OVER_THE_WORKSPACE = `${SELF_CLOSING}, [role=dialog]:not(.jw-modal), [role=alertdialog]`;

/** The key's colors, upper case, which no card takes. */
const KEY_COLORS: ReadonlySet<string> = new Set([MERGED_COLOR, NEW_COLOR, REMOVED_COLOR].map((c) => c.toUpperCase()));

/** No elements picked. */
const NO_REFS: Picked["refs"] = [];

/**
 * Whether a key press lands in a field text is typed into: a list's own box, which only picks, is not one.
 * @param target - what the key was pressed in
 * @returns true when it does
 */
function typesText(target: HTMLElement): boolean {
    return isTypingTarget(target) && !(target instanceof HTMLInputElement && target.readOnly);
}

/**
 * Keeps the modal's keys working from the moment it opens, whatever an undo or a removed card took focus
 * away with, and gives focus back where the workspace was opened from. Checked after every render, and
 * whenever focus moves.
 * @param live - whether the workspace is open
 * @param box - the modal
 */
function useModalFocus(live: boolean, box: RefObject<HTMLElement | null>): void {
    const opener = useRef<Element | null>(null);
    useEffect(() => {
        if (!live) {
            return undefined;
        }
        const keep = (): void => {
            const now = document.activeElement;
            const inside = box.current?.contains(now) === true || now?.closest(OVER_THE_WORKSPACE) !== null;
            if (box.current !== null && !inside) {
                box.current.focus();
            }
        };
        opener.current ??= document.activeElement;
        // A press on another control blurs this one first, which can write its card: the focus still on its
        // way to the pressed control is never taken.
        const settled = setTimeout(keep, 0);
        document.addEventListener("focusin", keep);
        return () => {
            clearTimeout(settled);
            document.removeEventListener("focusin", keep);
        };
    });
    useEffect(
        () => () => {
            if (opener.current instanceof HTMLElement && focusIsLost()) {
                opener.current.focus();
            }
        },
        [],
    );
}

/**
 * Frames the preview again only when a card adds nodes out of view: the reader's own place is kept else.
 * @param draft - the open draft
 */
function useFrameNew(draft: SourceDraft): void {
    const { element } = useWorkspace();
    const added = draft.preview().marks.nodes.new;
    const shown = useRef(0);
    useEffect(() => {
        const more = added > shown.current;
        shown.current = added;
        if (!more || element === null) {
            return undefined;
        }
        let current = true;
        void draft
            .display(true, { hold: true })
            .then(async () => element.waitForSettled())
            .then(() => {
                const away =
                    current &&
                    draft.open &&
                    draft.side === "after" &&
                    newNodeIds(draft).some((id) => element.nodeScreenPosition(id)?.visible === false);
                if (away) {
                    element.zoomToFit();
                }
            });
        return () => {
            current = false;
        };
    }, [added, draft, element]);
}

/**
 * The preview: the reader's graph as it is, what each card's step changes in the card's color, and the
 * rows picked in the table alone at full strength.
 * @param session - the element's session
 * @param draft - the open draft
 * @param cards - the cards
 * @param colorOf - a card's color, by its place
 * @param colors - whether each card has a color
 * @param marked - the rows picked
 * @param version - counts the draft's changes
 */
function useCardColors(
    session: GraphSession,
    draft: SourceDraft,
    cards: readonly JoinCardView[],
    colorOf: (at: number) => string,
    colors: boolean,
    marked: Picked["refs"],
    version: unknown,
): void {
    useEffect(() => {
        if (!colors) {
            return undefined;
        }
        const all = draft.steps();
        const steps = cards.flatMap((card, at) =>
            stepsOf(all, card.step).map((step) => ({ step, color: colorOf(at) })),
        );
        const shown = session.styles.showDraft({
            merged: MERGED_COLOR,
            new: NEW_COLOR,
            removed: REMOVED_COLOR,
            steps,
            ...(marked.length > 0 ? { mark: { refs: marked } } : {}),
        });
        return () => {
            shown.end();
        };
        // The view reads the draft when shown: it is shown again after every draft change.
    }, [draft, colors, version, marked, session]); // eslint-disable-line react-hooks/exhaustive-deps -- cards and colors are read from the draft, which `version` follows
}

/**
 * How the waiting sources a card names are read, until a step of the draft adds them.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.draft - the open draft
 * @param props.names - the sources' names
 * @param props.waiting - the sources
 * @param props.onError - shows a refusal on the card
 * @returns a folded section each
 */
function ReadSettings({
    session,
    draft,
    names,
    waiting,
    onError,
}: Readonly<{
    session: GraphSession;
    draft: SourceDraft;
    names: SourceNames;
    waiting: readonly SourceKey[];
    onError: (error: unknown) => void;
}>): React.JSX.Element {
    const staged = session.data.staged().filter((each) => waiting.includes(each.key));
    return (
        <>
            {staged.map((source) => (
                <ControlSection
                    key={source.key}
                    label={WORKSPACE_WORDS.readAs(nameOf(names, source.key))}
                    defaultOpened={false}
                >
                    <StagedRows
                        session={session}
                        reader={draft}
                        source={source}
                        full
                        write={(next) => {
                            try {
                                draft.setMapping(source.key, next);
                            } catch (error) {
                                onError(error);
                            }
                        }}
                    />
                </ControlSection>
            ))}
        </>
    );
}

/**
 * The one waiting source a card names and nothing else, which can be added as it is.
 * @param card - the card
 * @param waiting - the waiting sources it names
 * @returns the source, or null
 */
function aloneIn(card: OpenCard, waiting: readonly SourceKey[]): SourceKey | null {
    const [{ a, b }] = card.lines;
    const sides = [a.side, b.side].filter((side) => side !== null);
    const alone = card.step === null && card.lines.length === 1 && b.isNew !== true && sides.length === 1;
    return alone && waiting.length === 1 ? waiting[0] : null;
}

/** What the left column's editor takes. */
interface EditorProps {
    readonly session: GraphSession;
    readonly draft: SourceDraft;
    readonly names: SourceNames;
    readonly joins: JoinCards;
    readonly shows: TableShows | null;
    readonly picked: Picked | null;
    readonly removable: boolean;
    readonly onShows: (shows: TableShows) => void;
    readonly onLine: (at: number) => void;
    readonly onPicked: () => void;
    readonly onRemove: () => void;
}

/**
 * The selected card's editor.
 * @param props - Component props
 * @returns the editor
 */
function CardEditor(props: EditorProps & Readonly<{ card: OpenCard }>): React.JSX.Element {
    const { card, session, draft, names, joins, shows, picked, removable } = props;
    const { onShows, onLine, onPicked, onRemove } = props;
    // A waiting source read as edges whose ends are not both picked yet: nothing reads it so until they are.
    const unfinishedEnds = useWorkspaceState((state) => state.stagedEnds)?.source;
    const waiting = card.step === null ? waitingIn(session, draft, card.lines) : [];
    const alone = aloneIn(card, waiting);
    const lists = card.step !== null && shows?.step === card.step.index;
    return (
        <JoinCardBody
            session={session}
            draft={draft}
            names={names}
            card={card}
            choices={sideChoices(session, draft)}
            outcomes={joins.outcomes}
            suggestions={joins.suggestions}
            removable={removable}
            error={joins.errors[card.id]}
            addAsIs={
                alone === null ? null : (
                    <Group>
                        <Button
                            size="compact-xs"
                            variant="default"
                            disabled={unfinishedEnds === alone}
                            onClick={() => {
                                joins.addAsIs(alone);
                            }}
                        >
                            {WORKSPACE_WORDS.addAsIs}
                        </Button>
                    </Group>
                )
            }
            readSettings={
                <ReadSettings
                    session={session}
                    draft={draft}
                    names={names}
                    waiting={waiting}
                    onError={joins.refuse(card.id)}
                />
            }
            tableActions={
                card.step !== null && (card.step.except !== null || lists) ? (
                    <TableActions
                        draft={draft}
                        step={card.step}
                        column={lists && shows.kind === "cells" ? shows.column : null}
                        rows={lists ? (picked?.rows ?? []) : []}
                        refs={picked?.refs ?? NO_REFS}
                        onDone={onPicked}
                        onError={joins.refuse(card.id)}
                    />
                ) : null
            }
            onLines={joins.setLines}
            onIgnore={joins.setIgnoring}
            onOutcome={joins.pick}
            onSet={joins.set}
            onPatch={joins.patch}
            onLine={onLine}
            onShowCells={(step, column) => {
                onShows({ kind: "cells", step, column, only: "all" });
            }}
            onShowRows={(step, bucket) => {
                onShows({ kind: "rows", step, bucket });
            }}
            onRemove={onRemove}
        />
    );
}

/**
 * The editor of what is selected: a join's card, or a source added here.
 * @param props - Component props
 * @returns the editor, or nothing while nothing is selected
 */
function Editor(props: EditorProps): React.JSX.Element | null {
    const { session, draft, names, joins, onRemove } = props;
    const { openCard, openAdd, errors, refuse } = joins;
    if (openCard !== undefined) {
        return <CardEditor key={openCard.id} {...props} card={openCard} />;
    }
    if (openAdd === undefined) {
        return null;
    }
    const id = addCardId(openAdd.index);
    const error = errors[id];
    return (
        <Stack gap={8} className="jw-card" data-join-editor={id}>
            <AddStepBody
                draft={draft}
                step={openAdd}
                spaceName={(space) => spaceName(session, draft, names, space)}
                onError={refuse(id)}
            />
            {error === undefined ? null : (
                <Text size="xs" c="red" role="alert">
                    {error}
                </Text>
            )}
            <RemoveButton onRemove={onRemove} />
        </Stack>
    );
}

/**
 * The list's lines: sources added here and joins, in step order, what is not written yet last.
 * @param session - the element's session
 * @param draft - the open draft
 * @param names - the sources' names
 * @param joins - the cards
 * @param colorOf - a card's color, by its place, or null while no card has one
 * @returns the lines
 */
function listRows(
    session: GraphSession,
    draft: SourceDraft,
    names: SourceNames,
    joins: JoinCards,
    colorOf: ((at: number) => string) | null,
): readonly JoinListRow[] {
    const steps = draft.steps();
    const named = rowNames(
        session,
        names,
        joins.cards.map((card) => namingLines(steps, card)),
    );
    const rows = [
        ...joins.addSteps.map((step) => ({
            at: step.index,
            id: addCardId(step.index),
            name: `${nameOf(names, step.source)}, ${WORKSPACE_WORDS.added}`,
        })),
        ...joins.cards.map((card, at) => ({
            at: card.step?.index ?? Number.POSITIVE_INFINITY,
            id: card.id,
            name: named[at],
            ...(colorOf === null ? {} : { color: colorOf(at) }),
        })),
    ];
    return rows.sort((x, y) => (x.at === y.at ? 0 : x.at - y.at));
}

/**
 * Escape in the workspace: a field gives up what was typed, then its focus; else the workspace closes. A
 * list, a menu or a popover closes itself.
 * @param event - the key press
 * @param box - the modal
 * @param cancel - closes the workspace
 */
function escape(event: React.KeyboardEvent<HTMLElement>, box: HTMLElement | null, cancel: () => void): void {
    const target = event.target as HTMLElement;
    if (event.defaultPrevented || target.closest(SELF_CLOSING) !== null || target.matches("[aria-expanded=true]")) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (typesText(target)) {
        queueMicrotask(() => {
            box?.focus();
        });
    } else {
        cancel();
    }
}

/** What the open workspace takes. */
interface BodyProps {
    readonly session: GraphSession;
    readonly draft: SourceDraft;
    readonly first: FirstCards;
    readonly box: RefObject<HTMLDialogElement | null>;
    readonly frame: HTMLElement;
    readonly drawing: boolean;
    readonly version: unknown;
    readonly onCommitted: (changes: boolean) => void;
    readonly onClose: () => void;
}

/**
 * The open workspace over its draft.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.draft - the open draft
 * @param props.first - what it opens on
 * @param props.box - the modal
 * @param props.frame - what it is drawn over
 * @param props.drawing - whether the first drawing is on its way
 * @param props.version - counts the draft's changes
 * @param props.onCommitted - Done is on its way, and whether it changes the graph
 * @param props.onClose - closes it
 * @returns the modal
 */
function WorkspaceBody({
    session,
    draft,
    first,
    box,
    frame,
    drawing,
    version,
    onCommitted,
    onClose,
}: BodyProps): React.JSX.Element {
    const { store, element } = useWorkspace();
    const titleId = useId();
    // on reload: fresh: pointer: what the table lists for a look
    const [shows, setShows] = useState<TableShows | null>(null);
    // on reload: fresh: pointer: how the two sources' rows are shown
    const [view, setView] = useState<RowsView>({ card: "", line: 0, only: "all" });
    // on reload: fresh: pointer: the Reader edits list opened for a look
    const [editsOpen, setEditsOpen] = useState(false);
    // on reload: fresh: pointer: the rows picked for a look
    const [pickedRows, setPickedRows] = useState<Picked | null>(null);
    // on reload: fresh: pointer: the preview's look, picked for a look
    const [colors, setColors] = useState(true);
    const unfinishedEnds = useWorkspaceState((state) => state.stagedEnds)?.source;
    const joins = useJoinCards(session, draft, first, version, () => {
        // Another card's rows are not this one's.
        setShows(null);
        setPickedRows(null);
    });
    const { openCard } = joins;
    const names = sourceNames(session);
    // Cards never take the key's colors, so a color names either a card or what the commit does.
    const palette = (session.scope.options.branchPalette ?? cardPalette(session.catalog.palettes())).filter(
        (color) => !KEY_COLORS.has(color.toUpperCase()),
    );
    const colorOf = (at: number): string => palette[at % Math.max(1, palette.length)] ?? MERGED_COLOR;
    // Rows picked in another list are not this one's.
    const list = JSON.stringify(shows);
    const picked = pickedRows?.list === list ? pickedRows : null;
    const marked = picked?.refs ?? NO_REFS;
    useCardColors(session, draft, joins.cards, colorOf, colors, marked, version);
    useFrameNew(draft);

    const { marks, sources } = draft.preview();
    const rows = listRows(session, draft, names, joins, colors ? colorOf : null);
    const removable =
        joins.openAdd !== undefined ||
        (openCard !== undefined &&
            (rows.length > 1 || openCard.step !== null || openCard.lines.some((line) => isHalf(line))));
    const listed = openCard !== undefined && shows?.step === openCard.step?.index ? shows : null;
    const pane = openCard !== undefined && hasPane(openCard, listed);

    const toggleEdits = (): void => {
        setEditsOpen((now) => !now);
    };
    const remove = (): void => {
        if (joins.open !== null && removable) {
            joins.remove(joins.open);
            // The pressed button goes with its card: keys stay in the workspace.
            box.current?.focus();
        }
    };
    const move = (make: () => boolean): void => {
        joins.move(make);
        setPickedRows(null);
    };
    const undo = (): void => {
        move(() => draft.undo());
    };
    const redo = (): void => {
        move(() => draft.redo());
    };
    const cancel = (): void => {
        draft.dispose();
        onClose();
    };
    const done = (): void => {
        if (joins.stopsDone(unfinishedEnds)) {
            return;
        }
        const changes = changesOf(marks) > 0;
        void commitWorkspace(store, session, draft, joins.refuse("")).then((ok) => {
            if (ok) {
                onCommitted(changes);
                onClose();
            }
        });
    };
    const frameMarked = (): void => {
        const step = openCard?.step ?? null;
        const query = step === null ? null : ({ step: step.index, bucket: "merged" } as const);
        const what = marked.length > 0 ? { refs: marked } : query;
        const ids = what === null ? null : draft.preview().ids(what);
        if (ids !== null && ids.nodes.length > 0) {
            void element?.zoomToNodes([...ids.nodes]);
        } else {
            element?.zoomToFit();
        }
    };
    const keys = (event: React.KeyboardEvent<HTMLElement>): void => {
        const target = event.target as HTMLElement;
        if (event.key === "Escape") {
            escape(event, box.current, cancel);
            return;
        }
        // An open list takes its own keys; a key a list row answered is answered.
        const own = target.matches("[aria-expanded=true][role=combobox], [data-expanded]");
        if (event.defaultPrevented || typesText(target) || own) {
            return;
        }
        const bound: readonly (readonly [string, () => void])[] = [
            [WORKSPACE_UNDO_KEY, undo],
            [WORKSPACE_REDO_KEY, redo],
            [JOIN_WORKSPACE_KEY, joins.add],
            [SIDE_KEY, () => void draft.show(draft.side === "after" ? "before" : "after")],
            [DELETE_KEY, remove],
            [READER_EDITS_KEY, toggleEdits],
        ];
        const run = bound.find(([combo]) => matchesKey(event, combo))?.[1];
        if (run !== undefined) {
            event.preventDefault();
            event.stopPropagation();
            run();
        }
    };

    return createPortal(
        <>
            <div className="sel-ws-scrim" aria-hidden />
            <dialog // eslint-disable-line jsx-a11y/no-noninteractive-element-interactions -- only catches keys bubbling from its own controls
                ref={box}
                open
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="sel-ws sel-modal jw-modal"
                onKeyDown={keys}
            >
                <JoinHead
                    titleId={titleId}
                    draft={draft}
                    drawing={drawing}
                    colors={colors}
                    onColors={setColors}
                    onSide={(side) => {
                        void draft.show(side);
                    }}
                    onUndo={undo}
                    onRedo={redo}
                    onCancel={cancel}
                    onDone={done}
                />
                <JoinKey marks={marks} colors={colors} />
                <div className="sel-ws-body">
                    <div className="sel-ws-cards jw-left">
                        <div className="jw-list">
                            {sources
                                .filter((each) => each.state === "removed")
                                .map(({ source }) => (
                                    <RemoveStrip
                                        key={source}
                                        session={session}
                                        names={names}
                                        draft={draft}
                                        source={source}
                                    />
                                ))}
                            <JoinList rows={rows} current={joins.open} onSelect={joins.select} onAdd={joins.add} />
                        </div>
                        <div className="jw-editor">
                            <Editor
                                session={session}
                                draft={draft}
                                names={names}
                                joins={joins}
                                shows={listed}
                                picked={picked}
                                removable={removable}
                                onShows={setShows}
                                onLine={(line) => {
                                    setShows(null);
                                    setView({ card: openCard?.id ?? "", line, only: view.only });
                                }}
                                onPicked={() => {
                                    setPickedRows(null);
                                }}
                                onRemove={remove}
                            />
                            <ReaderEdits
                                session={session}
                                draft={draft}
                                open={editsOpen}
                                onToggle={toggleEdits}
                                onError={joins.refuse("")}
                            />
                            {joins.errors[""] === undefined ? null : (
                                <Text size="xs" c="red" role="alert">
                                    {joins.errors[""]}
                                </Text>
                            )}
                        </div>
                    </div>
                    <div className="sel-ws-center" {...(pane ? { "data-strip": "" } : {})}>
                        <div className="sel-ws-preview" />
                        {pane ? (
                            <JoinPane
                                session={session}
                                draft={draft}
                                names={names}
                                card={openCard}
                                shows={listed}
                                view={view}
                                suggestions={joins.suggestions}
                                picked={picked?.ids ?? []}
                                onShows={(next) => {
                                    setShows(next);
                                    setPickedRows(null);
                                }}
                                onView={setView}
                                onPick={(next) => {
                                    setPickedRows({ ...next, list });
                                }}
                                onLines={joins.setLines}
                                onFrame={frameMarked}
                            />
                        ) : null}
                    </div>
                </div>
            </dialog>
        </>,
        frame,
    );
}

/**
 * The join workspace (issue #9796, behind the source-steps experiment): a near-full-screen modal
 * built like the selection workspace, with a list of the joins and the selected one's editor on the
 * left, the graph preview over the two sources' rows on the right. One source draft holds every card;
 * nothing reaches the graph until Done, which commits them all as one undo step; Cancel (Esc) throws the
 * draft away.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.how - how it opened: the first card's source or node kind, a committed join, or a removal
 * @returns the modal, drawn over the canvas column
 */
function JoinWorkspace({
    session,
    how,
}: Readonly<{ session: GraphSession; how: JoinWorkspaceOpen }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const box = useRef<HTMLDialogElement>(null);
    // on reload: fresh: in flight: the draft being edited; autosave keeps it, and the next opening picks it up
    const [opened, setOpened] = useState<{ readonly draft: SourceDraft; readonly first: FirstCards } | null>(null);
    const draft = opened?.draft ?? null;
    // Opened after the first render: opening a draft tells every listener, which must not happen while rendering.
    // Once: StrictMode's development-only rerun must not open it a second time over the first.
    const openedOnce = useRef(false);
    useEffect(() => {
        if (openedOnce.current) {
            return;
        }
        openedOnce.current = true;
        try {
            // An open draft (from any door, or brought back by a reload) is adopted; a new one asks
            // the key-overlap question when a staged source is added as it is.
            const adopted = session.data.currentDraft();
            const opening = adopted ?? session.data.draft({ askOverlap: true });
            // The draft holds the removal from here: a reload opens on the draft, undone or not.
            if (how.remove !== undefined && opening.steps().some((step) => step.source === how.remove)) {
                // A source its joins added goes with them: with nothing left to match, its rows wait again.
                opening.removeSource(how.remove, { adds: "remove" });
            }
            const out = opening
                .preview()
                .steps.find((step) => step.committed !== null && step.committed === how.without);
            if (out !== undefined) {
                opening.removeStep(out.index, { adds: "remove" });
            }
            setOpened({ draft: opening, first: firstCards(opening, how, adopted !== null) });
            // The draft holds it from here: a reload opens the workspace on the draft as it is.
            store.set({ joinWorkspace: {} });
        } catch (error) {
            store.set({ notice: { message: refusedWords(error), error: true }, joinWorkspace: false });
        }
    }, [session, how, store]);
    // on reload: fresh: in flight: the first drawing of the draft
    const [drawing, setDrawing] = useState(true);
    const version = useSessionEvents(session, DRAFT_EVENTS);
    const frame = typeof document === "undefined" ? null : document.querySelector<HTMLElement>(".ws-body");
    // Done left another graph than the one the workspace opened on.
    const changed = useRef(false);
    const refit = useCallback(() => changed.current, []);
    usePreviewCanvas(draft !== null, box, frame, refit);

    // The draft is drawn After while the workspace is open, the reader's own graph held where it is;
    // closing by any door throws it away.
    // Decided a microtask later: StrictMode's development-only rerun mounts the workspace again
    // first, and must find its draft still open (as the selection workspace does).
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        if (draft === null) {
            return undefined;
        }
        void draft.display(true, { hold: true }).then(() => {
            setDrawing(false);
        });
        return () => {
            mounted.current = false;
            queueMicrotask(() => {
                if (!mounted.current && draft.open) {
                    draft.dispose();
                }
            });
        };
    }, [draft]);

    const live = draft?.open === true;
    useModalFocus(live, box);
    // A draft gone by another door (a project opened, the graph cleared) closes the workspace.
    useEffect(() => {
        if (draft !== null && !live) {
            store.set({ joinWorkspace: false });
        }
    }, [draft, live, version, store]);

    return opened === null || !live || frame === null ? null : (
        <WorkspaceBody
            session={session}
            draft={opened.draft}
            first={opened.first}
            box={box}
            frame={frame}
            drawing={drawing}
            version={version}
            onCommitted={(changes) => {
                changed.current = changes;
            }}
            onClose={() => {
                store.set({ joinWorkspace: false });
            }}
        />
    );
}

/**
 * The join workspace while the store says it is open and the source-steps experiment is on.
 * @returns the workspace, or nothing
 */
export function JoinWorkspaceHost(): React.JSX.Element | null {
    const { session } = useWorkspace();
    const opened = useWorkspaceState((state) => state.joinWorkspace);
    return opened !== false && session !== null && sourceStepsOn(session) ? (
        <JoinWorkspace session={session} how={opened} />
    ) : null;
}
