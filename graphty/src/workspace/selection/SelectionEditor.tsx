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
import { createPortal } from "react-dom";

import { PreviewKey } from "../canvas/PreviewKey";
import { canFocus, focusInspectorTitle, focusIsLost } from "../frame/focus";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { isTypingTarget, matchesKey } from "../keys/keys";
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
import { countWords, letterOf, NOUNS, reasonWords, rowTest, rowWords, stepWords, VERB_WORDS } from "./words";

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
    /** The value picker closed with nothing chosen on a selection with no step (a new card goes). */
    readonly onEmptyCancel?: () => void;
    /** Space on the title row: switches the host's on box (a filter card's), which takes no Tab stop. */
    readonly onTitleToggle?: () => void;
    /** The host's on box is off: said with the title row's name. */
    readonly titleOff?: boolean;
}

/** The rule kinds a step takes with no test: picking one applies it, and the pane shows no test. */
const NO_TEST_KINDS = new Set<RuleTree["kind"]>(["isolated", "self-loop", "repeated-edge"]);

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
 * @param props.hostPicks - the host's own picker entries
 * @param props.autoFocus - takes focus on arrival
 * @param props.lead - drawn first in the title row
 * @param props.titleMenu - the title pane's "..." items
 * @param props.titleExtra - drawn first in the title pane
 * @param props.onEmptyCancel - the selection was left with no step where it never had one
 * @param props.onTitleToggle - Space on the title row
 * @param props.titleOff - the host's on box is off
 * @returns The editor
 */
export function SelectionEditor({
    session,
    rule: given,
    host,
    onChange,
    onDone,
    openFirst = false,
    hold,
    title,
    ownerName,
    openPicker = false,
    openTitle = false,
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
    const { rule } = reading;
    const side = sideOf(rule);
    const name = title ?? `Which ${NOUNS[side].many}`;
    const wsTitle = ownerName === undefined ? name : `${name} -- ${ownerName}`;
    const owner = useId();
    const titleId = useId();
    // The one workspace is this editor's while the store names it (spec 3.0).
    const open = useWorkspaceState((state) => state.selectionWorkspace?.owner === owner);
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
    // The place it was opened in: leaving it closes the workspace as Done (spec 3.0).
    const place = useWorkspaceState((state) => state.place);
    const openedIn = useRef(place);
    const closeRef = useRef<(how: "done" | "cancel") => void>(() => undefined);
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
    // The import filter says its own count once typing pauses; the table's and the selection's
    // lines stay quiet while an editor is open.
    const [heardCount] = useDebouncedValue(
        reading.pending.length > 0 ? null : countWords(reading.total.count, of, side),
        SPEAK_AFTER_MS,
    );
    useAnnounceChange(host === "filter" && open ? heardCount : null);

    /**
     * Opens the workspace on a row (or switches the one open to this selection), keeping every
     * edit of the selection it showed before (spec 3.0).
     * @param row - the row to select.
     * @param from - the sidebar row or Edit that opened it, where focus returns.
     * @param add - a group to add a step to, its value picker open.
     */
    const openAt = (row: string, from: string, add?: UnionBranch): void => {
        if (!open) {
            openedIn.current = store.get().place;
            openedWith.current = reading.rule;
            opener.current = from;
            say(`Editing ${[name, ownerName].filter((each) => each !== undefined).join(", ")}`);
        }
        setSelected(row);
        setActive(row);
        // A selection with no step opens on its new step's pane, the value field focused (spec 3.0).
        const only = rule.branches.length === 1 ? rule.branches[0] : undefined;
        const stepless =
            add === undefined &&
            row === TITLE &&
            titleExtra === undefined &&
            only !== undefined &&
            only.steps.length === 0;
        if (add !== undefined) {
            setAdding({ branch: add.id ?? "", op: newVerb(add), open: true });
        } else if (stepless) {
            // The new step's row is the one lit, never the title's too.
            setSelected(null);
            setAdding({ branch: only.id ?? "", op: newVerb(only), open: false });
            focusAfter.current = PANE_FOCUS;
        } else {
            focusAfter.current = [
                `[data-row="${CSS.escape(row)}"]`,
                `[data-selects="${CSS.escape(row)}"]`,
                `[data-row="${TITLE}"]`,
            ];
        }
        store.set({ selectionWorkspace: { owner, host } });
    };
    /**
     * Closes the workspace: Done keeps every edit; Cancel restores the selection as it was when it
     * opened, as one undo step. A new filter card left with no step goes.
     * @param how - "done" or "cancel".
     */
    const close = (how: "done" | "cancel"): void => {
        const back = openedWith.current;
        const restore = how === "cancel" && back !== null && JSON.stringify(back) !== JSON.stringify(reading.rule);
        if (restore) {
            onChange(back);
        }
        if (store.get().selectionWorkspace?.owner === owner) {
            store.set({ selectionWorkspace: null });
        }
        setSelected(null);
        setAdding(null);
        setKeepShape(false);
        say(how === "done" ? `Done, ${formatNumber(reading.total.count)} of ${formatNumber(of)}` : "Cancelled");
        const from = opener.current;
        focusAfter.current = [
            ...(from === EDIT ? ["[data-edit]"] : []),
            ...(from === null || from === EDIT
                ? []
                : [`[data-row="${CSS.escape(from)}"]`, `[data-selects="${CSS.escape(from)}"]`]),
            `[data-row="${TITLE}"]`,
        ];
        const left = how === "cancel" && back !== null ? back : reading.rule;
        if (onEmptyCancel !== undefined && left.branches.every((branch) => branch.steps.length === 0)) {
            onEmptyCancel();
        }
    };
    closeRef.current = close;
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
            openAt(TITLE, TITLE);
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
    const previewing = open && colors;
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

    // The table's Group column and Matches only, and the key's title, read the open selection
    // (spec 8). One slot, two hosts: an editor that is open claims it, one at rest keeps it only
    // while no other editor holds it, and each clears only its own claim.
    const holder = useWorkspaceState((state) => state.editingSelection?.owner ?? null);
    const stripBranch = useWorkspaceState((state) =>
        state.editingSelection?.owner === owner ? state.editingSelection.branch : null,
    );
    useEffect(() => {
        const was = store.get().editingSelection;
        if (open || was === null || was.owner === owner) {
            store.set({
                editingSelection: {
                    owner,
                    rule: JSON.parse(viewKey) as UnionLeaf,
                    branch: was?.owner === owner ? was.branch : null,
                    title: name,
                },
            });
        }
    }, [viewKey, store, name, open, owner, holder]);
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
     * The pane's add actions, first in its first row: "Condition..." adds a step to the selected
     * row's group, "Or..." adds a group. They act on the selection, never move a row.
     * @param branch - the group "Condition..." adds to, or undefined for none.
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
                        Condition...
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
        if (id !== null) {
            setActive(id);
        }
        if (intoPane) {
            focusAfter.current = PANE_FOCUS;
        }
    };
    const pick = (branch: UnionBranch, op: Verb, stepRule: RuleTree): void => {
        const made = addStep(rule, branch.id ?? "", op, stepRule);
        onChange(made.rule);
        setAdding(null);
        // The new step is selected: its pane holds its test, or, with no test, its row stays lit.
        select(made.id, hasTest(stepRule));
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
    const startAdding = (branch: UnionBranch, op: Verb): void => {
        setAdding({ branch: branch.id ?? "", op, open: true });
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
        if (escaped.current && onEmptyCancel !== undefined && rule.branches.every((each) => each.steps.length === 0)) {
            onEmptyCancel();
            return;
        }
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
        onChange(first === undefined ? empty : editBranch(empty, first.id ?? "", { start: "all" }));
        setSelected(TITLE);
        setAdding(null);
        say("Cleared");
        focusAfter.current = `[data-row="${TITLE}"]`;
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
    // The outline holds only recipe rows: "Condition..." and "Or..." live in the pane's first row,
    // so selecting a row changes only its highlight (the owner's review, repolish 2). An empty
    // selection keeps its one "Condition..." row.
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
        const rowProps = (
            id: string,
            selects: string,
            label: string,
            branch: UnionBranch | null,
            stepId?: string,
        ): React.HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string | undefined> => ({
            role: "treeitem",
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
                        [name, countWords(reading.total.count, of, side), ...(titleOff ? ["off"] : [])].join(", "),
                        null,
                    )}
                    className="sel-row sel-title-row"
                    {...(ws && recipeOpen ? { "aria-selected": true } : {})}
                >
                    {lead}
                    <Text size="sm" fw={600} className="sel-title">
                        {name}
                    </Text>
                    {recipeTitle && loneStep !== undefined && !(ws && recipeOpen) && recipeState !== "" && (
                        <Text size="sm" c="dimmed" className="sel-state">
                            {recipeState}
                        </Text>
                    )}
                    {/* In the workspace the header says the count; the title row only names it. */}
                    {ws ? (
                        <span className="sel-spacer" />
                    ) : (
                        <Tooltip
                            label={
                                reading.pending.length > 0
                                    ? `${String(reading.pending.length)} waiting`
                                    : `of ${formatNumber(of)} in the ${host === "filter" ? "full" : "filtered"} graph`
                            }
                        >
                            <Text size="sm" className="sel-count" ml="auto">
                                {`${formatNumber(reading.total.count)} of ${formatNumber(of)}`}
                            </Text>
                        </Tooltip>
                    )}
                    {!ws && (
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
                {rule.branches.map((branch, at) => {
                    const branchRead = branchReading(branch.id);
                    const color = branchRead?.color ?? branch.color ?? "currentColor";
                    const letter = branchName(branch);
                    const stepIds = branch.steps.map((step) => step.id ?? "");
                    const branchId = branch.id ?? "";
                    const newOp = adding?.op ?? newVerb(branch);
                    return (
                        <div
                            key={branch.id}
                            role="group"
                            className="sel-group"
                            data-branch={branch.id}
                            data-multi={multi ? "" : undefined}
                        >
                            {multi && (
                                <div
                                    {...rowProps(
                                        branchId,
                                        branchId,
                                        [
                                            letter,
                                            colorWord(color),
                                            countWords(branchRead?.count ?? 0, of, side),
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
                                        style={{ borderColor: color, background: previewing ? color : "transparent" }}
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
                                        {branchRead?.state === "pending"
                                            ? "Waits"
                                            : formatNumber(branchRead?.count ?? 0)}
                                    </Text>
                                </div>
                            )}
                            {allRow(branch) && (
                                <div
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
                                // The row says "Run"; the estimate is in its tooltip and the pane's button.
                                const short = reason.short.replace(/ \(.*\)$/u, "");
                                const state = stateWord(step, read, short, index, branch, reading, of);
                                // A group's first step at the group's own verb leaves the verb column empty.
                                const quiet = index === 0 && step.op === newVerb(branch);
                                // A selected row's pane already says its state.
                                const drawnState = ws && selected === id ? "" : state;
                                const soFar =
                                    read === undefined || read.waiting
                                        ? ""
                                        : `, ${formatNumber(read.count)} of ${formatNumber(of)} ${NOUNS[side].many} so far`;
                                const test = rowTest(words);
                                const said = [words.value, test].filter((each) => each !== "").join(" ");
                                const full = [`${verb.word} (${verb.figma})`, said, ...words.tags, reason.long]
                                    .filter((each) => each !== "")
                                    .join(", ");
                                const label = [verb.word, said, ...words.tags, state]
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
                                                {quiet ? "" : verb.word}
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
                                                    {words.more}
                                                </Text>
                                            )}
                                            {words.tags.map((tag) => (
                                                // A Links tag is the word alone; its condition is in the
                                                // tooltip and on Advanced's right.
                                                <Text key={tag} size="sm" span className="sel-tag">
                                                    {tag.startsWith("Links:") ? "Links" : tag}
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
                                        {VERB_WORDS[newOp].word}
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
            </div>
        );
    };

    // The selected row's pane, at the properties column's full width (spec 3.2).
    const addingBranch = adding === null ? undefined : rule.branches.find((branch) => branch.id === adding.branch);
    const panes = (
        <>
            {adding !== null && addingBranch !== undefined && (
                <NewStepPane
                    key={`${adding.branch}:${String(adding.open)}`}
                    session={session}
                    rule={rule}
                    branch={addingBranch}
                    op={adding.op}
                    open={adding.open}
                    hostPicks={hostPicks}
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
            target.matches("[aria-expanded=true]") ||
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
            const back = selected ?? TITLE;
            const row = wsBox.current?.querySelector<HTMLElement>(
                `.sel-ws-outline [data-row="${CSS.escape(back)}"], .sel-ws-outline [data-selects="${CSS.escape(back)}"]`,
            );
            if (row !== null && row !== undefined) {
                focusWithRing(row);
                return;
            }
        }
        close("done");
    };

    const workspace =
        open && frame !== null
            ? createPortal(
                  <section
                      ref={wsBox}
                      role="region"
                      aria-labelledby={titleId}
                      className="sel-ws sel-editor"
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
                      onKeyDown={wsKeys}
                  >
                      <header className="sel-ws-head">
                          <Text size="sm" fw={600} className="sel-ws-title" id={titleId} truncate>
                              {wsTitle}
                          </Text>
                          <Text size="sm" className="sel-count">
                              {`${formatNumber(reading.total.count)} of ${formatNumber(of)}`}
                          </Text>
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
                                  close("cancel");
                              }}
                          >
                              Cancel
                          </Button>
                          <Button
                              size="compact-xs"
                              onClick={() => {
                                  close("done");
                              }}
                          >
                              Done
                          </Button>
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
                                  <PreviewKey session={session}>{null}</PreviewKey>
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
                              {strip && (
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
 * The pane of a step being added: its verb, and its value field, whose value picker opens under
 * it (spec 3.2). A pick writes the step; the picker closing with nothing chosen takes it back.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rule - the selection
 * @param props.branch - the group
 * @param props.op - the step's verb
 * @param props.open - whether the value picker opens at once
 * @param props.hostPicks - the host's own picker entries
 * @param props.onPick - takes the value's rule
 * @param props.onCancel - takes the step back (the picker closed with nothing chosen)
 * @returns The pane
 */
function NewStepPane({
    session,
    rule,
    branch,
    op,
    open: openAtFirst,
    hostPicks,
    onPick,
    onCancel,
}: Readonly<{
    session: GraphSession;
    rule: UnionLeaf;
    branch: UnionBranch;
    op: Verb;
    open: boolean;
    hostPicks: readonly PickSection[];
    onPick: (stepRule: RuleTree) => void;
    onCancel: () => void;
}>): React.JSX.Element {
    const [open, setOpen] = useState(openAtFirst);
    const picked = useRef(false);
    const choose = (stepRule: RuleTree): void => {
        picked.current = true;
        onPick(stepRule);
    };
    return (
        <Stack gap={6} className="sel-pane" role="group" aria-label={`${VERB_WORDS[op].word}, new step`}>
            <Text size="sm">{VERB_WORDS[op].word}</Text>
            <AddCondition
                // The lists are read only while the picker is open: on a large graph they are not free.
                fields={open ? pickerFields(session, sideOf(rule), rule.within) : []}
                used={usedPaths(rule, branch)}
                placeholder="Find attributes, results"
                sections={open ? [...hostPicks, ...pickSections(session, rule, choose)] : []}
                opened={open}
                onAdd={(field) => {
                    choose(ruleOfField(session, field));
                }}
                onOpened={(next) => {
                    // The list closes before a pick is handed over: decide once the pick has had its turn.
                    if (!next) {
                        setOpen(false);
                        requestAnimationFrame(() => {
                            if (!picked.current) {
                                onCancel();
                            }
                            picked.current = false;
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
                        aria-haspopup="listbox"
                        onClick={() => {
                            setOpen(true);
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
 * The Condition row of an empty selection: "Condition...", in the value column, a tree item of the outline's walk; it opens the
 * value picker for a step with the group's default verb (the pane's segment changes it).
 * @param props - Component props
 * @param props.id - its row id
 * @param props.branchId - its group's id
 * @param props.tabbed - the row that holds the outline's Tab stop
 * @param props.onWalk - the outline's arrow walk
 * @param props.onFocus - takes its row id as it takes focus
 * @param props.onRun - opens the value picker
 * @returns The row
 */
function AddRow({
    id,
    branchId,
    tabbed,
    onWalk,
    onFocus,
    onRun,
}: Readonly<{
    id: string;
    branchId: string;
    tabbed: string;
    onWalk: (event: React.KeyboardEvent<HTMLElement>) => boolean;
    onFocus: (id: string) => void;
    onRun: () => void;
}>): React.JSX.Element {
    return (
        <div
            role="treeitem"
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
            <Text size="sm">Condition...</Text>
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
export function PaneHead({
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
