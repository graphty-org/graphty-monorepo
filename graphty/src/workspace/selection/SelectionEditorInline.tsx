/**
 * THE SELECTION EDITOR WHILE THE `selection-workspace` EXPERIMENT IS OFF (issue #5805): the
 * outline-and-pane workspace as it was before the full-screen modal (`SelectionEditor.tsx`). It is
 * deleted when the experiment graduates (design/ci/channels-pipeline/features.md, section 8).
 *
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
import "./selection-inline.css";

import {
    CompactColorInput,
    FieldCaret,
    focusWithRing,
    InlineRename,
    PopoutManager,
    SegmentedControl,
    TargetTooltip,
    ToggleIconButton,
} from "@graphty/compact-mantine";
import type {
    GraphSession,
    RuleTree,
    StepReading,
    StepsReading,
    UnionBranch,
    UnionLeaf,
} from "@graphty/graphty-element/session";
import {
    ActionIcon,
    Button,
    Collapse,
    Group,
    InputBase,
    Menu,
    Stack,
    Text,
    TextInput,
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
import { CaptionedRow, StepPane } from "./StepPane";
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
    countWords,
    letterOf,
    NOUNS,
    reasonWords,
    rowTest,
    rowWords,
    shortCount,
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
    /** Escape on the sidebar's outline: the host may fold it. */
    readonly onDone?: () => void;
    /** What the selection belongs to, after its name in the workspace's title ("Style layer 1", "Filters"). */
    readonly ownerName?: string;
    /** Selects the first step on arrival (a filter card opened on a value). */
    readonly openFirst?: boolean;
    /** A filter condition being edited: what it would remove stays drawn, faint, while picking (spec 9). */
    readonly hold?: string;
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

/** The share of the drawn nodes the preview cell must hold on open, else the graph is framed. */
const FRAMED_SHARE = 0.75;

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
 * @param props.onDone - Escape on the sidebar outline: the host may fold it
 * @param props.openFirst - opens the workspace on the first step on arrival
 * @param props.hold - the filter condition being edited
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
 * @returns The editor
 */
export function SelectionEditorInline({
    session,
    rule: given,
    host,
    onChange: handOn,
    onDone,
    openFirst = false,
    hold,
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
}: SelectionEditorProps): React.JSX.Element {
    const { store, element } = useWorkspace();
    const reading = useSteps(session, given);
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
    const wsTitle = ownerName === undefined ? name : `${name} -- ${ownerName}`;
    const owner = useId();
    const titleId = useId();
    // The one workspace is this editor's while the store names it (spec 3.0). An opening draws the
    // workspace's header ("Drawing") in the frame of its click or key, and names it in the store, which
    // the panels around it follow, after that frame is painted.
    const named = useWorkspaceState((state) => state.selectionWorkspace?.owner === owner);
    const [opening, setOpening] = useState(false);
    const open = named || opening;
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
    const [colors, setColors] = useState(groupColors[host]);
    const [strip, setStrip] = useState(stripShown[host]);
    // The group the pointer or focus is on: graphty-element marks its members while picking.
    const [marked, setMarked] = useState<string | null>(null);
    // A group deleted under the pointer leaves its last sibling's group row until the pointer
    // leaves the outline, so the row under it never changes (spec 3.1).
    const [keepShape, setKeepShape] = useState(false);
    // Where the workspace lies over the frame, once measured (below).
    const [wsPlace, setPlace] = useState<React.CSSProperties | null>(null);
    // The outline column's width, fixed once the workspace is drawn, until it closes: a row's
    // words never widen it and move the preview (spec 3.0).
    const [outlineWidth, setOutlineWidth] = useState<number | null>(null);
    const box = useRef<HTMLDivElement>(null);
    const wsBox = useRef<HTMLElement>(null);
    const outlineColumn = useRef<HTMLDivElement>(null);
    // What the workspace restores on Cancel, and where focus returns when it closes.
    const openedWith = useRef<UnionLeaf | null>(null);
    // Opened on a selection that did not exist yet (a new filter card, on its arrival): Cancel takes
    // it away. A later opening restores what it held, as for any card.
    const openedNew = useRef(false);
    const openings = useRef(0);
    // The place it was opened in: leaving it closes the workspace as Done (spec 3.0).
    const place = useWorkspaceState((state) => state.place);
    const openedIn = useRef(place);
    const closeRef = useRef<(how: "done" | "cancel") => void>(() => undefined);
    // The step whose pane was last edited: the workspace reopens on it.
    const lastEdited = useRef<string | null>(null);
    const opener = useRef<string | null>(null);
    const arrival = autoFocus && !openPicker ? `[data-row="${TITLE}"]` : null;
    const focusAfter = useRef<string | readonly string[] | number | null>(arrival);
    const multi = rule.branches.length > 1 || (keepShape && rule.branches.length === 1);
    const { of } = reading.total;
    const say = (words: string): void => {
        store.set({ announcement: words });
    };
    const stepName = (step: UnionBranch["steps"][number]): string => stepWords(session, step, side).value;
    // A lone unnamed group goes by the selection's title, as the key and the table say it: a group
    // left alone by a delete never takes another group's letter (spec 3.1).
    const branchName = (branch: UnionBranch): string =>
        branch.name ?? (rule.branches.length === 1 ? name : letterOf(rule.branches.indexOf(branch)));
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
        if (add !== undefined) {
            setAdding({ branch: add.id ?? "", op: newVerb(add), open: !shut, back: row });
        } else if (stepless) {
            // The new step's row is the one lit, never the title's too, and its value picker is
            // open under its field, its search focused (the owner's review, ws-polish 3).
            setSelected(null);
            setAdding({ branch: only.id ?? "", op: newVerb(only), open: true });
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
        const restore =
            !goes && how === "cancel" && back !== null && JSON.stringify(back) !== JSON.stringify(reading.rule);
        if (restore) {
            onChange(back);
        }
        if (store.get().selectionWorkspace?.owner === owner) {
            store.set({ selectionWorkspace: null });
        }
        setSelected(null);
        setAdding(null);
        setKeepShape(false);
        if (goes) {
            say("Filter not added");
            onEmptyCancel();
            return;
        }
        say(how === "done" ? `Done, ${formatNumber(reading.total.count)} of ${formatNumber(of)}` : "Cancelled");
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
        if (how === "cancel" && !goes && back !== null && JSON.stringify(back) !== JSON.stringify(reading.rule)) {
            handOn(back);
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
                focusAfter.current = ".sel-ws-props input[type=radio]:checked";
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
            setSelected(null);
            setAdding(null);
            setKeepShape(false);
        }
        wasOpen.current = open;
    }, [open]);
    // Leaving the place unmounts the editor: the workspace closes with it, as Done.
    useEffect(
        () => () => {
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
    // The group pointed at, else the group whose row is selected, is marked: its members on top in
    // its color, the other groups faint (spec 9).
    const markedNow = marked ?? (multi && rule.branches.some((branch) => branch.id === selected) ? selected : null);
    useEffect(() => {
        if (previewing) {
            view.current = session.styles.showBranches({
                rule: JSON.parse(viewKey) as UnionLeaf,
                rest: "faint",
                // A filter card counts on the full graph, so it is drawn there: the other cards'
                // removals are lifted, and drawn faint, while it is edited.
                ...(host === "filter" ? { base: "full" as const } : {}),
                ...(hold === undefined ? {} : { hold }),
                ...(markedNow === null ? {} : { mark: markedNow }),
            });
        } else {
            view.current?.end();
            view.current = null;
        }
    }, [previewing, viewKey, session, hold, markedNow, host]);
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
    }, [open, element, viewKey, previewing, markedNow]);

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

    const readingOf = (id: string | undefined): StepReading | undefined =>
        reading.branches.flatMap((branch) => branch.steps).find((step) => step.id === id);
    const branchReading = (id: string | undefined): StepsReading["branches"][number] | undefined =>
        reading.branches.find((branch) => branch.id === id);
    const branchOfRow = (id: string | null): UnionBranch | undefined =>
        id === null
            ? undefined
            : rule.branches.find((branch) => branch.id === id || branch.steps.some((step) => step.id === id));

    const focusPane = (): boolean => {
        const target = paneTarget(wsBox.current);
        if (target === undefined) {
            return false;
        }
        focusAfter.current = null;
        focusWithRing(target);
        return true;
    };
    /**
     * The pane's add actions, first in its first row: "And..." (or "Add...") adds a step to the
     * selected row's group, "Or..." adds a group. They act on the selection, never move a row.
     * @param branch - the group "And..." adds to, or undefined for none.
     * @returns the buttons.
     */
    const adds = (branch: UnionBranch | undefined): React.ReactNode => {
        const full = reading.branchesLeft === 0;
        return (
            <>
                {branch !== undefined && (
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        data-add={branch.id}
                        onClick={() => {
                            startAdding(branch, newVerb(branch));
                        }}
                    >
                        {/* Said as what the step does to the group: narrows it (And), or widens a
                            group that starts with nothing (Add), beside Or..., a new group. */}
                        {newVerb(branch) === "keep" ? "And..." : "Add..."}
                    </Button>
                )}
                <Tooltip label={`No more: ${String(rule.branches.length)} is the most`} disabled={!full}>
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        data-or=""
                        aria-disabled={full}
                        data-disabled={full ? true : undefined}
                        onClick={addOr}
                    >
                        Or...
                    </Button>
                </Tooltip>
            </>
        );
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
            focusAfter.current = TEST_FOCUS;
        }
        if (!hasTest(stepRule)) {
            focusAfter.current = `[data-row="${CSS.escape(made.id)}"]`;
        }
    };
    const addOr = (): void => {
        if (reading.branchesLeft === 0) {
            return;
        }
        const made = addBranch(rule);
        onChange(made.rule);
        setAdding({ branch: made.id, op: "add", fresh: true, open: true, back: selected });
        setSelected(null);
    };
    // Only the step being added is lit while it is added: the row selected before is selected
    // again if nothing is picked.
    const startAdding = (branch: UnionBranch, op: Verb): void => {
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
        const empty = newSelection(rule.side, rule.within);
        const first = empty.branches[0];
        const cleared = first === undefined ? empty : editBranch(empty, first.id ?? "", { start: "all" });
        onChange(cleared);
        say("Cleared");
        // A cleared rule has no step: it opens on its new step with the value picker open, as a new
        // rule does (ws-polish 3).
        const only = cleared.branches[0];
        setSelected(null);
        setAdding(only === undefined ? null : { branch: only.id ?? "", op: newVerb(only), open: true });
        focusAfter.current = only === undefined ? `[data-row="${TITLE}"]` : null;
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
    const selectedBranch = rule.branches.find((branch) => branch.id === selected);
    const recipeRead = loneStep === undefined ? undefined : readingOf(loneStep.id);
    const recipeState =
        recipeTitle && loneStep !== undefined
            ? reasonWords(recipeRead?.reason ?? null).short.replace(/ \(.*\)$/u, "")
            : "";
    const recipeOpen = recipeTitle && (selected === TITLE || selected === loneStep?.id);
    const selectedStep = recipeOpen
        ? loneStep
        : branchOfRow(selected)?.steps.find((s) => selected !== null && s.id === selected);

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
                                {`${shortCount(reading.total.count)} of ${shortCount(of)}`}
                            </Text>
                        </Tooltip>
                    )}
                    {!ws && !editing && (
                        <Button
                            size="compact-xs"
                            variant="subtle"
                            data-edit=""
                            aria-label={`Edit ${name}`}
                            onClick={() => {
                                openAt(TITLE, EDIT);
                            }}
                        >
                            Edit
                        </Button>
                    )}
                </div>
                {(editing ? [] : rule.branches).map((branch, at) => {
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
                                        onPointerEnter={() => {
                                            if (ws) {
                                                setMarked(branchId);
                                            }
                                        }}
                                        onPointerLeave={() => {
                                            if (ws) {
                                                setMarked(null);
                                            }
                                        }}
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

    // The selected row's pane, at the properties column's full width (spec 3.2).
    const addingBranch = adding === null ? undefined : rule.branches.find((branch) => branch.id === adding.branch);
    const panes = (
        <>
            {/* A new filter card's Nodes | Edges stays drawn over its first step's picker (spec 3.3). */}
            {adding !== null && addingBranch !== undefined && titleExtra}
            {adding !== null && addingBranch !== undefined && (
                <NewStepPane
                    key={`${adding.branch}:${String(adding.open)}`}
                    session={session}
                    rule={rule}
                    branch={addingBranch}
                    open={adding.open}
                    hostPicks={hostPicks}
                    host={host}
                    onPick={(stepRule) => {
                        pick(addingBranch, adding.op, stepRule);
                    }}
                    onCancel={() => {
                        stopAdding(addingBranch);
                    }}
                />
            )}
            {adding === null && (selected === TITLE || recipeOpen || (selected === null && open)) && (
                <TitlePane
                    name={name}
                    extra={titleExtra}
                    adds={adds(multi ? undefined : rule.branches[0])}
                    menu={[
                        ...(host === "selector"
                            ? [
                                  {
                                      id: "select",
                                      label: `Select ${formatNumber(reading.total.count)}`,
                                      icon: "selection" as const,
                                      group: "edit" as const,
                                      reason: reading.total.count === 0 ? `No ${NOUNS[side].many} match` : null,
                                      onRun: () => {
                                          showMembers(reading.result, null);
                                      },
                                  },
                              ]
                            : []),
                        ...(titleMenu ?? []),
                    ]}
                    done={null}
                />
            )}
            {adding === null && selectedBranch !== undefined && (
                <GroupPane
                    branch={selectedBranch}
                    reading={branchReading(selectedBranch.id)}
                    name={branchName(selectedBranch)}
                    side={side}
                    host={host}
                    of={of}
                    multi={multi}
                    done={null}
                    adds={adds(selectedBranch)}
                    first={rule.branches[0] === selectedBranch}
                    last={rule.branches.at(-1) === selectedBranch}
                    onStart={(start) => {
                        onChange(editBranch(rule, selectedBranch.id ?? "", { start }));
                    }}
                    onRename={() => {
                        setRenaming(selectedBranch.id ?? null);
                    }}
                    onName={(typed) => {
                        const text = typed.trim();
                        if (text !== branchName(selectedBranch)) {
                            onChange(
                                editBranch(rule, selectedBranch.id ?? "", {
                                    name: text === "" ? undefined : text,
                                }),
                            );
                        }
                    }}
                    onToggle={() => {
                        toggle(selectedBranch);
                    }}
                    onShow={() => {
                        showMembers(branchReading(selectedBranch.id)?.members, selectedBranch.id ?? null);
                    }}
                    onDuplicate={() => {
                        duplicate(selectedBranch);
                    }}
                    color={branchReading(selectedBranch.id)?.color ?? selectedBranch.color}
                    onColor={(color) => {
                        onChange(editBranch(rule, selectedBranch.id ?? "", { color }));
                    }}
                    onSave={() => {
                        const members = branchReading(selectedBranch.id)?.members;
                        if (members === undefined) {
                            return;
                        }
                        const setName = branchName(selectedBranch);
                        void session.sets.createFrom(members, { name: setName }).then(() => {
                            say(`Saved ${setName} as a set`);
                        });
                    }}
                    onMove={(by) => {
                        moveBranchBy(selectedBranch.id ?? "", by);
                    }}
                    onDelete={() => {
                        removeBranchOf(selectedBranch);
                    }}
                />
            )}
            {adding === null &&
                selectedStep !== undefined &&
                (() => {
                    const branch = branchOfRow(selectedStep.id ?? null) as UnionBranch;
                    const id = selectedStep.id ?? "";
                    const index = branch.steps.indexOf(selectedStep);
                    return (
                        <StepPane
                            key={id}
                            session={session}
                            rule={rule}
                            branch={branch}
                            step={selectedStep}
                            reading={readingOf(id)}
                            host={host}
                            of={of}
                            first={index === 0}
                            last={index === branch.steps.length - 1}
                            total={reading.total.count}
                            hostPicks={hostPicks}
                            adds={adds(branch)}
                            head={!recipeOpen}
                            onStep={(patch) => {
                                lastEdited.current = id;
                                onChange(editStep(rule, branch.id ?? "", id, patch));
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
                    );
                })()}
        </>
    );

    // Where the workspace lies (spec 3.0): over the canvas column and the side panel its host does
    // not use -- a style layer's the left panel, a filter card's the inspector -- measured from the
    // frame, so the panel beside it stays where it is.
    const frame = typeof document === "undefined" ? null : document.querySelector<HTMLElement>(".ws-body");
    useLayoutEffect(() => {
        if (!open || frame === null) {
            return undefined;
        }
        const shown = (selector: string): DOMRect | null => {
            const panel = frame.querySelector<HTMLElement>(selector);
            return panel !== null && panel.getClientRects().length > 0 ? panel.getBoundingClientRect() : null;
        };
        const measure = (): void => {
            const main = shown(".ws-main");
            if (main === null) {
                return;
            }
            const left = host === "selector" ? shown(".ws-left") : null;
            const right = host === "filter" ? shown(".ws-right") : null;
            const from = left ?? main;
            const to = right ?? main;
            // The opaque columns cover the panel underneath whole, so the preview shows only canvas.
            setPlace({
                left: from.left,
                top: main.top,
                width: to.right - from.left,
                height: main.height,
                "--sel-ws-cover-start": `${String(left?.width ?? 0)}px`,
                "--sel-ws-cover-end": `${String(right?.width ?? 0)}px`,
            } as React.CSSProperties);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(frame);
        for (const selector of [".ws-left", ".ws-main", ".ws-right"]) {
            const panel = frame.querySelector(selector);
            if (panel !== null) {
                observer.observe(panel);
            }
        }
        return () => {
            observer.disconnect();
        };
    }, [open, host, frame]);

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
        // What the whole canvas drew before it took the cell's box.
        const whole = (box: HTMLElement): number =>
            element?.nodesInRect({ x: 0, y: 0, width: box.clientWidth, height: box.clientHeight }).length ?? 0;
        const drawn = whole(canvas);
        const fit = (): void => {
            if (element === null || element === undefined) {
                return;
            }
            const inside = whole(cell);
            if (drawn > 0 && inside < drawn * FRAMED_SHARE) {
                element.zoomToFit();
            }
        };
        const placeCanvas = (): void => {
            const outer = canvas.getBoundingClientRect();
            const inner = cell.getBoundingClientRect();
            canvas.style.setProperty(
                "--sel-preview-inset",
                [inner.top - outer.top, outer.right - inner.right, outer.bottom - inner.bottom, inner.left - outer.left]
                    .map((each) => `${String(Math.max(0, each))}px`)
                    .join(" "),
            );
        };
        placeCanvas();
        canvas.dataset.selInline = "";
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
            delete canvas.dataset.selInline;
            canvas.style.removeProperty("--sel-preview-inset");
            if (camera !== undefined) {
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

    useLayoutEffect(() => {
        if (!open || wsPlace === null) {
            setOutlineWidth(null);
            return;
        }
        if (outlineWidth === null && outlineColumn.current !== null) {
            setOutlineWidth(outlineColumn.current.getBoundingClientRect().width);
        }
    }, [open, wsPlace, outlineWidth]);

    // Escape closes the innermost open thing per press and never discards work (spec 3.4): a list
    // or a menu closes itself; then Advanced; then focus goes from the pane to its outline row;
    // then the workspace closes as Done.
    const wsKeys = (event: React.KeyboardEvent<HTMLElement>): void => {
        if (event.key !== "Escape" || (event.defaultPrevented && event.eventPhase !== Event.CAPTURING_PHASE)) {
            return;
        }
        const target = event.target as HTMLElement;
        if (
            target.closest("[data-portal]") !== null ||
            // An open Advanced is the disclosure Escape closes below, not a list that closes itself.
            target.matches("[aria-expanded=true]:not(.sel-advanced)") ||
            "expanded" in target.dataset
        ) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const props = target.closest(".sel-ws-props");
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
        closeAfterPaint("done");
    };

    // Tab past the workspace's last control goes to its header (Done, Cancel, Clear), never on to
    // the status bar: the workspace is drawn last in the page, so the header is otherwise far back.
    const tabToHead = (event: React.KeyboardEvent<HTMLElement>): void => {
        if (event.key !== "Tab" || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
            return;
        }
        const root = wsBox.current;
        const head = root?.querySelector<HTMLElement>(".sel-ws-head");
        if (root === null || head === null || head === undefined || tabStops(root).at(-1) !== event.target) {
            return;
        }
        const first = tabStops(head).at(0);
        if (first !== undefined) {
            event.preventDefault();
            first.focus();
        }
    };

    const workspace =
        open && frame !== null
            ? createPortal(
                  <section // NOSONAR(S6847): only catches keys and presses bubbling from its own controls
                      ref={wsBox}
                      aria-labelledby={titleId}
                      className="sel-ws sel-inline sel-editor"
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
                              target.closest(".sel-ws-props") !== null &&
                              target.closest("[data-portal]") === null &&
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
                          wsKeys(event);
                      }}
                  >
                      <header className="sel-ws-head">
                          <Text size="sm" fw={600} className="sel-ws-title" id={titleId} truncate>
                              {wsTitle}
                          </Text>
                          <Text size="sm" className="sel-count">
                              {`${formatNumber(reading.total.count)} of ${formatNumber(of)}`}
                          </Text>
                          {(drawing || starting || closing || !warm) && (
                              <Text size="sm" c="dimmed" className="sel-state" data-drawing="">
                                  Drawing
                              </Text>
                          )}
                          <span className="sel-spacer" />
                          <SegmentedControl
                              label="Preview"
                              value={colors ? "colors" : "styled"}
                              data={[
                                  { value: "colors", label: "Group colors" },
                                  { value: "styled", label: "Styled" },
                              ]}
                              onChange={(value) => {
                                  groupColors[host] = value === "colors";
                                  setColors(value === "colors");
                              }}
                          />
                          <Button
                              size="compact-xs"
                              variant="subtle"
                              aria-label="Table of matches"
                              aria-pressed={strip}
                              data-pressed={strip ? "" : undefined}
                              className="sel-ws-toggle"
                              onClick={toggleStrip}
                          >
                              Table
                          </Button>
                          <Tooltip label="Start over (Undo brings it back)">
                              <Button size="compact-xs" variant="subtle" data-ws-clear="" onClick={clear}>
                                  Clear
                              </Button>
                          </Tooltip>
                          <Button
                              size="compact-xs"
                              variant="subtle"
                              onClick={() => {
                                  closeAfterPaint("cancel");
                              }}
                          >
                              Cancel
                          </Button>
                          <Tooltip label="Done (Escape)">
                              <Button
                                  size="compact-xs"
                                  onClick={() => {
                                      closeAfterPaint("done");
                                  }}
                              >
                                  Done
                              </Button>
                          </Tooltip>
                      </header>
                      <div className="sel-ws-body">
                          <div
                              ref={outlineColumn}
                              style={
                                  outlineWidth === null
                                      ? undefined
                                      : { width: outlineWidth, minWidth: outlineWidth, maxWidth: outlineWidth }
                              }
                              className="sel-ws-outline"
                              onPointerLeave={() => {
                                  setKeepShape(false);
                              }}
                          >
                              {outline("ws")}
                          </div>
                          <div className="sel-ws-center" data-strip={strip ? "" : undefined}>
                              <div className="sel-ws-preview">
                                  <Tooltip label="Frame the matches">
                                      <Button
                                          size="compact-xs"
                                          variant="default"
                                          className="sel-ws-fit"
                                          onClick={() => {
                                              void element?.applyCameraView("fitToGraph", {
                                                  scope: reading.result,
                                                  params: { keepAngle: true },
                                                  animate: true,
                                              });
                                          }}
                                      >
                                          Fit
                                      </Button>
                                  </Tooltip>
                              </div>
                              {strip && warm && (
                                  <MatchesStrip
                                      session={session}
                                      rule={reading.rule}
                                      title={name}
                                      branch={stripBranch}
                                  />
                              )}
                          </div>
                          <div className="sel-ws-props sel-pane-box">{panes}</div>
                      </div>
                  </section>,
                  frame,
              )
            : null;

    return (
        <Stack
            ref={box}
            gap={0}
            className="sel-editor sel-rest sel-rest-inline"
            data-host={host}
            data-open={open ? "" : undefined}
        >
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

/** Where focus goes once a value is picked: the test's first control, when it is drawn. */
const TEST_FOCUS: readonly string[] = [
    ".sel-ws-props .sel-test-box [data-first-focus]",
    ".sel-ws-props .sel-test-box input:not([type=hidden], [readonly])",
    ".sel-ws-props .sel-test-box button:not([data-cancel])",
    // A select's own box (Yes or No), which is read-only.
    ".sel-ws-props .sel-test-box input:not([type=hidden])",
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
    onPick,
    onCancel,
}: Readonly<{
    session: GraphSession;
    rule: UnionLeaf;
    branch: UnionBranch;
    open: boolean;
    hostPicks: readonly PickSection[];
    host: Host;
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
        <Stack gap={6} className="sel-pane" role="group" aria-label="New step">
            <AddCondition
                // The lists are read only while the picker is open: on a large graph they are not free.
                fields={open ? pickerFields(session, sideOf(rule), rule.within) : []}
                used={usedPaths(rule, branch)}
                placeholder="Find attributes, results"
                sections={open ? [...hostPicks, ...pickSections(session, rule, choose, host)] : []}
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
                        <span className="sel-field-text sel-field-empty">Value...</span>
                    </InputBase>
                }
            />
        </Stack>
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
 * The Start with segment: No nodes | All nodes.
 * @param props - Component props
 * @param props.side - nodes or edges
 * @param props.start - the group's start
 * @param props.onStart - takes the new start
 * @returns The segment
 */
function StartWith({
    side,
    start,
    onStart,
}: Readonly<{
    side: "node" | "edge";
    start: UnionBranch["start"];
    onStart: (start: UnionBranch["start"]) => void;
}>): React.JSX.Element {
    return (
        <CaptionedRow>
            <SegmentedControl
                label="Start with"
                fullWidth
                data={[
                    { value: "none", label: `No ${NOUNS[side].many}` },
                    { value: "all", label: `All ${NOUNS[side].many}` },
                ]}
                value={start}
                onChange={(next) => {
                    onStart(next === "all" ? "all" : "none");
                }}
            />
        </CaptionedRow>
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
 * The title's pane: the add actions and the "..." items (a style layer's Select N, a filter card's
 * Select N, Duplicate and Delete, then Table and Group colors), then the host's own control (a new
 * filter card's Nodes | Edges). Start with lives in a group's Advanced.
 * @param props - Component props
 * @param props.name - its title
 * @param props.extra - the host's own control
 * @param props.adds - the add actions
 * @param props.menu - the "..." items
 * @param props.done - the Done button
 * @returns The pane
 */
function TitlePane({
    name,
    extra,
    adds,
    menu,
    done,
}: Readonly<{
    name: string;
    extra?: React.ReactNode;
    adds: React.ReactNode;
    menu: readonly SelectionMenuItem[];
    done: React.ReactNode;
}>): React.JSX.Element {
    return (
        <Stack gap={6} className="sel-pane" role="group" aria-label={name}>
            <PaneHead adds={adds}>
                <PaneMenu name={name} items={menu} />
                {done}
            </PaneHead>
            {extra}
        </Stack>
    );
}

/**
 * A pane's first row, the same in every pane: the add actions at the left, then the pane's icon
 * buttons, "..." and Done at the right.
 * @param props - Component props
 * @param props.adds - the add actions
 * @param props.children - the icon buttons, "..." and Done
 * @returns The row
 */
function PaneHead({
    adds,
    children,
}: Readonly<{ adds: React.ReactNode; children: React.ReactNode }>): React.JSX.Element {
    return (
        <Group gap={4} wrap="nowrap" className="sel-pane-head">
            {adds}
            <span className="sel-spacer" />
            {children}
        </Group>
    );
}

/**
 * A group's pane: its name, count and "..." menu, and Start with.
 * @param props - Component props
 * @param props.branch - the group
 * @param props.reading - its reading
 * @param props.name - its name
 * @param props.side - nodes or edges
 * @param props.host - where the selection is edited
 * @param props.of - the base's size
 * @param props.multi - there are several groups
 * @param props.first - it is the first group
 * @param props.last - it is the last group
 * @param props.onStart - takes its new start
 * @param props.onRename - starts renaming it
 * @param props.onToggle - switches it on or off
 * @param props.onShow - selects its members, or shows them in the table
 * @param props.onDuplicate - copies it
 * @param props.color - its color
 * @param props.onColor - takes a new color
 * @param props.onSave - saves its members as a set
 * @param props.onMove - moves it up or down
 * @param props.onDelete - removes it
 * @param props.done - the Done button
 * @param props.onName - takes the name typed in its name box
 * @param props.adds - the add actions
 * @returns The pane
 */
function GroupPane({
    branch,
    done,
    onName,
    reading,
    name,
    side,
    host,
    of,
    multi,
    first,
    last,
    onStart,
    onRename,
    onToggle,
    onShow,
    onDuplicate,
    color,
    onColor,
    onSave,
    onMove,
    onDelete,
    adds,
}: Readonly<{
    adds: React.ReactNode;
    branch: UnionBranch;
    reading: StepsReading["branches"][number] | undefined;
    name: string;
    side: "node" | "edge";
    host: Host;
    of: number;
    multi: boolean;
    first: boolean;
    last: boolean;
    onStart: (start: UnionBranch["start"]) => void;
    onRename: () => void;
    onToggle: () => void;
    onShow: () => void;
    onDuplicate: () => void;
    color: string | undefined;
    onColor: (color: string) => void;
    onSave: () => void;
    onMove: (by: -1 | 1) => void;
    onDelete: () => void;
    done: React.ReactNode;
    onName: (name: string) => void;
}>): React.JSX.Element {
    const on = branch.on !== false;
    const [advanced, setAdvanced] = useState(false);
    return (
        <Stack gap={6} className="sel-pane" role="group" aria-label={name}>
            <PaneHead adds={adds}>
                {multi && (
                    <PaneMenu
                        name={name}
                        items={[
                            {
                                id: "rename",
                                label: "Rename",
                                icon: "rename",
                                group: "edit",
                                key: "F2",
                                onRun: onRename,
                            },
                            {
                                id: "hide",
                                label: on ? "Turn off" : "Turn on",
                                icon: on ? "hide" : "show",
                                group: "edit",
                                key: "Shift+Mod+H",
                                onRun: onToggle,
                            },
                            {
                                id: "duplicate",
                                label: "Duplicate",
                                icon: "duplicate",
                                group: "edit",
                                key: "Mod+D",
                                onRun: onDuplicate,
                            },
                            {
                                id: "save",
                                label: "Save as set",
                                icon: "several",
                                group: "edit",
                                reason: (reading?.count ?? 0) === 0 ? `No ${NOUNS[side].many} in it` : null,
                                onRun: onSave,
                            },
                            {
                                id: "up",
                                label: "Move up",
                                icon: "moveUp",
                                group: "edit",
                                key: "Mod+]",
                                reason: first ? "Already at the top" : null,
                                reasonDrawn: false,
                                onRun: () => {
                                    onMove(-1);
                                },
                            },
                            {
                                id: "down",
                                label: "Move down",
                                icon: "moveDown",
                                group: "edit",
                                key: "Mod+[",
                                reason: last ? "Already at the bottom" : null,
                                reasonDrawn: false,
                                onRun: () => {
                                    onMove(1);
                                },
                            },
                            {
                                id: "delete",
                                label: "Delete",
                                icon: "delete",
                                group: "remove",
                                key: "Delete",
                                onRun: onDelete,
                            },
                        ]}
                    />
                )}
                {done}
            </PaneHead>
            <Group gap={4} wrap="nowrap">
                {multi ? (
                    // The group's name, edited in place: Enter or leaving the box keeps it.
                    <NameBox key={name} name={name} onName={onName} />
                ) : (
                    <Text size="sm">{`All ${NOUNS[side].many}`}</Text>
                )}
                <span style={{ marginLeft: "auto" }} />
                {reading !== undefined && (
                    <CountChip count={reading.count} of={of} side={side} host={host} onClick={onShow} />
                )}
            </Group>
            {multi && color !== undefined && (
                // Its own popout manager: a filter card's editor sits under none (the Data place).
                <PopoutManager>
                    <CompactColorInput
                        variant="field"
                        aria-label={`Color of ${name}`}
                        valueText={colorName(color.slice(0, 7))}
                        width="100%"
                        color={color.slice(0, 7)}
                        defaultColor={color.slice(0, 7)}
                        showOpacity={false}
                        showReset={false}
                        onChangeEnd={(next) => {
                            if (next !== undefined && next.toUpperCase() !== color.slice(0, 7).toUpperCase()) {
                                onColor(next.toUpperCase());
                            }
                        }}
                    />
                </PopoutManager>
            )}
            <UnstyledButton
                className="sel-advanced"
                aria-expanded={advanced}
                onClick={() => {
                    setAdvanced(!advanced);
                }}
            >
                <GLYPHS.expand size={12} aria-hidden style={{ transform: advanced ? undefined : "rotate(-90deg)" }} />
                <Text size="sm" span>
                    Advanced
                </Text>
                {branch.start === "all" && (
                    <Text size="sm" c="dimmed" span ml="auto">
                        {`All ${NOUNS[side].many}`}
                    </Text>
                )}
            </UnstyledButton>
            <Collapse in={advanced}>
                <StartWith side={side} start={branch.start} onStart={onStart} />
            </Collapse>
        </Stack>
    );
}

/**
 * A group's name box in its pane: the name as typed, kept on Enter or on leaving the box.
 * @param props - Component props
 * @param props.name - the group's name
 * @param props.onName - takes the name typed
 * @returns The box
 */
function NameBox({ name, onName }: Readonly<{ name: string; onName: (name: string) => void }>): React.JSX.Element {
    const [text, setText] = useState(name);
    return (
        <TextInput
            size="xs"
            aria-label="Name"
            value={text}
            style={{ flex: 1, minWidth: 0 }}
            onChange={(event) => {
                setText(event.currentTarget.value);
            }}
            onBlur={() => {
                onName(text);
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    onName(text);
                }
            }}
        />
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
