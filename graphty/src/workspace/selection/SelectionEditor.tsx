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
    focusWithRing,
    InlineRename,
    SegmentedControl,
    TargetTooltip,
    ToggleIconButton,
    TooltipShortcut,
} from "@graphty/compact-mantine";
import type {
    GraphSession,
    RuleTree,
    StepReading,
    StepsReading,
    UnionBranch,
    UnionLeaf,
} from "@graphty/graphty-element/session";
import { ActionIcon, Button, Group, Menu, Stack, Text, Tooltip } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import React, { useEffect, useId, useRef, useState } from "react";

import { focusInspectorTitle, focusIsLost } from "../frame/focus";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { formatKey, isTypingTarget, matchesKey } from "../keys/keys";
import { useAnnounceChange } from "../state/useAnnounceChange";
import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { AddCondition } from "../style/WhichPicker";
import { colorName } from "../style/words";
import {
    addBranch,
    addStep,
    duplicateBranch,
    duplicateStep,
    editBranch,
    editStep,
    moveBranch,
    moveStep,
    removeBranch,
    removeStep,
    type Verb,
    verbsFor,
} from "./model";
import { type SelectionMenuItem, SelectionMenuItems } from "./SelectionMenu";
import { StepPane } from "./StepPane";
import { useSteps } from "./useSteps";
import { type Host, pickerFields, type PickSection, pickSections, ruleOfField, sideOf, usedPaths } from "./values";
import { countWords, letterOf, NOUNS, reasonWords, rowWords, stepWords, VERB_WORDS } from "./words";

/** Whether a host's preview shows group colors while picking, for the session (spec 9). */
const groupColors: Record<Host, boolean> = { selector: true, filter: true };

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
    /** Escape with no row selected: the host may close or fold the editor. */
    readonly onDone?: () => void;
    /** Selects the first step on arrival (a filter card opened on a value). */
    readonly openFirst?: boolean;
    /** A filter condition being edited: what it would remove stays drawn, faint, while picking (spec 9). */
    readonly hold?: string;
    /** The title row's name: a filter card's name; "Which nodes" when absent. */
    readonly title?: string;
    /** Opens the value picker on the first group at once (a new filter card). */
    readonly openPicker?: boolean;
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

/** What a click must land outside of to end picking: the editor, its lists, menus and the table. */
const INSIDE =
    "[data-portal], [role=listbox], [role=menu], .mantine-Popover-dropdown, .mantine-Combobox-dropdown, .mantine-Menu-dropdown, .mantine-Tooltip-tooltip, .ws-table";

/**
 * The selection editor.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rule - the selection as the host holds it
 * @param props.host - where it is edited
 * @param props.onChange - takes the next rule, which the host writes
 * @param props.onDone - Escape with no row selected
 * @param props.openFirst - selects the first step on arrival
 * @param props.hold - the filter condition being edited
 * @param props.title - the title row's name
 * @param props.openPicker - opens the value picker on the first group at once
 * @param props.hostPicks - the host's own picker entries
 * @param props.autoFocus - takes focus on arrival
 * @param props.lead - drawn first in the title row
 * @param props.titleMenu - the title pane's "..." items
 * @param props.titleExtra - drawn first in the title pane
 * @param props.onEmptyCancel - the value picker closed with nothing chosen on a selection with no step
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
    openPicker = false,
    hostPicks = [],
    autoFocus = false,
    lead,
    titleMenu,
    titleExtra,
    onEmptyCancel,
}: SelectionEditorProps): React.JSX.Element {
    const { store } = useWorkspace();
    const reading = useSteps(session, given);
    // The element's canonical form: every group and step has its id and color.
    const { rule } = reading;
    const side = sideOf(rule);
    const name = title ?? `Which ${NOUNS[side].many}`;
    // A new filter card shows its title pane (Nodes | Edges) while its first value is picked.
    const [selected, setSelected] = useState<string | null>(() => {
        if (openFirst) {
            return rule.branches[0]?.steps[0]?.id ?? null;
        }
        return openPicker && titleExtra !== undefined ? TITLE : null;
    });
    // Whether the last key was Escape: a picker it closed on a selection with no step takes a new
    // filter card back (spec 25); a click elsewhere only closes the picker.
    const escaped = useRef(false);
    // `fresh`: the group was made by "Or..." for this step, and goes again with it.
    const [adding, setAdding] = useState<{ branch: string; op: Verb; fresh?: boolean } | null>(() => {
        const first = rule.branches[0];
        return openPicker && first?.id !== undefined ? { branch: first.id, op: verbsFor(first)[0] } : null;
    });
    // Where the pointer or focus is: the Add row is drawn under that group.
    const [hovered, setHovered] = useState<string | null>(null);
    const [focused, setFocused] = useState<string | null>(null);
    const [inside, setInside] = useState(false);
    const [active, setActive] = useState<string | null>(null);
    const [renaming, setRenaming] = useState<string | null>(null);
    const [colors, setColors] = useState(groupColors[host]);
    // The group the pointer or focus is on: graphty-element marks its members while picking.
    const [marked, setMarked] = useState<string | null>(null);
    const box = useRef<HTMLDivElement>(null);
    const pane = useRef<HTMLDivElement>(null);
    const focusAfter = useRef<string | readonly string[] | null>(
        autoFocus && !openPicker ? `[data-row="${TITLE}"]` : null,
    );
    const picking = selected !== null || adding !== null;
    const multi = rule.branches.length > 1;
    const { of } = reading.total;
    const say = (words: string): void => {
        store.set({ announcement: words });
    };
    const stepName = (step: UnionBranch["steps"][number]): string => stepWords(session, step, side).value;
    const branchName = (branch: UnionBranch): string => branch.name ?? letterOf(rule.branches.indexOf(branch));
    // The import filter says its own count once typing pauses; the table's and the selection's
    // lines stay quiet while an editor is open.
    const [heardCount] = useDebouncedValue(
        reading.pending.length > 0 ? null : countWords(reading.total.count, of, side),
        SPEAK_AFTER_MS,
    );
    useAnnounceChange(host === "filter" ? heardCount : null);

    // The picking view (spec 9): every layer suspended, members in their group's color, the rest
    // faint; graphty-element draws it. A changed rule replaces the view in place.
    const view = useRef<{ end(): void } | null>(null);
    const viewKey = JSON.stringify(reading.rule);
    const previewing = picking && colors;
    useEffect(() => {
        if (previewing) {
            view.current = session.styles.showBranches({
                rule: JSON.parse(viewKey) as UnionLeaf,
                rest: "faint",
                ...(hold === undefined ? {} : { hold }),
                ...(marked === null ? {} : { mark: marked }),
            });
        } else {
            view.current?.end();
            view.current = null;
        }
    }, [previewing, viewKey, session, hold, marked]);
    // The preview's start and end are said once each (spec 9), never on each redraw.
    const wasPreviewing = useRef(false);
    useEffect(() => {
        if (previewing !== wasPreviewing.current) {
            wasPreviewing.current = previewing;
            store.set({ announcement: previewing ? "Preview: group colors" : "Preview ended" });
        }
    }, [previewing, store]);
    useEffect(
        () => () => {
            view.current?.end();
        },
        [],
    );

    // The table's Group column and Matches only, and the key's title, read the open selection
    // (spec 8). One slot, two hosts: an editor that is picking claims it, one at rest keeps it only
    // while no other editor holds it, and each clears only its own claim.
    const owner = useId();
    const holder = useWorkspaceState((state) => state.editingSelection?.owner ?? null);
    useEffect(() => {
        const was = store.get().editingSelection;
        if (picking || was === null || was.owner === owner) {
            store.set({
                editingSelection: {
                    owner,
                    rule: JSON.parse(viewKey) as UnionLeaf,
                    branch: was?.owner === owner ? was.branch : null,
                    title: name,
                },
            });
        }
    }, [viewKey, store, name, picking, owner, holder]);
    useEffect(
        () => () => {
            if (store.get().editingSelection?.owner === owner) {
                store.set({ editingSelection: null });
            }
        },
        [store, owner],
    );
    // Another editor began picking: this one stops, so the canvas, the key and the table describe one.
    useEffect(() => {
        const now = store.get().editingSelection?.owner ?? null;
        if (picking && now !== null && now !== owner) {
            setSelected(null);
            setAdding(null);
        }
    }, [holder, owner, picking, store]);
    // A click outside the editor, its lists and menus and the table ends picking (spec 3).
    useEffect(() => {
        if (!picking) {
            return undefined;
        }
        const down = (event: PointerEvent): void => {
            escaped.current = false;
            const { target } = event;
            if (!(target instanceof Element) || box.current?.contains(target) || target.closest(INSIDE) !== null) {
                return;
            }
            setSelected(null);
        };
        document.addEventListener("pointerdown", down, true);
        return () => {
            document.removeEventListener("pointerdown", down, true);
        };
    }, [picking]);

    // A row asked for focus (after a move, an add, a remove) gets it once it is drawn.
    useEffect(() => {
        const want = focusAfter.current;
        if (want === null) {
            return;
        }
        const target = (typeof want === "string" ? [want] : want)
            .map((each) => box.current?.querySelector<HTMLElement>(each))
            .find((each) => each !== null && each !== undefined);
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
    const startAdding = (branch: UnionBranch, op: Verb): void => {
        setAdding({ branch: branch.id ?? "", op });
    };
    const stopAdding = (branch: UnionBranch): void => {
        // A step with no value is taken back when its picker closes with nothing chosen (spec 1),
        // and so is the group "Or..." made for it.
        const fresh = adding?.fresh === true && branch.steps.length === 0 && branch.id !== undefined;
        setAdding(null);
        if (fresh) {
            onChange(removeBranch(rule, branch.id ?? ""));
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
    const removeStepAt = (branch: UnionBranch, id: string): void => {
        const at = branch.steps.findIndex((step) => step.id === id);
        const next = branch.steps[at + 1]?.id ?? branch.steps[at - 1]?.id;
        onChange(removeStep(rule, branch.id ?? "", id));
        const gone = branch.steps[at];
        if (gone !== undefined) {
            say(`Removed ${stepName(gone)}`);
        }
        if (selected === id) {
            setSelected(null);
        }
        focusAfter.current = next === undefined ? `[data-row="${TITLE}"]` : `[data-row="${CSS.escape(next)}"]`;
    };
    const removeBranchOf = (branch: UnionBranch): void => {
        onChange(removeBranch(rule, branch.id ?? ""));
        say(`Removed ${branchName(branch)}`);
        setSelected(null);
        focusAfter.current = `[data-row="${TITLE}"]`;
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
    // A group's members: selected (a style layer), or the table on them (a filter, spec 2).
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
        store.set({
            dockOpen: true,
            dockTab: `${side}s`,
            ...(held === null ? {} : { editingSelection: { ...held, branch } }),
        });
    };

    // The outline is one Tab stop walked with the arrows (roving focus); a row's keys act on it.
    const walk = (event: React.KeyboardEvent<HTMLElement>): boolean => {
        const rows = [...(box.current?.querySelectorAll<HTMLElement>(ROW) ?? [])];
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
        // Arrowing onto a row selects it, as Figma's Layers list does; the Add row's verbs only take focus.
        if (row.dataset.selects !== undefined) {
            setSelected(row.dataset.selects);
        }
        row.focus();
        return true;
    };
    const rowKeys = (event: React.KeyboardEvent<HTMLElement>, branch: UnionBranch | null, stepId?: string): void => {
        if (event.target !== event.currentTarget || isTypingTarget(event.target) || walk(event)) {
            return;
        }
        const id = stepId ?? branch?.id ?? TITLE;
        if (event.key === "Enter") {
            event.preventDefault();
            select(event.currentTarget.dataset.selects ?? id, true);
            return;
        }
        if (event.key === "Escape" && selected !== null) {
            event.preventDefault();
            event.stopPropagation();
            setSelected(null);
            return;
        }
        if (branch === null) {
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
            if (stepId === undefined) {
                removeBranchOf(branch);
            } else {
                removeStepAt(branch, id);
            }
        } else if (event.key === "F2" && stepId === undefined) {
            event.preventDefault();
            setRenaming(id);
        } else if (event.key === " " || matchesKey(event.nativeEvent, "Shift+Mod+H")) {
            event.preventDefault();
            toggle(branch, stepId);
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
    const lit = branchOfRow(selected)?.id ?? adding?.branch ?? focused ?? hovered;
    const showAdd = (branch: UnionBranch): boolean =>
        adding?.branch !== branch.id && (empty || (lit !== null && lit === branch.id));
    const showOr = !empty && (inside || picking) && adding === null;
    const rowIds = [
        TITLE,
        ...rule.branches.flatMap((branch) => [
            ...(multi ? [branch.id ?? ""] : []),
            ...(!multi && branch.start === "all" ? [`all:${branch.id ?? ""}`] : []),
            ...branch.steps.map((step) => step.id ?? ""),
        ]),
    ];
    const tabbed = active !== null && rowIds.includes(active) ? active : TITLE;
    const selectedBranch = rule.branches.find((branch) => branch.id === selected);
    const selectedStep = selected === null ? undefined : branchOfRow(selected)?.steps.find((s) => s.id === selected);
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
        "aria-selected": selected === selects,
        "aria-label": label,
        onKeyDown: (event) => {
            rowKeys(event, branch, stepId);
        },
        onFocus: () => {
            setActive(id);
        },
        onClick: (event) => {
            if ((event.target as Element).closest("button, input, label") === null) {
                select(selects);
            }
        },
    });

    return (
        <Stack
            ref={box}
            gap={0}
            className="sel-editor"
            data-host={host}
            onPointerEnter={() => {
                setInside(true);
            }}
            onPointerLeave={() => {
                setInside(false);
                setHovered(null);
            }}
            onFocus={() => {
                setInside(true);
            }}
            onBlur={(event) => {
                const to = event.relatedTarget;
                if (!(to instanceof Node) || !event.currentTarget.contains(to)) {
                    setFocused(null);
                    setInside(false);
                }
            }}
            onPointerDownCapture={() => {
                escaped.current = false;
            }}
            onKeyDownCapture={(event) => {
                escaped.current = event.key === "Escape";
                // Escape in a pane's box ends picking, keeping its text (it is written as it leaves
                // the box), unless the box's own list is open.
                const target = event.target as HTMLElement;
                if (
                    event.key !== "Escape" ||
                    selected === null ||
                    !target.matches("input, textarea") ||
                    target.closest(".sel-pane-box") === null ||
                    target.closest("[data-portal]") !== null ||
                    target.getAttribute("aria-expanded") === "true" ||
                    "expanded" in target.dataset
                ) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                target.blur();
                const back = selected;
                setSelected(null);
                focusAfter.current = [`[data-row="${CSS.escape(back)}"]`, `[data-row="${TITLE}"]`];
            }}
            onKeyDown={(event) => {
                // Escape closes the innermost thing per press: the selected row, then the editor.
                if (event.key !== "Escape" || event.defaultPrevented) {
                    return;
                }
                const target = event.target as Element;
                if (target.closest("[data-portal]") !== null || target.matches("[aria-expanded=true]")) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                if (selected !== null) {
                    const back = selected;
                    setSelected(null);
                    focusAfter.current = [
                        `[data-row="${CSS.escape(back)}"]`,
                        `[data-selects="${CSS.escape(back)}"]`,
                        `[data-row="${TITLE}"]`,
                    ];
                    return;
                }
                onDone?.();
            }}
        >
            <div role="tree" aria-label={name} className="sel-outline">
                <div
                    {...rowProps(TITLE, TITLE, `${name}, ${countWords(reading.total.count, of, side)}`, null)}
                    className="sel-row sel-title-row"
                >
                    {lead}
                    <Text size="xs" fw={600} className="sel-title">
                        {name}
                    </Text>
                    <Tooltip
                        label={
                            reading.pending.length > 0
                                ? `${String(reading.pending.length)} waiting`
                                : `of ${formatNumber(of)} in the ${host === "filter" ? "full" : "filtered"} graph`
                        }
                    >
                        <Text size="xs" fw={600} c="dimmed" className="sel-count" ml="auto">
                            {`${formatNumber(reading.total.count)} of ${formatNumber(of)}`}
                        </Text>
                    </Tooltip>
                </div>
                {rule.branches.map((branch, at) => {
                    const branchRead = branchReading(branch.id);
                    const color = branchRead?.color ?? branch.color ?? "currentColor";
                    const letter = branch.name ?? letterOf(at);
                    const stepIds = branch.steps.map((step) => step.id ?? "");
                    const branchId = branch.id ?? "";
                    const newOp = adding?.op ?? "add";
                    return (
                        <div
                            key={branch.id}
                            role="group"
                            className="sel-group"
                            data-branch={branch.id}
                            data-multi={multi ? "" : undefined}
                            onPointerEnter={() => {
                                setHovered(branchId);
                            }}
                            onFocus={() => {
                                setFocused(branchId);
                            }}
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
                                        ]
                                            .filter((each) => each !== "")
                                            .join(", "),
                                        branch,
                                    )}
                                    {...dragProps(branch, branchId, false)}
                                    className="sel-row sel-group-row"
                                    onPointerEnter={() => {
                                        setMarked(branchId);
                                    }}
                                    onPointerLeave={() => {
                                        setMarked(null);
                                    }}
                                    onDoubleClick={() => {
                                        setRenaming(branchId);
                                    }}
                                >
                                    <span
                                        className="sel-chit"
                                        data-filled={previewing ? "" : undefined}
                                        style={{ borderColor: color, background: previewing ? color : "transparent" }}
                                        aria-hidden
                                    />
                                    {renaming === branch.id ? (
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
                                        <Text size="xs" fw={600} className="sel-value">
                                            {letter}
                                        </Text>
                                    )}
                                    {branch.on === false && (
                                        <Text size="xs" c="dimmed" className="sel-state">
                                            Off
                                        </Text>
                                    )}
                                    <span className="sel-spacer" />
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
                                    <Text size="xs" c="dimmed" className="sel-count">
                                        {branchRead?.state === "pending"
                                            ? "Waits"
                                            : formatNumber(branchRead?.count ?? 0)}
                                    </Text>
                                </div>
                            )}
                            {branch.start === "all" && (
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
                                        select(branchId);
                                    }}
                                >
                                    <span className="sel-verb" />
                                    <Text size="xs" c="dimmed">
                                        {`All ${NOUNS[side].many}`}
                                    </Text>
                                </div>
                            )}
                            {branch.steps.map((step, index) => {
                                const id = step.id ?? "";
                                const read = readingOf(id);
                                const words = rowWords(session, step, side, read);
                                const reason = reasonWords(read?.reason ?? null, stepIds);
                                const verb = VERB_WORDS[step.op];
                                const state = stateWord(step, read, reason.short, index, branch, reading, of);
                                const soFar =
                                    read === undefined || read.waiting
                                        ? ""
                                        : `, ${formatNumber(read.count)} of ${formatNumber(of)} ${NOUNS[side].many} so far`;
                                const said = [words.value, words.test].filter((each) => each !== "").join(" ");
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
                                            {...dragProps(branch, id, true)}
                                            data-state={step.on === false ? "off" : read?.state}
                                            className="sel-row sel-step-row"
                                        >
                                            <Text size="xs" c="dimmed" className="sel-verb">
                                                {verb.word}
                                            </Text>
                                            <Text size="xs" className="sel-value">
                                                {words.value}
                                            </Text>
                                            <Text size="xs" c="dimmed" className="sel-test">
                                                {words.test}
                                            </Text>
                                            {words.tags.map((tag) => (
                                                <span key={tag} className="sel-tag">
                                                    {tag}
                                                </span>
                                            ))}
                                            {state !== "" && (
                                                <Text size="xs" c="dimmed" className="sel-state">
                                                    {state}
                                                </Text>
                                            )}
                                        </div>
                                    </Tooltip>
                                );
                            })}
                            {adding !== null && adding.branch === branch.id && (
                                <NewStep
                                    session={session}
                                    rule={rule}
                                    branch={branch}
                                    op={newOp}
                                    hostPicks={hostPicks}
                                    onPick={(stepRule) => {
                                        pick(branch, newOp, stepRule);
                                    }}
                                    onCancel={() => {
                                        stopAdding(branch);
                                    }}
                                />
                            )}
                            {showAdd(branch) && (
                                <div className="sel-row sel-add-row">
                                    {verbsFor(branch).map((op) => (
                                        <Tooltip
                                            key={op}
                                            label={`${VERB_WORDS[op].word} a step (${VERB_WORDS[op].figma})`}
                                        >
                                            <Button
                                                size="compact-xs"
                                                variant="subtle"
                                                color="gray"
                                                data-row={`add:${branchId}:${op}`}
                                                data-add={op === verbsFor(branch)[0] ? branchId : undefined}
                                                tabIndex={-1}
                                                onKeyDown={(event) => {
                                                    walk(event);
                                                }}
                                                onClick={() => {
                                                    startAdding(branch, op);
                                                }}
                                            >
                                                {`${VERB_WORDS[op].word}...`}
                                            </Button>
                                        </Tooltip>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
                {showOr && (
                    <div className="sel-row sel-or-row">
                        <Tooltip
                            label={
                                reading.branchesLeft === 0
                                    ? `No more: ${String(rule.branches.length)} is the most`
                                    : "Or: match another way"
                            }
                        >
                            <Button
                                size="compact-xs"
                                variant="subtle"
                                color="gray"
                                data-or=""
                                data-row="or"
                                tabIndex={-1}
                                aria-disabled={reading.branchesLeft === 0}
                                data-disabled={reading.branchesLeft === 0 ? true : undefined}
                                onKeyDown={(event) => {
                                    walk(event);
                                }}
                                onClick={() => {
                                    if (reading.branchesLeft === 0) {
                                        return;
                                    }
                                    const made = addBranch(rule);
                                    onChange(made.rule);
                                    setSelected(null);
                                    setAdding({ branch: made.id, op: "add", fresh: true });
                                }}
                            >
                                Or...
                            </Button>
                        </Tooltip>
                    </div>
                )}
            </div>
            {selected !== null && (
                <div ref={pane} className="sel-pane-box">
                    {selected === TITLE && (
                        <TitlePane
                            rule={rule}
                            reading={reading}
                            host={host}
                            name={name}
                            colors={colors}
                            extra={titleExtra}
                            menu={titleMenu}
                            onColors={(next) => {
                                groupColors[host] = next;
                                setColors(next);
                            }}
                            onStart={(start) => {
                                onChange(editBranch(rule, rule.branches[0]?.id ?? "", { start }));
                            }}
                            onShow={() => {
                                showMembers(reading.result, null);
                            }}
                        />
                    )}
                    {selectedBranch !== undefined && (
                        <GroupPane
                            branch={selectedBranch}
                            reading={branchReading(selectedBranch.id)}
                            name={branchName(selectedBranch)}
                            side={side}
                            host={host}
                            of={of}
                            multi={multi}
                            first={rule.branches[0] === selectedBranch}
                            last={rule.branches.at(-1) === selectedBranch}
                            onStart={(start) => {
                                onChange(editBranch(rule, selectedBranch.id ?? "", { start }));
                            }}
                            onRename={() => {
                                setRenaming(selectedBranch.id ?? null);
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
                            onMove={(by) => {
                                moveBranchBy(selectedBranch.id ?? "", by);
                            }}
                            onDelete={() => {
                                removeBranchOf(selectedBranch);
                            }}
                        />
                    )}
                    {selectedStep !== undefined &&
                        (() => {
                            const branch = branchOfRow(selected) as UnionBranch;
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
                                    hostPicks={hostPicks}
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
                </div>
            )}
        </Stack>
    );
}

/** Where focus goes in a pane that was entered: its first box to type in, else its first control. */
const PANE_FOCUS: readonly string[] = [
    ".sel-pane-box [data-first-focus]",
    ".sel-pane-box input:not([type=hidden], [type=checkbox], [type=radio], [readonly])",
    ".sel-pane-box input:not([type=hidden])",
    ".sel-pane-box button",
];

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
 * A step waiting for its value: its verb word in the row, and the value picker open under it.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rule - the selection
 * @param props.branch - the group
 * @param props.op - the step's verb
 * @param props.hostPicks - the host's own picker entries
 * @param props.onPick - takes the value's rule
 * @param props.onCancel - takes the step back (the picker closed with nothing chosen)
 * @returns The row
 */
function NewStep({
    session,
    rule,
    branch,
    op,
    hostPicks,
    onPick,
    onCancel,
}: Readonly<{
    session: GraphSession;
    rule: UnionLeaf;
    branch: UnionBranch;
    op: Verb;
    hostPicks: readonly PickSection[];
    onPick: (stepRule: RuleTree) => void;
    onCancel: () => void;
}>): React.JSX.Element {
    const picked = useRef(false);
    const choose = (stepRule: RuleTree): void => {
        picked.current = true;
        onPick(stepRule);
    };
    return (
        <AddCondition
            fields={pickerFields(session, sideOf(rule), rule.within)}
            used={usedPaths(rule, branch)}
            placeholder="Find attributes, results"
            sections={[...hostPicks, ...pickSections(session, rule, choose)]}
            opened
            onAdd={(field) => {
                choose(ruleOfField(session, field));
            }}
            onOpened={(open) => {
                // The list closes before a pick is handed over: decide once the pick has had its turn.
                if (!open) {
                    requestAnimationFrame(() => {
                        if (!picked.current) {
                            onCancel();
                        }
                        picked.current = false;
                    });
                }
            }}
            anchor={
                <div className="sel-row sel-step-row" data-new-step="">
                    <Text size="xs" c="dimmed" className="sel-verb">
                        {VERB_WORDS[op].word}
                    </Text>
                </div>
            }
        />
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
        <SegmentedControl
            label="Start with"
            data={[
                { value: "none", label: `No ${NOUNS[side].many}` },
                { value: "all", label: `All ${NOUNS[side].many}` },
            ]}
            value={start}
            onChange={(next) => {
                onStart(next === "all" ? "all" : "none");
            }}
        />
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
 * The title's pane: the host's own control (a new filter card's Nodes | Edges), Start with while
 * there is one group, the count, the preview toggle, the Table button and the host's "..." items.
 * @param props - Component props
 * @param props.rule - the selection
 * @param props.reading - its reading
 * @param props.host - where it is edited
 * @param props.name - its title
 * @param props.colors - whether the preview shows group colors
 * @param props.extra - the host's own control
 * @param props.menu - the host's "..." items
 * @param props.onColors - takes the preview toggle
 * @param props.onStart - takes the lone group's start
 * @param props.onShow - shows what the selection holds
 * @returns The pane
 */
function TitlePane({
    rule,
    reading,
    host,
    name,
    colors,
    extra,
    menu,
    onColors,
    onStart,
    onShow,
}: Readonly<{
    rule: UnionLeaf;
    reading: StepsReading;
    host: Host;
    name: string;
    colors: boolean;
    extra?: React.ReactNode;
    menu?: readonly SelectionMenuItem[];
    onColors: (next: boolean) => void;
    onStart: (start: UnionBranch["start"]) => void;
    onShow: () => void;
}>): React.JSX.Element {
    const side = sideOf(rule);
    const [only] = rule.branches;
    return (
        <Stack gap={6} className="sel-pane" role="group" aria-label={name}>
            <Group gap={4} wrap="nowrap">
                <CountChip count={reading.total.count} of={reading.total.of} side={side} host={host} onClick={onShow} />
                <ToggleIconButton
                    label="Group colors"
                    tooltip="Group colors while picking"
                    icon={<GLYPHS.groupColors size={14} aria-hidden />}
                    checked={colors}
                    onChange={onColors}
                    style={{ marginLeft: "auto" }}
                />
                <TableButton side={side} />
                {menu !== undefined && <PaneMenu name={name} items={menu} />}
            </Group>
            {extra}
            {rule.branches.length === 1 && only !== undefined && (
                <StartWith side={side} start={only.start} onStart={onStart} />
            )}
        </Stack>
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
 * @param props.onMove - moves it up or down
 * @param props.onDelete - removes it
 * @returns The pane
 */
function GroupPane({
    branch,
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
    onMove,
    onDelete,
}: Readonly<{
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
    onMove: (by: -1 | 1) => void;
    onDelete: () => void;
}>): React.JSX.Element {
    const on = branch.on !== false;
    return (
        <Stack gap={6} className="sel-pane" role="group" aria-label={name}>
            <Group gap={4} wrap="nowrap">
                <Text size="xs" fw={600}>
                    {multi ? name : `All ${NOUNS[side].many}`}
                </Text>
                <span style={{ marginLeft: "auto" }} />
                {reading !== undefined && (
                    <CountChip count={reading.count} of={of} side={side} host={host} onClick={onShow} />
                )}
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
                                id: "up",
                                label: "Move up",
                                icon: "moveUp",
                                group: "edit",
                                key: "Mod+]",
                                reason: first ? "Already at the top" : null,
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
            </Group>
            <StartWith side={side} start={branch.start} onStart={onStart} />
        </Stack>
    );
}

/**
 * The Table button: the toolbar's Table (same glyph and key), opening the table on this side's
 * rows, Matches only, with the Group column; focus stays in the editor (spec 8a).
 * @param props - Component props
 * @param props.side - nodes or edges
 * @returns The button
 */
function TableButton({ side }: Readonly<{ side: "node" | "edge" }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const door = useCommand("table.toggle");
    const open = useWorkspaceState((state) => state.dockOpen);
    if (door === null) {
        return null;
    }
    const key = door.command.keys?.[0];
    const tip = key === undefined ? door.tip : <TooltipShortcut label={door.tip} shortcut={formatKey(key)} />;
    return (
        <Tooltip label={door.disabledReason ?? tip}>
            <ActionIcon
                variant="subtle"
                size="sm"
                aria-label={door.tip}
                aria-pressed={open}
                aria-disabled={door.disabledReason !== null}
                data-disabled={door.disabledReason === null ? undefined : true}
                onClick={() => {
                    if (door.disabledReason === null) {
                        store.set(open ? { dockOpen: false } : { dockOpen: true, dockTab: `${side}s` });
                    }
                }}
            >
                <GLYPHS.table size={14} aria-hidden />
            </ActionIcon>
        </Tooltip>
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
