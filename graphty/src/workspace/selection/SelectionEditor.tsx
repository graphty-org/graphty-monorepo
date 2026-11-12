/**
 * The selection editor: one component for a style layer's Which nodes / Which edges and for an
 * import filter card (design/ui/selection-groups/spec.md, section 3). It is an outline and one
 * property pane, as Figma's Layers panel over its Design panel: the outline is the recipe at rest,
 * one 32 px line per row (the title and its count, a group's chit and letter, "All nodes", a step's
 * verb word, value, short test and tags); the pane under it holds the controls of the ONE selected
 * row. Nothing opens inline. A selection is graphty-element's `union` leaf; the element evaluates it
 * and reports every count, state and color (`scope.watchSteps`), and draws the group colors while
 * the reader picks (`styles.showBranches`); the editor only renders and hands each edit to its host
 * as the next rule.
 */

import "./selection.css";

import {
    CardList,
    type CardListItem,
    FieldCaret,
    focusWithRing,
    InlineRename,
    Popout,
    PopoutManager,
    SegmentedControl,
    TargetTooltip,
    ToggleIconButton,
} from "@graphty/compact-mantine";
import type {
    GraphSession,
    RuleTree,
    ScopeEdit,
    StepReading,
    StepsReading,
    UnionBranch,
    UnionLeaf,
    UnionStep,
} from "@graphty/graphty-element/session";
import {
    ActionIcon,
    Button,
    Group,
    InputBase,
    Loader,
    Menu,
    Stack,
    Text,
    Tooltip,
    UnstyledButton,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";

import { canFocus, focusInspectorTitle, focusIsLost, tabStops } from "../frame/focus";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { isTypingTarget, matchesKey, printable } from "../keys/keys";
import { useAnnounceChange } from "../state/useAnnounceChange";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { DrawnSwatches } from "../style/drawnSwatches";
import { AddCondition } from "../style/WhichPicker";
import { colorName } from "../style/words";
import { MatchesStrip } from "./MatchesStrip";
import {
    addBranch,
    addStep,
    duplicateBranch,
    duplicateStep,
    editBranch,
    editStep,
    moveBranch,
    moveStep,
    newSelection,
    newVerb,
    removeBranch,
    removeStep,
    type Verb,
} from "./model";
import { type SelectionMenuItem, SelectionMenuItems } from "./SelectionMenu";
import { StepPane } from "./StepPane";
import { useSteps } from "./useSteps";
import {
    type Host,
    isRelative,
    pickerFields,
    type PickSection,
    pickSections,
    ruleOfField,
    sideOf,
    usedPaths,
} from "./values";
import {
    cardsWords,
    countWords,
    letterOf,
    NOUNS,
    reasonWords,
    rowTest,
    rowWords,
    shortCount,
    shownWords,
    stepWords,
    VERB_WORDS,
} from "./words";

/** Whether a host's preview shows group colors while picking, for the session (spec 9). */
const groupColors: Record<Host, boolean> = { selector: true, filter: true };

/** Whether the workspace shows its matches strip, per host for the session (spec 3.0). */
const stripShown: Record<Host, boolean> = { selector: true, filter: true };

/** Where focus returns when the workspace was opened by the sidebar's Edit button. */
const EDIT = "edit";

/** The title row's id among the rows. */
const TITLE = "title";

/** Props of the editor. */
interface SelectionEditorProps {
    readonly session: GraphSession;
    /** The selection as the host holds it. */
    readonly rule: UnionLeaf;
    readonly host: Host;
    /** Takes the next rule, which the host writes. */
    readonly onChange: (next: UnionLeaf) => void;
    /** The workspace closed, or Escape on the sidebar's outline: the host may fold it. */
    readonly onDone?: () => void;
    /** What the selection belongs to, after its name in the workspace's title ("Style layer 1", "Filters"). */
    readonly ownerName?: string;
    /** Selects the first step on arrival (a filter card opened on a value). */
    readonly openFirst?: boolean;
    /** The title row's name: a filter card's name; "Which nodes" when absent. */
    readonly title?: string;
    /** Opens the value picker on the first group at once (a new filter card). */
    readonly openPicker?: boolean;
    /** Opens the workspace on the title row at once (a new filter card switched to the other side). */
    readonly openTitle?: boolean;
    /** The host's side was just switched (Nodes | Edges): the arrival says nothing and keeps focus there. */
    readonly switchedSide?: boolean;
    /** The host's own picker entries, listed after Results (the import filter's Time window). */
    readonly hostPicks?: readonly PickSection[];
    /** Takes focus on arrival, on its title row. */
    readonly autoFocus?: boolean;
    /** Drawn first in the title row (a filter card's on box). */
    readonly lead?: React.ReactNode;
    /** The title pane's "..." items (a filter card's Select N, Duplicate, Delete). */
    readonly titleMenu?: readonly SelectionMenuItem[];
    /** Drawn first in the title pane (a new filter card's Nodes | Edges). */
    readonly titleExtra?: React.ReactNode;
    /**
     * A new selection goes: its value picker closed with nothing chosen, it was left with no step,
     * or Cancel closed the workspace it was opened in. The host takes it away and moves focus.
     */
    readonly onEmptyCancel?: () => void;
    /** Space on the title row: switches the host's on box (a filter card's), which takes no Tab stop. */
    readonly onTitleToggle?: () => void;
    /** The host's on box is off: said with the title row's name. */
    readonly titleOff?: boolean;
    /**
     * Renames the selection (a filter card): its name is edited in the workspace's title bar, and
     * an empty name goes back to the one its cards give it.
     */
    readonly onRename?: (name: string | undefined) => void;
}

/** The rule kinds a step takes with no test: picking one applies it, and the pane shows no test. */
const NO_TEST_KINDS = new Set<RuleTree["kind"]>(["isolated", "self-loop", "repeated-edge", "state"]);

/**
 * Whether a picked value has a test to set: a structure value applies as it is picked.
 * @param stepRule - the rule the pick wrote.
 * @returns true when its pane has a test.
 */
const hasTest = (stepRule: RuleTree): boolean =>
    !NO_TEST_KINDS.has(stepRule.kind) && !(stepRule.kind === "member" && stepRule.of === "largest-component");

/** A row the arrow keys walk. */
const ROW = "[data-row]";

/** How long typing pauses before a count is said. */
const SPEAK_AFTER_MS = 500;

/**
 * Runs work once the browser has painted the frame being drawn now, and the transitions that input
 * started (a checkbox filling, its tick growing) have finished. An edit on a large graph blocks
 * the page while graphty-element evaluates it, so the frame of the click or key that starts it
 * says "Drawing" first, and a control the input changed is drawn as it now is: a transition still
 * running when the work starts stays frozen where it began, an empty box, until the work ends.
 * @param work - the work.
 */
function afterPaint(work: () => void): void {
    requestAnimationFrame(() => {
        // Transitions only: they end by themselves, where an animation (a spinner) may never.
        const moving = document.getAnimations().filter((each) => each instanceof CSSTransition);
        void Promise.all(moving.map((each) => each.finished.catch(() => undefined))).then(() => {
            setTimeout(work, 0);
        });
    });
}

/**
 * The selection editor: the read-only outline in its host's sidebar, and while it is open, the
 * one workspace over the canvas column that edits it (spec 3.0).
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rule - the selection as the host holds it
 * @param props.host - where it is edited
 * @param props.onChange - takes the next rule, which the host writes
 * @param props.onDone - the workspace closed, or Escape on the sidebar outline: the host may fold it
 * @param props.openFirst - opens the workspace on the first step on arrival
 * @param props.title - the title row's name
 * @param props.ownerName - what the selection belongs to, after its name in the workspace's title
 * @param props.openPicker - opens the workspace with the value picker on the first group at once
 * @param props.openTitle - opens the workspace on the title row at once
 * @param props.switchedSide - the host's side was just switched: arrive quietly, focus on the switch
 * @param props.hostPicks - the host's own picker entries
 * @param props.autoFocus - takes focus on arrival
 * @param props.lead - drawn first in the title row
 * @param props.titleMenu - the title pane's "..." items
 * @param props.titleExtra - drawn first in the title pane
 * @param props.onEmptyCancel - a new selection goes (left with no step, or Cancel on it)
 * @param props.onTitleToggle - Space on the title row
 * @param props.titleOff - the host's on box is off
 * @param props.onRename - renames the selection, from the title bar
 * @returns The editor
 */
export function SelectionEditor({
    session,
    rule: given,
    host,
    onChange: handOn,
    onDone,
    openFirst = false,
    title,
    ownerName,
    openPicker = false,
    openTitle = false,
    switchedSide = false,
    hostPicks = [],
    autoFocus = false,
    lead,
    titleMenu,
    titleExtra,
    onEmptyCancel,
    onTitleToggle,
    titleOff = false,
    onRename,
}: SelectionEditorProps): React.JSX.Element {
    const { store, element } = useWorkspace();
    const owner = useId();
    // The one workspace is this editor's while the store names it (spec 3.0). An opening draws the
    // workspace's header ("Drawing") in the frame of its click or key, and names it in the store, which
    // the panels around it follow, after that frame is painted.
    const named = useWorkspaceState((state) => state.selectionWorkspace?.owner === owner);
    const [opening, setOpening] = useState(false);
    const open = named || opening;
    // An empty selection (All, no condition) opens as one empty card that holds nothing, "0 of N"
    // (the approved prototype); nothing is written until a card has a value, and a workspace left
    // with no value keeps All.
    const converted = open && isEmptyAll(given);
    // That empty card's All nodes, chosen on its start button: nothing is written, so the card remembers it.
    const [startsAll, setStartsAll] = useState(false);
    const reading = useSteps(session, converted && !startsAll ? asNone(given) : given);
    // Whether the host holds a rule now: what it was given, read as the element holds it.
    const hostHolds = (held: UnionLeaf): boolean =>
        converted ? isEmptyAll(held) : JSON.stringify(held) === JSON.stringify(reading.rule);
    // The element's canonical form: every group and step has its id and color.
    // An edit is handed to the host after the frame of its input is painted (see afterPaint); until
    // then the outline shows it, and the next edit builds on it, never on the rule before it.
    const [waiting, setWaiting] = useState<UnionLeaf | null>(null);
    const waitingNow = useRef<UnionLeaf | null>(null);
    // The input that started the work says "Drawing" in its own frame, until the work is handed on.
    const [starting, setStarting] = useState(false);
    const rule = waiting ?? reading.rule;
    const onChange = (next: UnionLeaf): void => {
        const first = waitingNow.current === null;
        waitingNow.current = next;
        setWaiting(next);
        setStarting(true);
        if (first) {
            afterPaint(() => {
                const last = waitingNow.current;
                waitingNow.current = null;
                flushSync(() => {
                    setWaiting(null);
                    setStarting(false);
                    if (last !== null) {
                        handOn(last);
                    }
                });
            });
        }
    };
    const side = sideOf(rule);
    const name = title ?? `Which ${NOUNS[side].many}`;
    const wsTitle = ownerName === undefined ? name : `${ownerName} / ${name}`;
    const titleId = useId();
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);
    // The row whose pane the workspace shows; null at rest, and after a delete.
    const [selected, setSelected] = useState<string | null>(null);
    // Whether the last key was Escape: a picker it closed on a selection with no step takes a new
    // filter card back (spec 25); a click elsewhere only closes the picker.
    const escaped = useRef(false);
    // `fresh`: the group was made by "Or..." for this step, and goes again with it; `open`: its
    // value picker is open; `back`: the row that was selected before, selected again if it goes.
    const [adding, setAdding] = useState<{
        branch: string;
        op: Verb;
        fresh?: boolean;
        open: boolean;
        back?: string | null;
    } | null>(null);
    // The step being added as the last render drew it: a picker that closes twice takes it back once.
    const addingNow = useRef(adding);
    addingNow.current = adding;
    const [active, setActive] = useState<string | null>(null);
    const [renaming, setRenaming] = useState<string | null>(null);
    // The selection's own name being typed in the title bar (a filter card's).
    const [renamingTitle, setRenamingTitle] = useState(false);
    // The cards folded to their header line; a new group folds every card before it.
    const [folded, setFolded] = useState<ReadonlySet<string>>(() => new Set());
    const fold = (id: string, to: boolean): void => {
        setFolded((was) => {
            const next = new Set(was);
            if (to) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    };
    const [colors, setColors] = useState(groupColors[host]);
    const [strip, setStrip] = useState(stripShown[host]);
    // A group deleted under the pointer leaves its last sibling's group row until the pointer
    // leaves the outline, so the row under it never changes (spec 3.1).
    const [keepShape, setKeepShape] = useState(false);
    // Where the workspace lies over the frame, once measured (below).
    const [wsPlace, setPlace] = useState<React.CSSProperties | null>(null);
    const box = useRef<HTMLDivElement>(null);
    const wsBox = useRef<HTMLElement>(null);
    const outlineColumn = useRef<HTMLDivElement>(null);
    // What the workspace restores on Cancel, and where focus returns when it closes.
    const openedWith = useRef<UnionLeaf | null>(null);
    // Opened on a selection that did not exist yet (a new filter card, on its arrival): Cancel takes
    // it away. A later opening restores what it held, as for any card.
    const openedNew = useRef(false);
    const openings = useRef(0);
    // The visit: graphty-element tells which runs its cards started, so Done keeps the ones the final
    // cards read and Cancel drops them all (design: algo-options cardruns.md, rule 2).
    const visit = useRef<ScopeEdit | null>(null);
    const endVisit = (how: "done" | "cancel"): void => {
        const ending = visit.current;
        visit.current = null;
        // A visit ended while the element is torn down (the app closed with the workspace open) is
        // rolled back by the element: nothing is left to keep or drop.
        void (how === "done" ? ending?.commit() : ending?.discard())?.catch((error: unknown) => {
            if ((error as { name?: unknown } | null)?.name !== "AbortError") {
                throw error;
            }
        });
    };
    // The place it was opened in: leaving it closes the workspace as Done (spec 3.0).
    const place = useWorkspaceState((state) => state.place);
    const openedIn = useRef(place);
    const closeRef = useRef<(how: "done" | "cancel") => void>(() => undefined);
    // The step whose pane was last edited: the workspace reopens on it.
    const lastEdited = useRef<string | null>(null);
    const opener = useRef<string | null>(null);
    const arrival = autoFocus && !openPicker ? `[data-row="${TITLE}"]` : null;
    const focusAfter = useRef<string | readonly string[] | number | null>(arrival);
    // Steps waiting for the reader's Run: their run was removed, or is too slow to start unasked.
    const waitingSteps = reading.branches.flatMap((branch) =>
        branch.steps.flatMap((step) => (step.reason?.code === "run-needed" ? [step.id] : [])),
    );
    const multi = rule.branches.length > 1 || (keepShape && rule.branches.length === 1);
    const { of } = reading.total;
    // A filter's count reads the full graph; beside other filters it can count nodes that are not
    // drawn, so the header says which graph it counts and how many are shown.
    const wsCountWhere = host === "filter" && reading.total.shown < reading.total.count ? " in full graph" : "";
    const say = (words: string): void => {
        store.set({ announcement: words });
    };
    const stepName = (step: UnionBranch["steps"][number]): string => stepWords(session, step, side).value;
    // Every group goes by its letter from the start, so a name never changes when Or adds a group.
    const branchName = (branch: UnionBranch): string => branch.name ?? letterOf(rule.branches.indexOf(branch));
    // A group whose every member an earlier group already draws is drawn "under" those groups: its
    // row's tooltip says so, as the canvas key did (ws-polish 3).
    const underOf = (at: number): string[] => {
        const read = reading.branches.find((each) => each.id === rule.branches[at]?.id);
        if (read === undefined || read.drawn > 0 || read.count === 0) {
            return [];
        }
        return rule.branches
            .slice(0, at)
            .filter(
                (each) => each.on !== false && (reading.branches.find((other) => other.id === each.id)?.drawn ?? 0) > 0,
            )
            .map((each) => branchName(each));
    };
    // The open workspace says its count once typing pauses, in either host (WCAG 4.1.3); the
    // table's and the selection's lines stay quiet while an editor is open.
    const [heardCount] = useDebouncedValue(
        reading.pending.length > 0 ? null : countWords(reading.total.count, of, side),
        SPEAK_AFTER_MS,
    );
    useAnnounceChange(open ? heardCount : null);

    /**
     * Opens the workspace on a row (or switches the one open to this selection), keeping every
     * edit of the selection it showed before (spec 3.0).
     * @param row - the row to select.
     * @param from - the sidebar row or Edit that opened it, where focus returns.
     * @param add - a group to add a step to, its value picker open.
     * @param quiet - says nothing as it opens (a host's side switch).
     * @param shut - the added step's value picker waits shut.
     */
    const openAt = (row: string, from: string, add?: UnionBranch, quiet = false, shut = false): void => {
        if (!open) {
            openedIn.current = store.get().place;
            openedWith.current = reading.rule;
            visit.current ??= session.scope.edit();
            openedNew.current = onEmptyCancel !== undefined && openings.current === 0;
            openings.current += 1;
            opener.current = from;
            if (!quiet) {
                say(`Editing ${[name, ownerName].filter((each) => each !== undefined).join(", ")}`);
            }
        }
        // A selection with no step opens on its new step's pane, the value field focused (spec 3.0).
        const only = rule.branches.length === 1 ? rule.branches[0] : undefined;
        const stepless = add === undefined && row === TITLE && titleExtra === undefined && only?.steps.length === 0;
        // A rule with steps reopens on the pane of the step last edited, else its first step's; the
        // title's pane holds only the add actions (the owner's review, ws-polish 2).
        const steps = rule.branches.flatMap((branch) => branch.steps);
        const toStep = steps.find((step) => step.id === lastEdited.current) ?? steps[0];
        const shown =
            add === undefined && row === TITLE && !stepless && !recipeTitle && toStep?.id !== undefined
                ? toStep.id
                : row;
        setSelected(add === undefined ? shown : null);
        setActive(shown);
        if (add !== undefined && add.steps.length > 0) {
            setAdding({ branch: add.id ?? "", op: newVerb(add), open: !shut, back: row });
        } else if (add !== undefined || stepless) {
            // An empty card waits with its value picker shut, its field focused (the approved
            // prototype): Enter or a click opens it.
            setSelected(null);
            setAdding(null);
            focusAfter.current = EMPTY_VALUE;
        } else {
            focusAfter.current = [
                `[data-row="${CSS.escape(shown)}"]`,
                `[data-selects="${CSS.escape(shown)}"]`,
                `[data-row="${TITLE}"]`,
            ];
        }
        if (named) {
            store.set({ selectionWorkspace: { owner, host } });
            return;
        }
        setOpening(true);
        afterPaint(() => {
            flushSync(() => {
                setOpening(false);
                if (mounted.current) {
                    store.set({ selectionWorkspace: { owner, host } });
                }
            });
        });
    };
    /**
     * Closes the workspace: Done keeps every edit; Cancel restores the selection as it was when it
     * opened, as one undo step. A new filter card left with no step goes, and Cancel on a new card
     * takes it away: there was no card when the workspace opened.
     * @param how - "done" or "cancel".
     */
    const close = (how: "done" | "cancel"): void => {
        const back = openedWith.current;
        const left = how === "cancel" && back !== null ? back : reading.rule;
        // Only a card made in this opening goes: a saved card emptied by Clear stays, at All.
        const goes =
            onEmptyCancel !== undefined &&
            openedNew.current &&
            (how === "cancel" || left.branches.every((branch) => branch.steps.length === 0));
        const restore = !goes && how === "cancel" && back !== null && !hostHolds(back);
        if (restore) {
            onChange(back);
        }
        if (store.get().selectionWorkspace?.owner === owner) {
            store.set({ selectionWorkspace: null });
        }
        setSelected(null);
        setAdding(null);
        setKeepShape(false);
        setStartsAll(false);
        endVisit(goes ? "cancel" : how);
        if (goes) {
            say("Filter not added");
            onEmptyCancel();
            return;
        }
        say(how === "done" ? `Done, ${formatNumber(reading.total.count)} of ${formatNumber(of)}` : "Cancelled");
        // The host folds the selection back to its row (a filter card); its row then takes focus.
        if (onDone !== undefined) {
            onDone();
            return;
        }
        // A control the reader moved to while the workspace was closing keeps focus and its keys.
        const at = document.activeElement;
        if (at !== null && at !== document.body && at.isConnected && at.closest(".sel-ws") === null) {
            return;
        }
        const from = opener.current;
        focusAfter.current = [
            ...(from === EDIT ? ["[data-edit]"] : []),
            ...(from === null || from === EDIT
                ? []
                : [`[data-row="${CSS.escape(from)}"]`, `[data-selects="${CSS.escape(from)}"]`]),
            `[data-row="${TITLE}"]`,
        ];
    };
    closeRef.current = close;
    // Done, Cancel and Escape say "Drawing" in their own frame, and the workspace stays open with it
    // while ending the preview and handing the rule on repaint the whole graph: it closes once
    // graphty-element has painted the result, so the canvas never shows the preview look without
    // "Drawing" beside it. Where the repaint does not block, that is the next frame. An edit still
    // waiting is handed on first.
    const [closing, setClosing] = useState(false);
    // The preview ends while the workspace is still open, as the first part of closing it.
    const [ending, setEnding] = useState(false);
    const closingNow = useRef(false);
    const handBackRef = useRef<(how: "done" | "cancel") => void>(() => undefined);
    handBackRef.current = (how) => {
        const back = openedWith.current;
        const goes = onEmptyCancel !== undefined && how === "cancel" && openedNew.current;
        if (how === "cancel" && !goes && back !== null && !hostHolds(back)) {
            handOn(back);
        }
        // Done with no card holding a value keeps All, as a new selection starts.
        const emptied = reading.rule.branches.every((branch) => branch.steps.length === 0);
        if (how === "done" && emptied && !converted && !isEmptyAll(reading.rule)) {
            const none = newSelection(reading.rule.side, reading.rule.within);
            handOn({ ...none, branches: none.branches.map((branch) => ({ ...branch, start: "all" as const })) });
        }
    };
    const closeAfterPaint = (how: "done" | "cancel"): void => {
        if (closingNow.current) {
            return;
        }
        closingNow.current = true;
        setClosing(true);
        afterPaint(() => {
            flushSync(() => {
                setEnding(true);
                handBackRef.current(how);
            });
            const painted = element?.waitForPainted() ?? Promise.resolve();
            void painted.then(() => {
                closingNow.current = false;
                if (!mounted.current) {
                    return;
                }
                flushSync(() => {
                    setClosing(false);
                    setEnding(false);
                    closeRef.current(how);
                });
            });
        });
    };
    // A new filter card opens the workspace at once: on its title (Nodes | Edges) with its value
    // picker open, or on its first step.
    const arrived = useRef(false);
    useEffect(() => {
        if (arrived.current) {
            return;
        }
        arrived.current = true;
        const first = rule.branches[0];
        const firstStep = first?.steps[0]?.id;
        if (openPicker && first !== undefined) {
            openAt(TITLE, TITLE, first);
        } else if (openFirst && firstStep !== undefined) {
            openAt(firstStep, TITLE);
            focusAfter.current = PANE_FOCUS;
        } else if (openTitle) {
            // After a side switch its new step's Value field waits under the side, its picker shut:
            // Enter opens it.
            const shutStep = switchedSide && first?.steps.length === 0 ? first : undefined;
            openAt(TITLE, TITLE, shutStep, switchedSide, true);
            if (switchedSide) {
                // The side's segment was replaced with the editor: focus goes back to the side chosen.
                // Only there: the sidebar's title row would take it before the workspace is drawn.
                focusAfter.current = ".sel-ws-cards input[type=radio]:checked";
            }
        }
    });
    // Leaving the place it was opened in is Done.
    useEffect(() => {
        if (open && place !== openedIn.current) {
            closeRef.current("done");
        }
    }, [open, place]);
    // Another selection took the workspace: this one closed as Done, its edits kept.
    const wasOpen = useRef(false);
    useEffect(() => {
        if (wasOpen.current && !open) {
            endVisit("done");
            setSelected(null);
            setAdding(null);
            setKeepShape(false);
        }
        wasOpen.current = open;
    }, [open]);
    // Leaving the place unmounts the editor: the workspace closes with it, as Done.
    useEffect(
        () => () => {
            endVisit("done");
            if (store.get().selectionWorkspace?.owner === owner) {
                store.set({ selectionWorkspace: null });
            }
        },
        [store, owner],
    );

    // The picking view (spec 9): every layer suspended, members in their group's color, the rest
    // faint; graphty-element draws it. A changed rule replaces the view in place.
    const view = useRef<{ end(): void } | null>(null);
    const viewKey = JSON.stringify(reading.rule);
    // The workspace's first frame is drawn before the work its opening starts (the preview, the
    // strip's and the table's readings, the canvas's framing), so it says "Drawing" first.
    const [warm, setWarm] = useState(false);
    useEffect(() => {
        if (!open) {
            setWarm(false);
            return undefined;
        }
        let live = true;
        afterPaint(() => {
            if (live) {
                flushSync(() => {
                    setWarm(true);
                });
            }
        });
        return () => {
            live = false;
        };
    }, [open]);
    const previewing = open && warm && colors && !ending;
    useEffect(() => {
        if (previewing) {
            view.current = session.styles.showBranches({
                edges: true,
                rule: JSON.parse(viewKey) as UnionLeaf,
                rest: "faint",
                // Only what is shown is drawn: the working graph draws no node outside it.
            });
        } else {
            view.current?.end();
            view.current = null;
        }
    }, [previewing, viewKey, session]);
    useEffect(
        () => () => {
            view.current?.end();
        },
        [],
    );
    // While graphty-element still applies the preview's paint (a large graph repaints over many
    // frames), the header says "Drawing" beside the count, so the count is not read as the
    // canvas's; it clears once the element has drawn the last batch (ws-polish 3).
    const [drawing, setDrawing] = useState(false);
    useEffect(() => {
        if (!open || element === null || element === undefined) {
            setDrawing(false);
            return undefined;
        }
        let live = true;
        setDrawing(true);
        void element.waitForPainted().then(() => {
            if (live) {
                setDrawing(false);
            }
        });
        return () => {
            live = false;
        };
    }, [open, element, viewKey, previewing]);

    // The table's Group column and Matches only, and the key's title, read the open selection
    // (spec 8). One slot, two hosts: an editor that is open claims it, one at rest keeps it only
    // while no other editor holds it, and each clears only its own claim.
    const holder = useWorkspaceState((state) => state.editingSelection?.owner ?? null);
    const stripBranch = useWorkspaceState((state) =>
        state.editingSelection?.owner === owner ? state.editingSelection.branch : null,
    );
    useEffect(() => {
        const was = store.get().editingSelection;
        if ((open && warm) || was === null || was.owner === owner) {
            store.set({
                editingSelection: {
                    owner,
                    rule: JSON.parse(viewKey) as UnionLeaf,
                    branch: was?.owner === owner ? was.branch : null,
                    title: name,
                },
            });
        }
    }, [viewKey, store, name, open, warm, owner, holder]);
    useEffect(
        () => () => {
            if (store.get().editingSelection?.owner === owner) {
                store.set({ editingSelection: null });
            }
        },
        [store, owner],
    );

    // A row asked for focus (after a move, an add, a remove) gets it once it is drawn: in the
    // workspace while it is open, else in the sidebar outline. A number is a row's place.
    useEffect(() => {
        const want = focusAfter.current;
        const root = open ? wsBox.current : box.current;
        // The workspace is hidden until it is placed, and a hidden control takes no focus.
        if (want === null || root === null || (open && wsPlace === null)) {
            return;
        }
        let target: HTMLElement | undefined;
        if (typeof want === "number") {
            const rows = [...root.querySelectorAll<HTMLElement>(ROW)];
            target = rows[Math.min(want, rows.length - 1)];
        } else if (want === PANE_FOCUS) {
            target = paneTarget(root);
        } else {
            target = (typeof want === "string" ? [want] : want)
                .map((each) => root.querySelector<HTMLElement>(each))
                .find((each) => each !== null && each !== undefined);
        }
        if (target !== undefined) {
            focusAfter.current = null;
            focusWithRing(target);
        }
    });

    // Focus comes into the modal as it opens, wherever it was: left on the drawing, the drawing's focus
    // ring would stand round the preview, and Tab would start behind the modal.
    const opened = open && wsPlace !== null;
    useEffect(() => {
        const at = document.activeElement;
        if (opened && wsBox.current !== null && !wsBox.current.contains(at)) {
            wsBox.current.focus({ preventScroll: true });
        }
    }, [opened]);

    const readingOf = (id: string | undefined): StepReading | undefined =>
        reading.branches.flatMap((branch) => branch.steps).find((step) => step.id === id);
    const branchReading = (id: string | undefined): StepsReading["branches"][number] | undefined =>
        reading.branches.find((branch) => branch.id === id);

    const focusPane = (): boolean => {
        const target = paneTarget(wsBox.current);
        if (target === undefined) {
            return false;
        }
        focusAfter.current = null;
        focusWithRing(target);
        return true;
    };
    // The workspace's Table: the matches strip under the preview, hidden or shown for the session.
    const toggleStrip = (): void => {
        stripShown[host] = !strip;
        setStrip(!strip);
    };
    const select = (id: string | null, intoPane = false): void => {
        setSelected(id);
        // A step whose pane was shown is where the workspace reopens.
        if (id !== null && rule.branches.some((branch) => branch.steps.some((step) => step.id === id))) {
            lastEdited.current = id;
        }
        if (id !== null) {
            setActive(id);
        }
        if (intoPane) {
            focusAfter.current = PANE_FOCUS;
        }
    };
    const pick = (branch: UnionBranch, op: Verb, stepRule: RuleTree): void => {
        const made = addStep(rule, branch.id ?? "", op, stepRule);
        lastEdited.current = made.id;
        onChange(made.rule);
        setAdding(null);
        // The new step is selected: its pane holds its test, or, with no test, its row stays lit.
        // Focus waits for the test's first control (a computed value's test mounts once its run
        // answers), never the Except switch above it.
        select(made.id);
        if (hasTest(stepRule)) {
            // The new step's own test, never an earlier step's in the cards.
            focusAfter.current = TEST_FOCUS.map((each) =>
                each.replace(".sel-ws-cards", `[data-step-pane="${CSS.escape(made.id)}"]`),
            );
        }
        if (!hasTest(stepRule)) {
            focusAfter.current = `[data-row="${CSS.escape(made.id)}"]`;
        }
    };
    // Only the step being added is lit while it is added: the row selected before is selected
    // again if nothing is picked.
    const startAdding = (branch: UnionBranch, op: Verb): void => {
        fold(branch.id ?? "", false);
        setAdding({ branch: branch.id ?? "", op, open: true, back: selected });
        setSelected(null);
    };
    const stopAdding = (branch: UnionBranch): void => {
        const was = addingNow.current;
        if (was === null) {
            return;
        }
        addingNow.current = null;
        // A step with no value is taken back when its picker closes with nothing chosen (spec 1),
        // and so is the group "Or..." made for it, and the row selected before is selected again.
        const fresh = was.fresh === true && branch.steps.length === 0 && branch.id !== undefined;
        setAdding(null);
        if (fresh) {
            onChange(removeBranch(rule, branch.id ?? ""));
            setSelected(was.back ?? null);
            say(`${branchName(branch)} not added`);
            focusAfter.current = ["[data-or]", `[data-row="${TITLE}"]`];
            return;
        }
        if (
            escaped.current &&
            onEmptyCancel !== undefined &&
            openedNew.current &&
            rule.branches.every((each) => each.steps.length === 0)
        ) {
            say("Filter not added");
            onEmptyCancel();
            return;
        }
        setSelected(was.back ?? null);
        say("No step added");
        focusAfter.current = [`[data-add="${CSS.escape(branch.id ?? "")}"]`, `[data-row="${TITLE}"]`];
    };

    const moveStepBy = (branch: UnionBranch, id: string, by: -1 | 1): void => {
        const at = branch.steps.findIndex((step) => step.id === id);
        const to = at + by;
        if (to < 0 || to >= branch.steps.length) {
            return;
        }
        onChange(moveStep(rule, branch.id ?? "", id, to));
        say(`Moved to step ${String(to + 1)} of ${String(branch.steps.length)}`);
        focusAfter.current = `[data-row="${CSS.escape(id)}"]`;
    };
    const moveBranchBy = (id: string, by: -1 | 1): void => {
        const at = rule.branches.findIndex((branch) => branch.id === id);
        const to = at + by;
        if (to < 0 || to >= rule.branches.length) {
            return;
        }
        onChange(moveBranch(rule, id, to));
        say(`Moved to ${letterOf(to)}`);
        focusAfter.current = `[data-row="${CSS.escape(id)}"]`;
    };
    // After a delete no row is selected (a second Delete deletes nothing) and focus stays at the
    // deleted row's place (spec 3.1).
    const placeOf = (id: string): number =>
        [...(wsBox.current?.querySelectorAll<HTMLElement>(ROW) ?? [])].findIndex((row) => row.dataset.row === id);
    const removeStepAt = (branch: UnionBranch, id: string): void => {
        const place = placeOf(id);
        onChange(removeStep(rule, branch.id ?? "", id));
        const gone = branch.steps.find((step) => step.id === id);
        if (gone !== undefined) {
            say(`Removed ${stepName(gone)}`);
        }
        setSelected(null);
        focusAfter.current = place < 0 ? `[data-row="${TITLE}"]` : place;
    };
    const removeBranchOf = (branch: UnionBranch): void => {
        const place = placeOf(branch.id ?? "");
        // Under the pointer, a lone group left keeps its row until the pointer leaves the outline.
        if (rule.branches.length === 2 && outlineColumn.current?.matches(":hover") === true) {
            setKeepShape(true);
        }
        onChange(removeBranch(rule, branch.id ?? ""));
        say(`Removed ${branchName(branch)}`);
        setSelected(null);
        focusAfter.current = place < 0 ? `[data-row="${TITLE}"]` : place;
    };
    const duplicate = (branch: UnionBranch, stepId?: string): void => {
        const id = stepId ?? branch.id ?? "";
        const made = stepId === undefined ? duplicateBranch(rule, id) : duplicateStep(rule, branch.id ?? "", id);
        onChange(made.rule);
        const step = branch.steps.find((each) => each.id === stepId);
        say(`Copied ${step === undefined ? branchName(branch) : stepName(step)}`);
        select(made.id);
        focusAfter.current = `[data-row="${CSS.escape(made.id)}"]`;
    };
    const toggle = (branch: UnionBranch, stepId?: string): void => {
        const step = branch.steps.find((each) => each.id === stepId);
        const on = (step ?? branch).on === false;
        onChange(
            step === undefined
                ? editBranch(rule, branch.id ?? "", { on })
                : editStep(rule, branch.id ?? "", stepId ?? "", { on }),
        );
        say(`${step === undefined ? branchName(branch) : stepName(step)} ${on ? "on" : "off"}`);
    };
    // Clear (spec 3.0): back to where a new layer or card starts -- All nodes, no step -- as one
    // undo step. A filter card keeps its name and on box.
    const clear = (): void => {
        onChange(newSelection(rule.side, rule.within));
        say("Cleared");
        // A cleared rule is one empty card, its value picker shut, as a new rule opens.
        setSelected(null);
        setAdding(null);
        focusAfter.current = EMPTY_VALUE;
    };
    // A group's members: selected (a style layer), or the strip on them (a filter, spec 2).
    const showMembers = (members: StepsReading["result"] | undefined, branch: string | null): void => {
        if (members === undefined) {
            return;
        }
        if (host === "selector") {
            void session.selection.apply({ scope: members }).then((delta) => {
                say(`Selected ${countWords(delta.nodes, of, side)}`);
                requestAnimationFrame(() => {
                    if (focusIsLost()) {
                        focusInspectorTitle();
                    }
                });
            });
            return;
        }
        const held = store.get().editingSelection;
        if (held !== null) {
            store.set({ editingSelection: { ...held, branch } });
        }
        stripShown[host] = true;
        setStrip(true);
    };

    // The outline is one Tab stop walked with the arrows (roving focus); a row's keys act on it.
    const walk = (event: React.KeyboardEvent<HTMLElement>, selects: boolean): boolean => {
        const tree = event.currentTarget.closest("[role=tree]");
        const rows = [...(tree?.querySelectorAll<HTMLElement>(ROW) ?? [])];
        const at = rows.indexOf(event.currentTarget);
        const targets: Partial<Record<string, number>> = {
            ArrowDown: at + 1,
            ArrowUp: at - 1,
            Home: 0,
            End: rows.length - 1,
        };
        const to = targets[event.key];
        const row = to === undefined ? undefined : rows[to];
        if (row === undefined) {
            return to !== undefined;
        }
        event.preventDefault();
        const id = row.dataset.row ?? null;
        setActive(id);
        // In the workspace, arrowing onto a row selects it, as Figma's Layers list does; the
        // Condition row only takes focus.
        if (selects && row.dataset.selects !== undefined) {
            setSelected(row.dataset.selects);
        }
        row.focus();
        return true;
    };
    // The sidebar's outline is read-only: Enter opens the workspace on the row (spec 3.4), Space
    // switches a filter card's on box, Escape lets the host fold it.
    const restKeys = (event: React.KeyboardEvent<HTMLElement>, selects: string, isTitle: boolean): void => {
        if (event.target !== event.currentTarget || walk(event, false)) {
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            openAt(selects, event.currentTarget.dataset.row ?? selects);
        } else if (event.key === " " && isTitle && onTitleToggle !== undefined) {
            event.preventDefault();
            onTitleToggle();
        } else if (event.key === "Escape" && onDone !== undefined) {
            event.preventDefault();
            onDone();
        } else if (event.key === "F2") {
            // The outline's, never the project's rename.
            event.preventDefault();
        }
    };
    const rowKeys = (event: React.KeyboardEvent<HTMLElement>, branch: UnionBranch | null, stepId?: string): void => {
        if (event.target !== event.currentTarget || isTypingTarget(event.target) || walk(event, true)) {
            return;
        }
        const id = stepId ?? branch?.id ?? TITLE;
        const selects = event.currentTarget.dataset.selects ?? id;
        if (event.key === "Enter") {
            event.preventDefault();
            // The row is selected already (arrowing onto it selects it): nothing would draw again,
            // so focus goes into its pane now rather than on some later render.
            if (selects === selected && focusPane()) {
                return;
            }
            select(selects, true);
            return;
        }
        if (event.key === "F2") {
            // F2 renames only a group's row; on any other row it is the outline's, never the
            // project's rename.
            event.preventDefault();
            if (branch !== null && stepId === undefined && multi && event.currentTarget.dataset.row === id) {
                setRenaming(id);
            }
            return;
        }
        if (branch === null) {
            titleKeys(event);
            return;
        }
        if (matchesKey(event.nativeEvent, "Mod+]") || matchesKey(event.nativeEvent, "Mod+[")) {
            event.preventDefault();
            // Figma: Ctrl+] brings forward (up the list), Ctrl+[ sends backward.
            const by = event.key === "]" ? -1 : 1;
            if (stepId === undefined) {
                moveBranchBy(id, by);
            } else {
                moveStepBy(branch, id, by);
            }
        } else if (matchesKey(event.nativeEvent, "Mod+D")) {
            event.preventDefault();
            duplicate(branch, stepId);
        } else if (event.key === "Delete" || event.key === "Backspace") {
            event.preventDefault();
            // Only the selected row: after a delete none is, so a second press deletes nothing.
            if (selected !== selects) {
                return;
            }
            if (stepId === undefined) {
                removeBranchOf(branch);
            } else {
                removeStepAt(branch, id);
            }
        } else if (event.key === " " || matchesKey(event.nativeEvent, "Shift+Mod+H")) {
            event.preventDefault();
            toggle(branch, stepId);
        }
    };

    // The title row: Space switches the host's on box; a "..." item's key runs it (Ctrl+D, Delete).
    const titleKeys = (event: React.KeyboardEvent<HTMLElement>): void => {
        if (event.key === " " && onTitleToggle !== undefined) {
            event.preventDefault();
            onTitleToggle();
            return;
        }
        const item = titleMenu?.find(
            (each) =>
                each.key !== undefined && (each.reason ?? null) === null && matchesKey(event.nativeEvent, each.key),
        );
        if (item !== undefined) {
            event.preventDefault();
            item.onRun();
        }
    };

    // A dragged row's id, so a drop on another row of its kind moves it there.
    const dragged = useRef<string | null>(null);
    const dragProps = (branch: UnionBranch, id: string, isStep: boolean): React.HTMLAttributes<HTMLElement> => ({
        draggable: true,
        onDragStart: (event) => {
            dragged.current = id;
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", id);
        },
        onDragOver: (event) => {
            if (dragged.current !== null) {
                event.preventDefault();
            }
        },
        onDrop: (event) => {
            event.preventDefault();
            const from = dragged.current;
            dragged.current = null;
            if (from === null || from === id) {
                return;
            }
            if (isStep && branch.steps.some((step) => step.id === from)) {
                const to = branch.steps.findIndex((step) => step.id === id);
                onChange(moveStep(rule, branch.id ?? "", from, to));
                say(`Moved to step ${String(to + 1)} of ${String(branch.steps.length)}`);
            } else if (!isStep && rule.branches.some((each) => each.id === from)) {
                const to = rule.branches.findIndex((each) => each.id === id);
                onChange(moveBranch(rule, from, to));
                say(`Moved to ${letterOf(to)}`);
            }
        },
    });

    const empty = rule.branches.every((branch) => branch.steps.length === 0);
    // Each step's row words, read once per reading rather than on every hover or key.
    const outlineWords = useMemo(
        () =>
            new Map(
                rule.branches.flatMap((branch) =>
                    branch.steps.map((step) => {
                        const read = reading.branches.flatMap((each) => each.steps).find((each) => each.id === step.id);
                        return [step.id ?? "", rowWords(session, step, side, read)] as const;
                    }),
                ),
            ),
        [session, rule, reading, side],
    );
    // The outline holds only recipe rows: "And..." and "Or..." live in the pane's first row,
    // so selecting a row changes only its highlight (the owner's review, repolish 2). An empty
    // selection keeps its one "And..." row.
    const showAdd = (branch: UnionBranch): boolean => empty && adding?.branch !== branch.id && !allRow(branch);
    // A filter card named after its only step draws no outline: its title row is the recipe, and its
    // title pane holds the step's controls under the card's own.
    const lone = rule.branches.length === 1 ? rule.branches[0]?.steps : undefined;
    const loneStep = lone?.length === 1 ? lone[0] : undefined;
    const loneWords = loneStep === undefined ? undefined : outlineWords.get(loneStep.id ?? "");
    const recipeTitle =
        host === "filter" &&
        adding === null &&
        loneStep !== undefined &&
        loneWords !== undefined &&
        loneStep.on !== false &&
        rule.branches[0]?.on !== false &&
        !allRow(rule.branches[0]) &&
        loneStep.op === newVerb(rule.branches[0]) &&
        title === [loneWords.value, rowTest(loneWords)].filter((each) => each !== "").join(" ");
    const rowIds = [
        TITLE,
        ...rule.branches.flatMap((branch) => [
            ...(multi ? [branch.id ?? ""] : []),
            ...(!multi && allRow(branch) ? [`all:${branch.id ?? ""}`] : []),
            ...(recipeTitle ? [] : branch.steps.map((step) => step.id ?? "")),
            ...(showAdd(branch) ? [`add:${branch.id ?? ""}`] : []),
        ]),
    ];
    const tabbed = active !== null && rowIds.includes(active) ? active : TITLE;
    const recipeRead = loneStep === undefined ? undefined : readingOf(loneStep.id);
    const recipeState =
        recipeTitle && loneStep !== undefined
            ? reasonWords(recipeRead?.reason ?? null).short.replace(/ \(.*\)$/u, "")
            : "";
    const recipeOpen = recipeTitle && (selected === TITLE || selected === loneStep?.id);

    // A group with no step says where it starts: "All nodes", "No nodes".
    const startWords = (branch: UnionBranch | undefined): string =>
        `${branch?.start === "all" ? "All" : "No"} ${NOUNS[side].many}`;
    const restSummary = empty ? startWords(rule.branches[0]) : cardsWords(session, rule, reading);
    /**
     * The outline's rows: the sidebar's read-only copy at rest ("rest"), or the workspace's
     * outline column ("ws"), whose rows select. The same rows, words and caps in both (spec 3.1).
     * @param where - which outline.
     * @returns the tree.
     */
    const outline = (where: "rest" | "ws"): React.JSX.Element => {
        const ws = where === "ws";
        // While the workspace is open the sidebar keeps only the title row, marked as being edited,
        // with no outline and no count: the workspace's header is the one place the count is drawn
        // (spec 3.0, the owner's review, ws-polish 2).
        const editing = !ws && open;
        // A style layer's count is said at rest by its layer row and the canvas key; its Which
        // outline does not say it a third time (tier 5 decided.md). A filter card has no other.
        const restCount = !ws && !editing && host !== "selector";
        const levelOf = (branch: UnionBranch | null, stepId: string | undefined): number => {
            if (branch === null) {
                return 1;
            }
            return multi && stepId !== undefined ? 3 : 2;
        };
        const graphWord = host === "filter" ? "full" : "filtered";
        const editButton = (
            <Button
                size="compact-xs"
                variant="default"
                data-edit=""
                aria-label={`Edit ${name}`}
                onClick={() => {
                    openAt(TITLE, EDIT);
                }}
            >
                Edit
            </Button>
        );
        const rowProps = (
            id: string,
            selects: string,
            label: string,
            branch: UnionBranch | null,
            stepId?: string,
        ): React.HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string | undefined> => ({
            role: "treeitem",
            // The levels the indent draws: a step of one of several groups is under its group's row,
            // which a role=group holding both does not say by itself (ws-polish 3).
            "aria-level": levelOf(branch, stepId),
            tabIndex: tabbed === id ? 0 : -1,
            "data-row": id,
            "data-selects": selects,
            ...(ws ? { "aria-selected": selected === selects } : {}),
            "aria-label": label,
            onKeyDown: (event) => {
                if (ws) {
                    rowKeys(event, branch, stepId);
                } else {
                    restKeys(event, selects, branch === null);
                }
            },
            onFocus: () => {
                setActive(id);
            },
            onClick: (event) => {
                if ((event.target as Element).closest("button, input, label") !== null) {
                    return;
                }
                if (ws) {
                    select(selects);
                } else {
                    openAt(selects, id);
                }
            },
        });
        return (
            <div role="tree" aria-label={name} className="sel-outline">
                <div
                    {...rowProps(
                        TITLE,
                        TITLE,
                        [
                            name,
                            ...(editing ? ["being edited"] : []),
                            ...(ws || restCount ? [countWords(reading.total.count, of, side)] : []),
                            ...(titleOff ? ["off"] : []),
                        ].join(", "),
                        null,
                    )}
                    className="sel-row sel-title-row"
                    {...(ws && recipeOpen ? { "aria-selected": true } : {})}
                >
                    {lead}
                    <Text size="sm" fw={600} className="sel-title">
                        {name}
                    </Text>
                    {/* Its state word stays drawn while selected, as every step row's does (ws-polish 3). */}
                    {recipeTitle && loneStep !== undefined && recipeState !== "" && (
                        <Text size="sm" c="dimmed" className="sel-state">
                            {recipeState}
                        </Text>
                    )}
                    {/* In the workspace the header says the count; the title row only names it. */}
                    {ws && <span className="sel-spacer" />}
                    {editing && (
                        <Text size="sm" c="dimmed" className="sel-state" ml="auto" data-editing="">
                            Editing
                        </Text>
                    )}
                    {restCount && (
                        <Tooltip
                            label={
                                reading.pending.length > 0
                                    ? `${String(reading.pending.length)} waiting`
                                    : `${formatNumber(reading.total.count)} of ${formatNumber(of)} in the ${graphWord} graph`
                            }
                        >
                            <Text size="sm" className="sel-count" ml="auto">
                                {`${shortCount(reading.total.count)} of ${shortCount(of)}${shownWords(reading.total)}`}
                            </Text>
                        </Tooltip>
                    )}
                    {!ws && !editing && waitingSteps.length > 0 && (
                        // A step whose run was removed waits; Run starts it, never unasked (cardruns.md 3).
                        <Button
                            size="compact-xs"
                            variant="subtle"
                            data-run-waiting=""
                            leftSection={<GLYPHS.play size={12} aria-hidden />}
                            aria-label={`Run ${name}`}
                            onClick={() => {
                                for (const id of waitingSteps) {
                                    session.scope.allowRun(reading.rule, id);
                                }
                            }}
                        >
                            Run
                        </Button>
                    )}
                    {!ws && !editing && recipeTitle && editButton}
                </div>
                {!ws && !editing && !recipeTitle && (
                    // At rest the sidebar says the selection in one calm line; Edit opens the modal.
                    <Tooltip label={restSummary} openDelay={500}>
                        <div {...rowProps("summary", TITLE, restSummary, null)} className="sel-row sel-summary-row">
                            <Text size="sm" c="dimmed" className="sel-value">
                                {restSummary}
                            </Text>
                            {editButton}
                        </div>
                    </Tooltip>
                )}
                {(editing || !ws ? [] : rule.branches).map((branch, at) => {
                    const branchRead = branchReading(branch.id);
                    const color = branchRead?.color ?? branch.color ?? "currentColor";
                    const letter = branchName(branch);
                    const stepIds = branch.steps.map((step) => step.id ?? "");
                    const branchId = branch.id ?? "";
                    const newOp = adding?.op ?? newVerb(branch);
                    return (
                        <div // NOSONAR(S6819): a tree's subtree is an ARIA group of treeitems; a fieldset is not one
                            key={branch.id}
                            role="group"
                            className="sel-group"
                            data-branch={branch.id}
                            data-multi={multi ? "" : undefined}
                        >
                            {multi && (
                                <Tooltip
                                    label={`${formatNumber(branchRead?.count ?? 0)}, under ${underOf(at).join(", ")}`}
                                    disabled={!ws || !previewing || underOf(at).length === 0}
                                    openDelay={500}
                                >
                                    <div // NOSONAR(S6848): a treeitem; rowProps gives its role, tab stop and keys
                                        {...rowProps(
                                            branchId,
                                            branchId,
                                            [
                                                letter,
                                                colorWord(color),
                                                groupCount(branch, branchRead) === ""
                                                    ? ""
                                                    : countWords(branchRead?.count ?? 0, of, side),
                                                branch.on === false ? "off" : "",
                                                startEmpties(branch, branchRead) ? "passes none" : "",
                                            ]
                                                .filter((each) => each !== "")
                                                .join(", "),
                                            branch,
                                        )}
                                        {...(ws ? dragProps(branch, branchId, false) : {})}
                                        className="sel-row sel-group-row"
                                        onDoubleClick={() => {
                                            if (ws) {
                                                setRenaming(branchId);
                                            }
                                        }}
                                    >
                                        <Text size="sm" className="sel-verb sel-or-word">
                                            {at > 0 ? "or" : ""}
                                        </Text>
                                        <span
                                            className="sel-chit"
                                            data-filled={previewing ? "" : undefined}
                                            style={{
                                                borderColor: color,
                                                background: previewing ? color : "transparent",
                                            }}
                                            aria-hidden
                                        />
                                        {ws && renaming === branch.id ? (
                                            // Figma's rename: the name preselected, Enter or a click away keeps it.
                                            <InlineRename
                                                value={letter}
                                                label={`Rename ${letter}`}
                                                onCommit={(typed) => {
                                                    const text = typed.trim();
                                                    if (text !== letter) {
                                                        onChange(
                                                            editBranch(rule, branchId, {
                                                                name: text === "" ? undefined : text,
                                                            }),
                                                        );
                                                    }
                                                    setRenaming(null);
                                                }}
                                                onCancel={() => {
                                                    setRenaming(null);
                                                }}
                                            />
                                        ) : (
                                            <Text size="sm" className="sel-value">
                                                {letter}
                                            </Text>
                                        )}
                                        {(branch.on === false || startEmpties(branch, branchRead)) && (
                                            <Text size="sm" c="dimmed" className="sel-state">
                                                {branch.on === false ? "Off" : "Passes none"}
                                            </Text>
                                        )}
                                        <span className="sel-spacer" />
                                        {ws && (
                                            <ToggleIconButton
                                                className="sel-eye"
                                                variant="swap"
                                                label={`Use ${letter}`}
                                                tooltip={`Use ${letter} (Space)`}
                                                icon={<GLYPHS.hide size={12} aria-hidden />}
                                                checkedIcon={<GLYPHS.show size={12} aria-hidden />}
                                                checked={branch.on !== false}
                                                tabIndex={-1}
                                                onChange={() => {
                                                    toggle(branch);
                                                }}
                                            />
                                        )}
                                        <Text size="sm" className="sel-count">
                                            {groupCount(branch, branchRead)}
                                        </Text>
                                    </div>
                                </Tooltip>
                            )}
                            {/* Hidden while a step is added to the group: the new step's row says what it starts from. */}
                            {allRow(branch) && !(ws && adding?.branch === branch.id) && (
                                <div // NOSONAR(S6848): a pointer shortcut; its group's own row above is the keyboard stop
                                    {...(multi
                                        ? { "data-selects": branchId, className: "sel-row sel-all-row" }
                                        : {
                                              ...rowProps(
                                                  `all:${branchId}`,
                                                  branchId,
                                                  `All ${NOUNS[side].many}`,
                                                  branch,
                                              ),
                                              className: "sel-row sel-all-row",
                                          })}
                                    onClick={() => {
                                        if (ws) {
                                            select(branchId);
                                        } else {
                                            openAt(branchId, `all:${branchId}`);
                                        }
                                    }}
                                >
                                    <span className="sel-verb" />
                                    <Text size="sm" c="dimmed">
                                        {`All ${NOUNS[side].many}`}
                                    </Text>
                                </div>
                            )}
                            {(recipeTitle ? [] : branch.steps).map((step, index) => {
                                const id = step.id ?? "";
                                const read = readingOf(id);
                                const words = outlineWords.get(id) ?? rowWords(session, step, side, read);
                                const reason = reasonWords(read?.reason ?? null, stepIds);
                                const verb = VERB_WORDS[step.op];
                                // A narrowing step says no verb (the owner, ws-polish 2): Keep is
                                // what a step does unless it says Except or Add.
                                // The row says "Run"; the estimate is in its tooltip and the pane's button.
                                const short = reason.short.replace(/ \(.*\)$/u, "");
                                const state = stateWord(step, read, short, index, branch, reading, of);
                                // A group's first step at the group's own verb, and every Keep step,
                                // leave the verb column empty.
                                const quiet = step.op === "keep" || (index === 0 && step.op === newVerb(branch));
                                const verbWord = quiet ? "" : verb.word;
                                // Every row ends with its state word, the selected one too, as the
                                // sidebar's does (ws-polish 2).
                                const drawnState = state;
                                const soFar =
                                    read === undefined ||
                                    read.waiting ||
                                    (branch.start === "none" && UNSET.has(read.reason?.code ?? ""))
                                        ? ""
                                        : `, ${formatNumber(read.count)} of ${formatNumber(of)} ${NOUNS[side].many} so far`;
                                const test = rowTest(words);
                                const said = [words.value, test].filter((each) => each !== "").join(" ");
                                const full = [
                                    quiet ? "" : `${verb.word} (${verb.figma})`,
                                    said,
                                    ...words.tags,
                                    reason.long,
                                ]
                                    .filter((each) => each !== "")
                                    .join(", ");
                                const label = [verbWord, said, ...words.tags, state]
                                    .filter((each) => each !== "")
                                    .join(", ");
                                return (
                                    <Tooltip key={id} label={`${full}${soFar}`} openDelay={500}>
                                        <div
                                            {...rowProps(id, id, `${label}${soFar}`, branch, id)}
                                            {...(ws ? dragProps(branch, id, true) : {})}
                                            data-state={step.on === false ? "off" : read?.state}
                                            className="sel-row sel-step-row"
                                        >
                                            <Text size="sm" className="sel-verb">
                                                {verbWord}
                                            </Text>
                                            <Text
                                                size="sm"
                                                className="sel-value"
                                                data-whole={isRelative(step.rule) ? "" : undefined}
                                            >
                                                {words.value}
                                            </Text>
                                            {words.test !== "" && (
                                                <Text size="sm" className="sel-test">
                                                    {words.test}
                                                </Text>
                                            )}
                                            {words.more !== undefined && (
                                                <Text size="sm" className="sel-more">
                                                    {words.moreShort ?? words.more}
                                                </Text>
                                            )}
                                            {words.tags.map((tag) => (
                                                // An Edges tag is the word alone; its condition is in the
                                                // tooltip and on Advanced's right.
                                                <Text key={tag} size="sm" span className="sel-tag">
                                                    {tag.startsWith("Edges:") ? "Edges" : tag}
                                                </Text>
                                            ))}
                                            {drawnState !== "" && (
                                                <Text size="sm" c="dimmed" className="sel-state">
                                                    {drawnState}
                                                </Text>
                                            )}
                                        </div>
                                    </Tooltip>
                                );
                            })}
                            {ws && adding !== null && adding.branch === branch.id && (
                                // The step being added, lit as the selected row; its pane holds its value field.
                                <div
                                    className="sel-row sel-step-row"
                                    data-new-step=""
                                    data-selected=""
                                    aria-hidden="true"
                                >
                                    <Text size="sm" className="sel-verb">
                                        {newOp === "keep" || branch.steps.length === 0 ? "" : VERB_WORDS[newOp].word}
                                    </Text>
                                    <Text size="sm" c="dimmed" className="sel-value">
                                        Value...
                                    </Text>
                                </div>
                            )}
                            {showAdd(branch) && (
                                <AddRow
                                    id={`add:${branchId}`}
                                    branchId={branchId}
                                    label={newVerb(branch) === "keep" ? "And..." : "Add..."}
                                    tabbed={tabbed}
                                    onWalk={(event) => walk(event, ws)}
                                    onFocus={setActive}
                                    onRun={() => {
                                        if (ws) {
                                            startAdding(branch, newVerb(branch));
                                        } else {
                                            openAt(TITLE, `add:${branchId}`, branch);
                                        }
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
                {ws && previewing && reading.pending.length === 0 && of > reading.total.count && (
                    // What no group holds, drawn faint on the canvas: the outline's last row, in place
                    // of a key over the preview (the owner's review, ws-polish 3).
                    <div className="sel-row sel-nomatch-row" role="none" data-no-match="">
                        <span className="sel-verb" />
                        <span className="sel-chit sel-chit-faint" aria-hidden />
                        <Text size="sm" c="dimmed" className="sel-value">
                            No match
                        </Text>
                        <span className="sel-spacer" />
                        <Text size="sm" c="dimmed" className="sel-count">
                            {formatNumber(of - reading.total.count)}
                        </Text>
                    </div>
                )}
            </div>
        );
    };

    // The title's "..." items: framing the matches and the table, a style layer's Select N, then
    // the host's own (a filter card's).
    const titleItems: readonly SelectionMenuItem[] = [
        ...(onRename === undefined
            ? []
            : [
                  {
                      id: "rename",
                      label: "Rename",
                      icon: "rename" as const,
                      group: "edit" as const,
                      onRun: () => {
                          setRenamingTitle(true);
                      },
                  },
              ]),
        {
            id: "fit",
            label: "Frame the matches",
            icon: "maximize",
            group: "edit",
            onRun: () => {
                void element?.applyCameraView("fitToGraph", {
                    scope: reading.result,
                    params: { keepAngle: true },
                    animate: true,
                });
            },
        },
        {
            id: "table",
            label: strip ? "Hide table" : "Show table",
            icon: "table",
            group: "edit",
            onRun: toggleStrip,
        },
        ...(host === "selector"
            ? [
                  {
                      id: "select",
                      label: `Select ${formatNumber(reading.total.count)}`,
                      icon: "selection" as const,
                      group: "edit" as const,
                      reason: reading.total.count === 0 ? `No ${NOUNS[side].many} match` : null,
                      reasonDrawn: false,
                      onRun: () => {
                          showMembers(reading.result, null);
                      },
                  },
              ]
            : []),
        ...(titleMenu ?? []),
        {
            id: "clear",
            label: "Clear",
            icon: "delete",
            group: "remove",
            onRun: clear,
        },
    ];

    // A folded card's summary: what each of its steps selects, in one line. The test comes first in
    // the words the row gives it; an algorithm goes by its method, never its field, so what was
    // picked is not the part an ellipsis takes.
    const foldedStep = (step: UnionStep): string => {
        const words = outlineWords.get(step.id ?? "");
        const test = words === undefined ? "" : rowTest(words);
        const value = words?.value ?? "";
        const name = step.rule.kind === "measure" ? (value.split(":")[0] ?? value) : value;
        return [name, test === "" ? untestedWords(step, readingOf(step.id)) : test]
            .filter((each) => each !== "")
            .join(" ");
    };
    const foldedWords = (branch: UnionBranch): string =>
        branch.steps.length === 0
            ? startWords(branch)
            : branch.steps
                  .map((step, index) =>
                      index === 0 && step.op === newVerb(branch)
                          ? foldedStep(step)
                          : `${VERB_WORDS[step.op].word.toLowerCase()} ${foldedStep(step)}`,
                  )
                  .join(", ");
    /**
     * A card's step: the card's value (its first step) or a narrowing condition under it, its
     * controls inline in the card (the approved prototype).
     * @param branch - the card's group.
     * @param step - the step.
     * @param index - its place in the group.
     * @returns the step.
     */
    const cardStep = (branch: UnionBranch, step: UnionStep, index: number): React.JSX.Element => {
        const id = step.id ?? "";
        const branchId = branch.id ?? "";
        // The card's value says no verb; a narrowing condition says Keep or Except.
        const natural = index === 0 && step.op === newVerb(branch);
        return (
            <div
                key={id}
                className="sel-card-step"
                data-row={id}
                data-state={step.on === false ? "off" : readingOf(id)?.state}
            >
                <StepPane
                    session={session}
                    rule={rule}
                    branch={branch}
                    step={step}
                    reading={readingOf(id)}
                    host={host}
                    of={of}
                    first={index === 0}
                    last={index === branch.steps.length - 1}
                    total={reading.total.count}
                    hostPicks={hostPicks}
                    adds={
                        natural ? undefined : (
                            <Text size="sm" fw={600} className="sel-card-verb" data-op={step.op}>
                                {VERB_WORDS[step.op].word}
                            </Text>
                        )
                    }
                    cards
                    done={
                        index === 0 ? undefined : (
                            <TargetTooltip label="Remove">
                                <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    aria-label={`Remove ${stepName(step)}`}
                                    onClick={() => {
                                        removeStepAt(branch, id);
                                    }}
                                >
                                    <GLYPHS.close size={12} aria-hidden />
                                </ActionIcon>
                            </TargetTooltip>
                        )
                    }
                    onStep={(patch) => {
                        lastEdited.current = id;
                        onChange(editStep(rule, branchId, id, patch));
                    }}
                    onMove={(by) => {
                        moveStepBy(branch, id, by);
                    }}
                    onToggle={() => {
                        toggle(branch, id);
                    }}
                    onDuplicate={() => {
                        duplicate(branch, id);
                    }}
                    onRemove={() => {
                        removeStepAt(branch, id);
                    }}
                />
            </div>
        );
    };
    // A card moved by its keys keeps focus on its grip.
    const moveCardBy = (id: string, by: -1 | 1): void => {
        moveBranchBy(id, by);
        focusAfter.current = `[data-card-grip="${CSS.escape(id)}"]`;
    };
    // A card's x: the card goes; the last card goes back to one empty card.
    const removeCard = (branch: UnionBranch): void => {
        if (rule.branches.length > 1) {
            removeBranchOf(branch);
            return;
        }
        onChange(newSelection(rule.side, rule.within));
        say(`Removed ${branchName(branch)}`);
        setSelected(null);
        setAdding(null);
    };
    // A card's keys, as its "..." menu shows them, on the card itself (a click on its blank space
    // focuses it) or on its header's controls (its grip, its fold, ...).
    const cardKeys = (event: React.KeyboardEvent<HTMLElement>): void => {
        const target = event.target as HTMLElement;
        const card = target.matches("[data-card-id]")
            ? target
            : target.closest<HTMLElement>("[data-card-id] > .cm-card-head")?.parentElement;
        const branchId = card?.dataset.cardId;
        const branch = rule.branches.find((each) => each.id === branchId);
        if (branch === undefined || isTypingTarget(target)) {
            return;
        }
        const at = rule.branches.indexOf(branch);
        const item = cardItems(branch, at).find(
            (each) =>
                each.key !== undefined && (each.reason ?? null) === null && matchesKey(event.nativeEvent, each.key),
        );
        if (item === undefined) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        item.onRun();
    };
    // A card's "..." items.
    const cardItems = (branch: UnionBranch, at: number): readonly SelectionMenuItem[] => {
        const branchId = branch.id ?? "";
        const letter = branchName(branch);
        const branchRead = branchReading(branch.id);
        const on = branch.on !== false;
        return [
            {
                id: "rename",
                label: "Rename",
                icon: "rename",
                group: "edit",
                key: "F2",
                onRun: () => {
                    setRenaming(branchId);
                },
            },
            {
                id: "hide",
                label: on ? "Turn off" : "Turn on",
                icon: on ? "hide" : "show",
                group: "edit",
                key: "Shift+Mod+H",
                onRun: () => {
                    toggle(branch);
                },
            },
            {
                id: "duplicate",
                label: "Duplicate",
                icon: "duplicate",
                group: "edit",
                key: "Mod+D",
                reason: reading.branchesLeft === 0 ? "No more cards" : null,
                reasonDrawn: false,
                onRun: () => {
                    duplicate(branch);
                },
            },
            {
                id: "save",
                label: "Save as set",
                icon: "several",
                group: "edit",
                reason: (branchRead?.count ?? 0) === 0 ? `No ${NOUNS[side].many} in it` : null,
                reasonDrawn: false,
                onRun: () => {
                    const members = branchRead?.members;
                    if (members !== undefined) {
                        void session.sets.createFrom(members, { name: letter }).then(() => {
                            say(`Saved ${letter} as a set`);
                        });
                    }
                },
            },
            {
                id: "up",
                label: "Move up",
                icon: "moveUp",
                group: "edit",
                key: "Mod+]",
                reason: at === 0 ? "Already at the top" : null,
                reasonDrawn: false,
                onRun: () => {
                    moveCardBy(branchId, -1);
                },
            },
            {
                id: "down",
                label: "Move down",
                icon: "moveDown",
                group: "edit",
                key: "Mod+[",
                reason: at === rule.branches.length - 1 ? "Already at the bottom" : null,
                reasonDrawn: false,
                onRun: () => {
                    moveCardBy(branchId, 1);
                },
            },
            {
                id: "delete",
                label: "Delete",
                icon: "delete",
                group: "remove",
                key: "Delete",
                onRun: () => {
                    removeCard(branch);
                },
            },
        ];
    };
    // "+ Card": the value picked is the new card's value; the cards before it fold.
    const addCard = (stepRule: RuleTree): void => {
        const made = addBranch(rule);
        const withValue = addStep(made.rule, made.id, "add", stepRule);
        lastEdited.current = withValue.id;
        // CardList folds the cards before it as it is appended.
        onChange(withValue.rule);
        setAdding(null);
        if (hasTest(stepRule)) {
            focusAfter.current = TEST_FOCUS.map((each) =>
                each.replace(".sel-ws-cards", `[data-step-pane="${CSS.escape(withValue.id)}"]`),
            );
        }
    };
    // The value picker of an empty card closed with nothing chosen: a new filter card taken back
    // by Escape goes (spec 25); otherwise the card stays empty.
    const emptyClosed = (): void => {
        if (
            escaped.current &&
            onEmptyCancel !== undefined &&
            openedNew.current &&
            rule.branches.every((each) => each.steps.length === 0)
        ) {
            say("Filter not added");
            onEmptyCancel();
        }
    };

    /**
     * The workspace's cards (the approved prototype): one colored card per group -- its header
     * (color, letter, count, "..." and x), its value picker, and once it has a value, that value's
     * controls inline and Keep and Except along its bottom -- then "+ Card".
     * @returns the cards.
     */
    const cards = (): React.JSX.Element => (
        <CardList
            label="Cards"
            header={titleExtra}
            items={rule.branches.map((branch, at): CardListItem => {
                const branchRead = branchReading(branch.id);
                const letter = branchName(branch);
                const branchId = branch.id ?? "";
                const on = branch.on !== false;
                const narrowing = adding !== null && adding.branch === branchId;
                return {
                    id: branchId,
                    title: letter,
                    color: branchRead?.color ?? branch.color ?? "var(--cm-border)",
                    off: !on,
                    label: `${letter}, ${countWords(branchRead?.count ?? 0, of, side)}`,
                    className: "sel-card",
                    data: { "data-branch": branchId },
                    summary: (
                        <Text size="sm" c="dimmed" truncate span className="sel-card-summary">
                            {foldedWords(branch)}
                        </Text>
                    ),
                    aside:
                        !on || startEmpties(branch, branchRead) ? (
                            <Text size="sm" c="dimmed" className="sel-state">
                                {on ? "Passes none" : "Off"}
                            </Text>
                        ) : undefined,
                    header:
                        branchRead?.state === "pending" ? (
                            <Text size="sm" c="dimmed" className="sel-state">
                                Waits
                            </Text>
                        ) : (
                            <CountChip
                                count={branchRead?.count ?? 0}
                                of={of}
                                side={side}
                                host={host}
                                onClick={() => {
                                    showMembers(branchRead?.members, branchId);
                                }}
                            />
                        ),
                    menu: <PaneMenu name={letter} items={cardItems(branch, at)} />,
                    children: (
                        <>
                            {/* Its own line in the open card, named: beside the count "No nodes" read as
                                the card's result. */}
                            <div className="sel-card-start-row">
                                <Text size="sm" c="dimmed" span>
                                    Start with
                                </Text>
                                <Tooltip
                                    label={`Start with ${branch.start === "all" ? "no" : "all"} ${NOUNS[side].many}`}
                                    openDelay={500}
                                >
                                    <Button
                                        size="compact-xs"
                                        variant="subtle"
                                        className="sel-card-start"
                                        data-start={branch.start}
                                        onClick={() => {
                                            if (converted) {
                                                setStartsAll(!startsAll);
                                                return;
                                            }
                                            onChange(
                                                editBranch(rule, branchId, {
                                                    start: branch.start === "all" ? "none" : "all",
                                                }),
                                            );
                                        }}
                                    >
                                        {startWords(branch)}
                                    </Button>
                                </Tooltip>
                            </div>
                            {branch.steps.length === 0 && (
                                <div className="sel-card-step" data-new-step="">
                                    <NewStepPane
                                        key={branchId}
                                        session={session}
                                        rule={rule}
                                        branch={branch}
                                        open={false}
                                        hostPicks={hostPicks}
                                        host={host}
                                        onPick={(stepRule) => {
                                            pick(branch, newVerb(branch), stepRule);
                                        }}
                                        onCancel={emptyClosed}
                                    />
                                </div>
                            )}
                            {branch.steps.map((step, index) => cardStep(branch, step, index))}
                            {narrowing && (
                                <div className="sel-card-step" data-new-step="">
                                    <NewStepPane
                                        key={`${adding.branch}:${adding.op}`}
                                        session={session}
                                        rule={rule}
                                        branch={branch}
                                        open={adding.open}
                                        hostPicks={hostPicks}
                                        host={host}
                                        lead={
                                            <Text size="sm" fw={600} className="sel-card-verb" data-op={adding.op}>
                                                {VERB_WORDS[adding.op].word}
                                            </Text>
                                        }
                                        onPick={(stepRule) => {
                                            pick(branch, adding.op, stepRule);
                                        }}
                                        onCancel={() => {
                                            stopAdding(branch);
                                        }}
                                    />
                                </div>
                            )}
                        </>
                    ),
                    // Shown once the card's value has a test: Add, Keep and Except change what it holds.
                    footer:
                        narrowing || !cardHolds(branch, branchRead) ? undefined : (
                            <div className="sel-card-actions">
                                {CARD_VERBS.map((op) => (
                                    <Tooltip key={op} label={VERB_TIPS[op]} openDelay={500}>
                                        <Button
                                            size="compact-xs"
                                            variant="subtle"
                                            data-verb={op}
                                            data-add={op === "add" ? branchId : undefined}
                                            leftSection={<VerbGlyph op={op} />}
                                            onClick={() => {
                                                startAdding(branch, op);
                                            }}
                                        >
                                            {VERB_WORDS[op].word}
                                        </Button>
                                    </Tooltip>
                                ))}
                            </div>
                        ),
                };
            })}
            // A card narrowed by a new condition stays open while its picker is up.
            folded={adding === null ? folded : new Set([...folded].filter((id) => id !== adding.branch))}
            onFoldedChange={setFolded}
            renaming={renaming}
            onRenamingChange={setRenaming}
            onRename={(branchId, typed) => {
                const text = typed.trim();
                onChange(editBranch(rule, branchId, { name: text === "" ? undefined : text }));
            }}
            onRemove={(branchId) => {
                const branch = rule.branches.find((each) => each.id === branchId);
                if (branch !== undefined) {
                    removeCard(branch);
                }
            }}
            onReorder={(branchId, to) => {
                onChange(moveBranch(rule, branchId, to));
                say(`Moved to ${letterOf(to)}`);
            }}
            add={
                <AddCard
                    session={session}
                    rule={rule}
                    hostPicks={hostPicks}
                    host={host}
                    left={reading.branchesLeft}
                    most={rule.branches.length}
                    onPick={addCard}
                />
            }
        />
    );

    // The workspace is a modal over the whole app, a margin all round (the owner, 2026-11-04).
    const frame = typeof document === "undefined" ? null : document.querySelector<HTMLElement>(".ws-body");
    useLayoutEffect(() => {
        setPlace(open ? {} : null);
    }, [open]);

    // The canvas is the frame (the owner's rule, 2026-10-24): while the workspace is open,
    // graphty-element's canvas takes the preview cell's box, beside the outline and the properties
    // and above the strip, never under them. On open it frames the graph when more than a quarter
    // of what was drawn now lies outside the cell, and on close the camera goes back where it was.
    const placed = wsPlace !== null && warm;
    useLayoutEffect(() => {
        const cell = wsBox.current?.querySelector<HTMLElement>(".sel-ws-preview");
        const canvas = frame?.querySelector<HTMLElement>(".ws-canvas");
        if (!open || !placed || cell === null || cell === undefined || canvas === null || canvas === undefined) {
            return undefined;
        }
        const camera = element?.getCameraState();
        // Opened while the element is still framing a load: that camera is not where it would have
        // ended, so the drawing is framed again on close rather than put back mid-way.
        const framing = element?.framing === true;
        // The graph is framed in the preview cell once the element has taken the cell's size.
        const fit = (): void => {
            void element?.waitForPainted().then(() => {
                element.zoomToFit();
            });
        };
        // The drawing lies fixed over the modal's preview cell, wherever the canvas column is.
        const placeCanvas = (): void => {
            const inner = cell.getBoundingClientRect();
            canvas.style.setProperty("--sel-preview-top", `${String(inner.top)}px`);
            canvas.style.setProperty("--sel-preview-left", `${String(inner.left)}px`);
            canvas.style.setProperty("--sel-preview-width", `${String(inner.width)}px`);
            canvas.style.setProperty("--sel-preview-height", `${String(inner.height)}px`);
        };
        placeCanvas();
        canvas.dataset.selPreview = "";
        // Placed on the next frame: resizing the canvas inside the observer's own delivery would
        // loop the page's resize observers (graphty-element's follows the canvas).
        const observer = new ResizeObserver(() => {
            requestAnimationFrame(placeCanvas);
        });
        observer.observe(cell);
        observer.observe(canvas);
        // The element resizes its canvas on its own observer; the framing reads the new size after it.
        let frameId = requestAnimationFrame(() => {
            frameId = requestAnimationFrame(fit);
        });
        return () => {
            cancelAnimationFrame(frameId);
            observer.disconnect();
            delete canvas.dataset.selPreview;
            for (const each of ["top", "left", "width", "height"]) {
                canvas.style.removeProperty(`--sel-preview-${each}`);
            }
            if (framing) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(fit);
                });
            } else if (camera !== undefined) {
                void element?.setCameraState(camera);
            }
        };
        // The canvas is placed once per opening; its observer follows the cell from there.
    }, [open, placed, frame, element]);

    // While it is the preview, the drawing is named for it, as its F6 stop follows the workspace's.
    useEffect(() => {
        if (!open || element === null || element === undefined) {
            return undefined;
        }
        const was = element.getAttribute("aria-label");
        element.setAttribute("aria-label", `Preview: ${wsTitle}`);
        return () => {
            if (was === null) {
                element.removeAttribute("aria-label");
            } else {
                element.setAttribute("aria-label", was);
            }
        };
    }, [open, element, wsTitle]);

    // Escape closes the innermost open thing per press (spec 3.4): a list, a menu or a card's
    // settings closes itself; then Advanced; then the workspace closes as Cancel, as its Cancel
    // button shows (the owner, 2026-11-04).
    const wsKeys = (event: React.KeyboardEvent<HTMLElement>): void => {
        if (event.key !== "Escape" || (event.defaultPrevented && event.eventPhase !== Event.CAPTURING_PHASE)) {
            return;
        }
        const target = event.target as HTMLElement;
        if (
            // A list, a menu or a card's settings closes itself on Escape: never the workspace too.
            target.closest(SELF_CLOSING) !== null ||
            // An open Advanced is the disclosure Escape closes below, not a list that closes itself.
            target.matches("[aria-expanded=true]:not(.sel-advanced)") ||
            "expanded" in target.dataset
        ) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const props = target.closest(".sel-ws-cards");
        if (props !== null) {
            const advanced = props.querySelector<HTMLElement>('.sel-advanced[aria-expanded="true"]');
            if (advanced !== null) {
                advanced.click();
                focusWithRing(advanced);
                return;
            }
            // A card named after its only step draws only its title row: its step's pane goes back there.
            const back = recipeOpen ? TITLE : (selected ?? TITLE);
            const row = [back, TITLE]
                .map((each) =>
                    wsBox.current?.querySelector<HTMLElement>(
                        `.sel-ws-outline [data-row="${CSS.escape(each)}"], .sel-ws-outline [data-selects="${CSS.escape(each)}"]`,
                    ),
                )
                .find((each) => each !== null && each !== undefined);
            if (row !== null && row !== undefined) {
                focusWithRing(row);
                return;
            }
        }
        closeAfterPaint("cancel");
    };

    // A press on the drawing or on empty space leaves focus outside the modal's box, where wsKeys
    // never hears Escape: the Cancel button still says Esc, so the workspace hears it there too.
    const cancelLater = useRef(closeAfterPaint);
    cancelLater.current = closeAfterPaint;
    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const keys = (event: KeyboardEvent): void => {
            const target = event.target as HTMLElement;
            if (
                event.key === "Escape" &&
                !event.defaultPrevented &&
                target.closest(`.sel-ws, ${SELF_CLOSING}`) === null
            ) {
                cancelLater.current("cancel");
            }
        };
        document.addEventListener("keydown", keys);
        return () => {
            document.removeEventListener("keydown", keys);
        };
    }, [open]);

    // Tab past the workspace's last control goes to its header (Done, Cancel, Clear), never on to
    // the status bar: the workspace is drawn last in the page, so the header is otherwise far back.
    // The modal keeps Tab inside it both ways: past its last control to its first, and back.
    const tabToHead = (event: React.KeyboardEvent<HTMLElement>): void => {
        if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) {
            return;
        }
        const root = wsBox.current;
        if (root === null) {
            return;
        }
        const stops = tabStops(root);
        const [from, to] = event.shiftKey ? [stops.at(0), stops.at(-1)] : [stops.at(-1), stops.at(0)];
        if (from === event.target && to !== undefined) {
            event.preventDefault();
            to.focus();
        }
    };

    const workspace =
        open && frame !== null
            ? createPortal(
                  // The cards' settings panels are drawn after the modal, above the preview's canvas.
                  <PopoutManager>
                      <DrawnSwatches.Provider value={!colors}>
                          <div className="sel-ws-scrim" aria-hidden />
                          <section // NOSONAR(S6847): only catches keys and presses bubbling from its own controls
                              ref={wsBox}
                              role="dialog"
                              aria-modal="true"
                              aria-labelledby={titleId}
                              tabIndex={-1}
                              className="sel-ws sel-modal sel-editor"
                              data-host={host}
                              style={wsPlace ?? { visibility: "hidden" }}
                              onPointerDownCapture={() => {
                                  escaped.current = false;
                              }}
                              onKeyDownCapture={(event) => {
                                  escaped.current = event.key === "Escape";
                                  // Escape in a pane's box keeps its text (it is written as focus leaves the
                                  // box) and goes to the box's row, unless the box's own list is open: a box
                                  // must never take Escape as "discard what I typed" (spec 3.4).
                                  const target = event.target as HTMLElement;
                                  if (
                                      event.key === "Escape" &&
                                      target.matches("input, textarea") &&
                                      target.closest(".sel-ws-cards") !== null &&
                                      target.closest(SELF_CLOSING) === null &&
                                      target.getAttribute("aria-expanded") !== "true" &&
                                      !("expanded" in target.dataset)
                                  ) {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      wsKeys(event);
                                  }
                              }}
                              onKeyDown={(event) => {
                                  tabToHead(event);
                                  cardKeys(event);
                                  wsKeys(event);
                              }}
                          >
                              <header className="sel-ws-head">
                                  {onRename === undefined ? (
                                      <Text size="sm" fw={600} className="sel-ws-title" id={titleId} truncate>
                                          {wsTitle}
                                      </Text>
                                  ) : (
                                      <TitleName
                                          id={titleId}
                                          owner={ownerName}
                                          name={name}
                                          renaming={renamingTitle}
                                          onRenaming={setRenamingTitle}
                                          onRename={onRename}
                                      />
                                  )}
                                  <Text size="sm" className="sel-count">
                                      {`${formatNumber(reading.total.count)} of ${formatNumber(of)}${wsCountWhere}${shownWords(reading.total)}`}
                                  </Text>
                                  {(drawing || starting || closing || !warm) && (
                                      <Group gap={4} wrap="nowrap" className="sel-state" data-drawing="">
                                          {/* A CSS spinner keeps turning while the page works on a large graph. */}
                                          <Loader size={12} aria-hidden />
                                          <Text size="sm" c="dimmed" span>
                                              Drawing
                                          </Text>
                                      </Group>
                                  )}
                                  <span className="sel-spacer" />
                                  <SegmentedControl
                                      label="Preview"
                                      value={colors ? "colors" : "styled"}
                                      data={[
                                          { value: "colors", label: "Card colors" },
                                          { value: "styled", label: "Styled" },
                                      ]}
                                      onChange={(value) => {
                                          groupColors[host] = value === "colors";
                                          setColors(value === "colors");
                                      }}
                                  />
                                  <PaneMenu name={wsTitle} items={titleItems} />
                                  <span className="sel-ws-gap" />
                                  <Button
                                      size="compact-xs"
                                      variant="subtle"
                                      aria-keyshortcuts="Escape"
                                      rightSection={
                                          <Text span size="sm" c="dimmed" className="sel-key">
                                              Esc
                                          </Text>
                                      }
                                      onClick={() => {
                                          closeAfterPaint("cancel");
                                      }}
                                  >
                                      Cancel
                                  </Button>
                                  <Button
                                      size="compact-xs"
                                      onClick={() => {
                                          closeAfterPaint("done");
                                      }}
                                  >
                                      Done
                                  </Button>
                              </header>
                              <div className="sel-ws-body">
                                  {/* A card's settings open flush with the cards' column, beside the drawing. */}
                                  <Popout.Anchor>
                                      <div className="sel-ws-cards">{cards()}</div>
                                  </Popout.Anchor>
                                  <div className="sel-ws-center" data-strip={strip ? "" : undefined}>
                                      <div className="sel-ws-preview" />
                                      {strip && warm && (
                                          <MatchesStrip
                                              session={session}
                                              rule={reading.rule}
                                              title={name}
                                              branch={stripBranch}
                                              modal
                                          />
                                      )}
                                  </div>
                              </div>
                          </section>
                      </DrawnSwatches.Provider>
                  </PopoutManager>,
                  frame,
              )
            : null;

    return (
        <Stack ref={box} gap={0} className="sel-editor sel-rest" data-host={host} data-open={open ? "" : undefined}>
            {outline("rest")}
            {workspace}
        </Stack>
    );
}

/**
 * The control focus goes to in the workspace's pane: the first of {@link PANE_FOCUS} that can take
 * focus (a box inside a collapsed Advanced cannot).
 * @param root - the workspace.
 * @returns the control, or undefined when none can take focus.
 */
function paneTarget(root: HTMLElement | null): HTMLElement | undefined {
    for (const selector of PANE_FOCUS) {
        const found = [...(root?.querySelectorAll<HTMLElement>(selector) ?? [])].find(
            (each) => canFocus(each) && each.tabIndex >= 0,
        );
        if (found !== undefined) {
            return found;
        }
    }
    return undefined;
}

/** Where focus goes on an empty card: its value field. */
const EMPTY_VALUE = ".sel-ws-cards [data-new-step] [data-first-focus]";

/**
 * Whether a selection is All with no condition: what a new layer or filter card holds.
 * @param rule - the selection.
 * @returns true when it is.
 */
function isEmptyAll(rule: UnionLeaf): boolean {
    return rule.branches.length === 1 && rule.branches[0]?.start === "all" && rule.branches[0].steps.length === 0;
}

/**
 * A selection with every group starting from nothing.
 * @param rule - the selection.
 * @returns the selection.
 */
function asNone(rule: UnionLeaf): UnionLeaf {
    return { ...rule, branches: rule.branches.map((branch) => ({ ...branch, start: "none" as const })) };
}

/** What closes itself on Escape: a list, a menu or a card's settings, never the workspace with it. */
const SELF_CLOSING =
    "[data-portal], [data-popout-portal-container], .mantine-Combobox-dropdown, .mantine-Popover-dropdown, .cm-card-head input";

/** Where focus goes once a value is picked: the test's first control, when it is drawn. */
const TEST_FOCUS: readonly string[] = [
    ".sel-ws-cards .sel-test-box [data-first-focus]",
    ".sel-ws-cards .sel-test-box input:not([type=hidden], [readonly])",
    ".sel-ws-cards .sel-test-box button:not([data-cancel])",
    // A select's own box (Yes or No), which is read-only.
    ".sel-ws-cards .sel-test-box input:not([type=hidden])",
];

/** Where focus goes in a pane that was entered: its first box to type in, else its first control. */
const PANE_FOCUS: readonly string[] = [
    ".sel-pane-box [data-first-focus]",
    ".sel-pane-box input:not([type=hidden], [type=checkbox], [type=radio], [readonly])",
    ".sel-pane-box input:not([type=hidden])",
    ".sel-pane-box button",
];

/**
 * Whether a group draws its "All nodes" row: only when it starts with All and has no step yet, or
 * its first step is Except; otherwise its first step's row already says what it keeps.
 * @param branch - the group.
 * @returns true when the row is drawn.
 */
function allRow(branch: UnionBranch | undefined): boolean {
    return branch?.start === "all" && (branch.steps.length === 0 || branch.steps[0]?.op === "except");
}

/** The reasons a step has not been told enough to hold anything yet: no test, no reference. */
const UNSET: ReadonlySet<string> = new Set(["test-unset", "no-reference"]);

/**
 * A group's count at its row: "Waits" while it waits on a run, nothing while none of its steps
 * has a test yet (a just-added Or group is not "0"), else how many it holds.
 * @param branch - the group.
 * @param read - its reading.
 * @returns the words.
 */
function groupCount(branch: UnionBranch, read: StepsReading["branches"][number] | undefined): string {
    if (read?.state === "pending") {
        return "Waits";
    }
    const untested = read?.steps.every((step) => UNSET.has(step.reason?.code ?? "")) === true;
    return branch.start === "none" && untested ? "" : formatNumber(read?.count ?? 0);
}

/**
 * Whether a card's value has a test, so what it holds can be changed: nothing ticked or no
 * reference yet has none.
 * @param branch - the card's group.
 * @param read - its reading.
 * @returns true when it has.
 */
function cardHolds(branch: UnionBranch, read: StepsReading["branches"][number] | undefined): boolean {
    return branch.steps.length > 0 && read?.steps.every((step) => UNSET.has(step.reason?.code ?? "")) !== true;
}

/**
 * What a folded card says for a step whose row names no test: an untouched number takes every
 * value, a checklist with no tick none, a relative step waits for its reference.
 * @param step - the step.
 * @param read - its reading.
 * @returns the words, or "" where the value says it all.
 */
function untestedWords(step: UnionStep, read: StepReading | undefined): string {
    const code = read?.reason?.code;
    if (code === "no-reference") {
        return "not set";
    }
    if (code === "test-unset") {
        return "none picked";
    }
    const { rule } = step;
    return rule.kind === "range" || (rule.kind === "measure" && rule.test === undefined) ? "all" : "";
}

/**
 * Whether Start with empties a group: it starts with nothing and its first step only narrows.
 * @param branch - the group.
 * @param read - its reading.
 * @returns true when the group passes none because of where it starts.
 */
function startEmpties(branch: UnionBranch, read: StepsReading["branches"][number] | undefined): boolean {
    const [first] = branch.steps;
    return (
        branch.on !== false && branch.start === "none" && first !== undefined && first.op !== "add" && read?.count === 0
    );
}

/**
 * A step row's state word (spec 3.1): Off, the inert or pending reason's short word, or "Passes
 * none" on the step that emptied its group.
 * @param step - the step.
 * @param read - its reading.
 * @param short - its reason's short word.
 * @param index - its place in its group.
 * @param branch - its group.
 * @param reading - the selection's reading.
 * @param of - the base's size.
 * @returns the word, or "".
 */
function stateWord(
    step: UnionBranch["steps"][number],
    read: StepReading | undefined,
    short: string,
    index: number,
    branch: UnionBranch,
    reading: StepsReading,
    of: number,
): string {
    if (step.on === false) {
        return "Off";
    }
    if (read === undefined) {
        return "";
    }
    if (read.state !== "applied" || short !== "") {
        return short;
    }
    if (read.count > 0 || read.waiting) {
        return "";
    }
    const before = reading.branches
        .find((each) => each.id === branch.id)
        ?.steps.find((each) => each.id === branch.steps[index - 1]?.id);
    const start = branch.start === "all" ? of : 0;
    const into = index === 0 ? start : (before?.count ?? 0);
    return into > 0 ? "Passes none" : "";
}

/**
 * The pane of a step being added: its value field, whose value picker opens under
 * it (spec 3.2). A pick writes the step; the picker closing with nothing chosen takes it back.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rule - the selection
 * @param props.branch - the group
 * @param props.open - whether the value picker opens at once
 * @param props.host - where the selection is edited
 * @param props.hostPicks - the host's own picker entries
 * @param props.lead - drawn before the field (a narrowing condition's Keep or Except)
 * @param props.onPick - takes the value's rule
 * @param props.onCancel - takes the step back (the picker closed with nothing chosen)
 * @returns The pane
 */
function NewStepPane({
    session,
    rule,
    branch,
    open: openAtFirst,
    hostPicks,
    host,
    lead,
    onPick,
    onCancel,
}: Readonly<{
    session: GraphSession;
    rule: UnionLeaf;
    branch: UnionBranch;
    open: boolean;
    hostPicks: readonly PickSection[];
    host: Host;
    lead?: React.ReactNode;
    onPick: (stepRule: RuleTree) => void;
    onCancel: () => void;
}>): React.JSX.Element {
    const [open, setOpen] = useState(openAtFirst);
    // A letter typed on the closed field opens the picker with it in the search (ws-polish 3).
    const [seed, setSeed] = useState("");
    const picked = useRef(false);
    // A press on the field itself closes the open list as a click outside it does; the step stays,
    // and the click opens the list again.
    const pressedField = useRef(false);
    const choose = (stepRule: RuleTree): void => {
        picked.current = true;
        onPick(stepRule);
    };
    return (
        <Group gap={4} wrap="nowrap" className="sel-pane sel-card-value" role="group" aria-label="New step">
            {lead}
            <AddCondition
                // The lists are read only while the picker is open: on a large graph they are not free.
                fields={open ? pickerFields(session, sideOf(rule), rule.within, true) : []}
                used={usedPaths(rule, branch)}
                placeholder="Find attributes, results"
                sections={open ? [...hostPicks, ...pickSections(session, rule, choose, host, true)] : []}
                opened={open}
                seed={seed}
                onAdd={(field) => {
                    choose(ruleOfField(session, field, rule.within));
                }}
                onOpened={(next) => {
                    // The list closes before a pick is handed over: decide once the pick has had its turn.
                    if (!next) {
                        setOpen(false);
                        setSeed("");
                        requestAnimationFrame(() => {
                            if (!picked.current && !pressedField.current) {
                                onCancel();
                            }
                            picked.current = false;
                            pressedField.current = false;
                        });
                    }
                }}
                anchor={
                    <InputBase
                        component="button"
                        size="sm"
                        variant="outlined"
                        rightSection={<FieldCaret />}
                        rightSectionPointerEvents="none"
                        type="button"
                        pointer
                        data-first-focus=""
                        aria-label="Value"
                        aria-haspopup="dialog"
                        aria-expanded={open}
                        onPointerDown={() => {
                            pressedField.current = open;
                        }}
                        onMouseDown={(event) => {
                            // With the list open, a press on the field keeps typing in its search.
                            if (open) {
                                event.preventDefault();
                            }
                        }}
                        onClick={() => {
                            setOpen(true);
                            // Forgotten once a close the press caused has had its turn (one frame).
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    pressedField.current = false;
                                });
                            });
                        }}
                        onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => {
                            if (printable(event)) {
                                event.preventDefault();
                                setSeed(event.key);
                                setOpen(true);
                            }
                        }}
                    >
                        <span className="sel-field-text sel-field-empty">Value</span>
                    </InputBase>
                }
            />
        </Group>
    );
}

/**
 * The workspace's title when the selection can be renamed: "Filters / " and its name, which a click
 * or Rename turns into a box (Figma's rename: the name preselected, Enter or a click away keeps it).
 * @param props - Component props
 * @param props.id - the title's id, which names the workspace
 * @param props.owner - what the selection belongs to
 * @param props.name - its name now
 * @param props.renaming - its box is open
 * @param props.onRenaming - opens or closes its box
 * @param props.onRename - takes the typed name, or undefined for none
 * @returns The title
 */
function TitleName({
    id,
    owner,
    name,
    renaming,
    onRenaming,
    onRename,
}: Readonly<{
    id: string;
    owner: string | undefined;
    name: string;
    renaming: boolean;
    onRenaming: (on: boolean) => void;
    onRename: (name: string | undefined) => void;
}>): React.JSX.Element {
    return (
        <Group gap={4} wrap="nowrap" className="sel-ws-title" id={id}>
            {owner !== undefined && (
                // What it belongs to is a short word that keeps its width, whatever the name's length.
                <Text size="sm" fw={600} style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                    {`${owner} /`}
                </Text>
            )}
            {renaming ? (
                <InlineRename
                    value={name}
                    label={`Rename ${name}`}
                    onCommit={(typed) => {
                        const text = typed.trim();
                        if (text !== name) {
                            onRename(text === "" ? undefined : text);
                        }
                        onRenaming(false);
                    }}
                    onCancel={() => {
                        onRenaming(false);
                    }}
                />
            ) : (
                <Tooltip label="Rename" openDelay={500}>
                    <UnstyledButton
                        className="sel-card-name"
                        aria-label={`${name}, rename`}
                        onClick={() => {
                            onRenaming(true);
                        }}
                    >
                        <Text size="sm" fw={600} span truncate>
                            {name}
                        </Text>
                    </UnstyledButton>
                </Tooltip>
            )}
        </Group>
    );
}

/**
 * "+ Card" under the cards: it opens the value picker, and the value picked is a new card's value.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rule - the selection
 * @param props.host - where the selection is edited
 * @param props.hostPicks - the host's own picker entries
 * @param props.left - how many more cards there is room for
 * @param props.most - how many cards there are
 * @param props.onPick - takes the new card's value
 * @returns The button and its picker
 */
function AddCard({
    session,
    rule,
    hostPicks,
    host,
    left,
    most,
    onPick,
}: Readonly<{
    session: GraphSession;
    rule: UnionLeaf;
    hostPicks: readonly PickSection[];
    host: Host;
    left: number;
    most: number;
    onPick: (stepRule: RuleTree) => void;
}>): React.JSX.Element {
    const [open, setOpen] = useState(false);
    const full = left === 0;
    const choose = (stepRule: RuleTree): void => {
        setOpen(false);
        onPick(stepRule);
    };
    return (
        <div className="sel-card-new">
            <AddCondition
                fields={open ? pickerFields(session, sideOf(rule), rule.within, true) : []}
                used={[]}
                placeholder="Find attributes, results"
                sections={open ? [...hostPicks, ...pickSections(session, rule, choose, host, true)] : []}
                opened={open}
                listWidth={ADD_CARD_LIST}
                onAdd={(field) => {
                    choose(ruleOfField(session, field, rule.within));
                }}
                onOpened={(next) => {
                    if (!next) {
                        setOpen(false);
                    }
                }}
                anchor={
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        data-or=""
                        aria-disabled={full}
                        aria-description={full ? `At most ${String(most)} cards` : undefined}
                        data-full={full ? "" : undefined}
                        aria-haspopup="dialog"
                        aria-expanded={open}
                        leftSection={<GLYPHS.add size={12} aria-hidden />}
                        onClick={() => {
                            if (!full) {
                                setOpen(true);
                            }
                        }}
                    >
                        Card
                    </Button>
                }
            />
            {full && (
                <Text size="sm" c="dimmed" span data-card-limit="">
                    {`${String(most)} cards at most`}
                </Text>
            )}
        </div>
    );
}

/**
 * The add row of an empty selection: "And..." (or "Add..." in a group that starts with nothing), in
 * the value column, a tree item of the outline's walk; it opens the value picker for a step with
 * the group's default verb (the pane's segment changes it).
 * @param props - Component props
 * @param props.id - its row id
 * @param props.branchId - its group's id
 * @param props.label - its words
 * @param props.tabbed - the row that holds the outline's Tab stop
 * @param props.onWalk - the outline's arrow walk
 * @param props.onFocus - takes its row id as it takes focus
 * @param props.onRun - opens the value picker
 * @returns The row
 */
function AddRow({
    id,
    branchId,
    label,
    tabbed,
    onWalk,
    onFocus,
    onRun,
}: Readonly<{
    id: string;
    branchId: string;
    label: string;
    tabbed: string;
    onWalk: (event: React.KeyboardEvent<HTMLElement>) => boolean;
    onFocus: (id: string) => void;
    onRun: () => void;
}>): React.JSX.Element {
    return (
        <div
            role="treeitem"
            aria-selected={false}
            className="sel-row sel-add-row"
            data-row={id}
            data-add={branchId}
            tabIndex={tabbed === id ? 0 : -1}
            onFocus={() => {
                onFocus(id);
            }}
            onKeyDown={(event) => {
                if (onWalk(event)) {
                    return;
                }
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onRun();
                }
            }}
            onClick={onRun}
        >
            <span className="sel-verb" />
            <Text size="sm">{label}</Text>
        </div>
    );
}

/**
 * A "..." menu of a pane.
 * @param props - Component props
 * @param props.name - what it is for
 * @param props.items - its items
 * @returns The menu
 */
function PaneMenu({ name, items }: Readonly<{ name: string; items: readonly SelectionMenuItem[] }>): React.JSX.Element {
    return (
        <Menu position="bottom-end" withinPortal>
            <Menu.Target>
                <TargetTooltip label="More">
                    <ActionIcon variant="subtle" size="sm" aria-label={`More for ${name}`}>
                        <GLYPHS.more size={14} aria-hidden />
                    </ActionIcon>
                </TargetTooltip>
            </Menu.Target>
            <Menu.Dropdown data-portal="">
                <SelectionMenuItems items={items} />
            </Menu.Dropdown>
        </Menu>
    );
}

/**
 * A count in a pane, "24 of 77": in a style layer a click selects what it counts; in a filter it
 * opens the table on those rows (spec 2).
 * @param props - Component props
 * @param props.count - the count
 * @param props.of - the base's size
 * @param props.side - nodes or edges
 * @param props.host - where the selection is edited
 * @param props.onClick - shows what it counts
 * @returns The chip
 */
function CountChip({
    count,
    of,
    side,
    host,
    onClick,
}: Readonly<{ count: number; of: number; side: "node" | "edge"; host: Host; onClick: () => void }>): React.JSX.Element {
    const words = countWords(count, of, side);
    const label = host === "selector" ? `Select ${words}` : `Show ${words} in the table`;
    return (
        <Tooltip label={label}>
            <Button
                size="compact-xs"
                variant="subtle"
                className="sel-count"
                aria-label={label}
                onClick={onClick}
            >{`${formatNumber(count)} of ${formatNumber(of)}`}</Button>
        </Tooltip>
    );
}

/**
 * A group's color as a word for its row's name ("teal").
 * @param color - the element's color.
 * @returns the word, or "" for none.
 */
function colorWord(color: string): string {
    return /^#[0-9a-f]{6}/i.test(color) ? colorName(color.slice(0, 7)).toLowerCase() : "";
}

/** The "+ Card" picker's width: wide enough for its rows whatever the button's width (the prototype's). */
const ADD_CARD_LIST = 280;

/** The verbs along a card's bottom once it has a value, in any order: Add widens, Keep and Except narrow. */
const CARD_VERBS: readonly Verb[] = ["add", "keep", "except"];

/** What each card action does, said in its tooltip. */
const VERB_TIPS: Readonly<Record<Verb, string>> = {
    add: "Add what matches to this group",
    keep: "Keep only what matches",
    except: "Take out what matches",
};

/**
 * A verb's glyph: Figma's union, intersect and subtract.
 * @param props - Component props
 * @param props.op - the verb
 * @returns The glyph
 */
function VerbGlyph({ op }: Readonly<{ op: Verb }>): React.JSX.Element {
    const Glyph = GLYPHS[{ add: "union", keep: "intersect", except: "subtract" }[op] as "union"];
    return <Glyph size={12} aria-hidden />;
}
