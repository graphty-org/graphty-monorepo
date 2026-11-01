/**
 * The selection editor: one component for a style layer's Which nodes / Which edges and for an
 * import filter card's body (design/ui/selection-groups/spec.md). A selection is graphty-element's
 * `union` leaf: groups (Figma Layers rows, a colored chit and a letter) each starting with All or
 * None and folding ordered steps (Figma Fill rows: verb, value, short test, count, on box). The
 * element evaluates it and reports every count, state and color (`scope.watchSteps`), and draws
 * the group colors while the reader picks (`styles.showBranches`); the editor only renders and
 * hands each edit to its host as the next rule.
 */

import "./selection.css";

import {
    focusWithRing,
    InlineRename,
    SegmentedControl,
    SplitButton,
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
import { ActionIcon, Button, Checkbox, CloseButton, Group, Menu, Stack, Text, Tooltip } from "@mantine/core";
import React, { useEffect, useId, useRef, useState } from "react";

import { focusInspectorTitle, focusIsLost } from "../frame/focus";
import { GLYPHS } from "../glyphs";
import { formatKey, isTypingTarget, matchesKey } from "../keys/keys";
import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { AddCondition } from "../style/WhichPicker";
import { colorName } from "../style/words";
import {
    addBranch,
    addStep,
    defaultVerb,
    duplicateBranch,
    duplicateStep,
    editBranch,
    editStep,
    moveBranch,
    moveStep,
    removeBranch,
    removeStep,
    type Verb,
    VERBS,
} from "./model";
import { SelectionMenuItems } from "./SelectionMenu";
import { StepCard, VerbMenu } from "./StepCard";
import { useSteps } from "./useSteps";
import { type Host, pickerFields, type PickSection, pickSections, ruleOfField, sideOf } from "./values";
import { countWords, letterOf, NOUNS, reasonWords, stepWords, VERB_WORDS } from "./words";

/** Whether a host's preview shows group colors while picking, for the session (spec 9). */
const groupColors: Record<Host, boolean> = { selector: true, filter: true };

/** Props of the editor. */
interface SelectionEditorProps {
    readonly session: GraphSession;
    /** The selection as the host holds it. */
    readonly rule: UnionLeaf;
    readonly host: Host;
    /** Takes the next rule, which the host writes. */
    readonly onChange: (next: UnionLeaf) => void;
    /** Ends editing (Done, or Escape once nothing smaller is open). */
    readonly onDone?: () => void;
    /** Opens the first step's card on arrival, focused (a filter card's first value just written). */
    readonly openFirst?: boolean;
    /** A filter condition being edited: what it would remove stays drawn, faint, while picking (spec 9). */
    readonly hold?: string;
    /** What the canvas key's preview is titled by: a filter card's name; "Which nodes" when absent. */
    readonly title?: string;
    /** Opens the value picker on the first group at once (a new filter card). */
    readonly openPicker?: boolean;
    /** The host's own picker entries, listed after Results (the import filter's Time window). */
    readonly hostPicks?: readonly PickSection[];
    /** Takes focus on arrival, on its first row or "+" (opened from a control that goes away). */
    readonly autoFocus?: boolean;
}

/** The rule kinds a step takes with no test: picking one applies it, and no card opens. */
const NO_TEST_KINDS = new Set<RuleTree["kind"]>(["isolated", "self-loop", "repeated-edge"]);

/**
 * Whether a picked value has a test to set: a structure value applies as it is picked.
 * @param stepRule - the rule the pick wrote.
 * @returns true when its card has controls.
 */
const hasTest = (stepRule: RuleTree): boolean =>
    !NO_TEST_KINDS.has(stepRule.kind) && !(stepRule.kind === "member" && stepRule.of === "largest-component");

/** A row the arrow keys walk: a group's row or a step's. */
const ROW = "[data-row]";

/**
 * The selection editor.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rule - the selection as the host holds it
 * @param props.host - where it is edited
 * @param props.onChange - takes the next rule, which the host writes
 * @param props.onDone - ends editing
 * @param props.openFirst - opens the first step's card on arrival
 * @param props.hold - the filter condition being edited
 * @param props.title - what the canvas key's preview is titled by
 * @param props.openPicker - opens the value picker on the first group at once
 * @param props.hostPicks - the host's own picker entries
 * @param props.autoFocus - takes focus on arrival
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
}: SelectionEditorProps): React.JSX.Element {
    const { store } = useWorkspace();
    const reading = useSteps(session, given);
    // The element's canonical form: every group and step has its id and color.
    const { rule } = reading;
    const side = sideOf(rule);
    const initialStep = openFirst ? rule.branches[0]?.steps[0]?.id : undefined;
    const [openStep, setOpenStep] = useState<string | null>(initialStep ?? null);
    // `fresh`: the group was made by "Or" for this step, and goes again with it.
    const [adding, setAdding] = useState<{ branch: string; op: Verb; fresh?: boolean } | null>(() => {
        const first = rule.branches[0];
        return openPicker && first?.id !== undefined ? { branch: first.id, op: defaultVerb(first) } : null;
    });
    const [active, setActive] = useState<string | null>(null);
    const [renaming, setRenaming] = useState<string | null>(null);
    const [colors, setColors] = useState(groupColors[host]);
    // The group the pointer or focus is on: graphty-element marks its members while picking.
    const [marked, setMarked] = useState<string | null>(null);
    const box = useRef<HTMLDivElement>(null);
    // The step card opened on arrival takes focus on its first control; an editor opened from a
    // control that goes away takes it on its first row, else its "+".
    const arrival = autoFocus && !openPicker ? [`${ROW}[tabindex="0"]`, "[data-plus] button"] : null;
    const focusAfter = useRef<string | readonly string[] | null>(
        initialStep === undefined ? arrival : cardFocus(initialStep),
    );
    const picking = openStep !== null || adding !== null;
    const multi = rule.branches.length > 1;
    const { of } = reading.total;
    const say = (words: string): void => {
        store.set({ announcement: words });
    };
    const stepName = (step: UnionBranch["steps"][number]): string => stepWords(session, step, side, undefined).value;

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
                    title: title ?? `Which ${NOUNS[side].many}`,
                },
            });
        }
    }, [viewKey, store, title, side, picking, owner, holder]);
    useEffect(
        () => () => {
            if (store.get().editingSelection?.owner === owner) {
                store.set({ editingSelection: null });
            }
        },
        [store, owner],
    );
    // Another editor began picking: this one stops, so the canvas, the key and the table describe one.
    // Read from the store, not the render: this editor's own claim above may have just landed.
    useEffect(() => {
        const now = store.get().editingSelection?.owner ?? null;
        if (picking && now !== null && now !== owner) {
            setOpenStep(null);
            setAdding(null);
        }
    }, [holder, owner, picking, store]);

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

    const pick = (branch: UnionBranch, op: Verb, stepRule: RuleTree): void => {
        const made = addStep(rule, branch.id ?? "", op, stepRule);
        onChange(made.rule);
        setAdding(null);
        setActive(made.id);
        // A value with no test (Largest component, Isolated) applies as picked: no card repeats its row.
        if (hasTest(stepRule)) {
            setOpenStep(made.id);
            focusAfter.current = cardFocus(made.id);
        } else {
            setOpenStep(null);
            focusAfter.current = `[data-row="${CSS.escape(made.id)}"]`;
        }
    };
    const startAdding = (branch: UnionBranch, op: Verb = defaultVerb(branch)): void => {
        setOpenStep(null);
        setAdding({ branch: branch.id ?? "", op });
    };
    const stopAdding = (branch: UnionBranch): void => {
        // A step with no value is taken back when its picker closes with nothing chosen (spec 1),
        // and so is the group "Or" made for it.
        const fresh = adding?.fresh === true && branch.steps.length === 0 && branch.id !== undefined;
        setAdding(null);
        if (fresh) {
            onChange(removeBranch(rule, branch.id ?? ""));
            say("No group added");
            focusAfter.current = "[data-or]";
            return;
        }
        say("No step added");
        focusAfter.current = `[data-plus="${CSS.escape(branch.id ?? "")}"] button`;
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
        if (openStep === id) {
            setOpenStep(null);
        }
        focusAfter.current =
            next === undefined
                ? `[data-plus="${CSS.escape(branch.id ?? "")}"] button`
                : `[data-row="${CSS.escape(next)}"]`;
    };
    const removeBranchOf = (id: string, name: string): void => {
        onChange(removeBranch(rule, id));
        say(`Removed ${name}`);
    };
    const duplicate = (branch: UnionBranch, stepId?: string): void => {
        const id = stepId ?? branch.id ?? "";
        const made = stepId === undefined ? duplicateBranch(rule, id) : duplicateStep(rule, branch.id ?? "", id);
        onChange(made.rule);
        const step = branch.steps.find((each) => each.id === stepId);
        say(`Copied ${step === undefined ? (branch.name ?? letterOf(rule.branches.indexOf(branch))) : stepName(step)}`);
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
        const name = step === undefined ? (branch.name ?? letterOf(rule.branches.indexOf(branch))) : stepName(step);
        say(`${name} ${on ? "on" : "off"}`);
    };
    // A group's members, as its count chip shows them: selected (a style layer), or the table on them.
    const showMembers = (members: StepsReading["result"] | undefined, branch: string | null): void => {
        if (members === undefined) {
            return;
        }
        if (host === "selector") {
            // The inspector turns to the selection and this editor goes: focus follows to its
            // heading, never to the page.
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

    // The rows are one Tab stop walked with the arrows (roving focus); a row's keys act on it.
    const rowKeys = (event: React.KeyboardEvent<HTMLElement>, branch: UnionBranch, stepId?: string): void => {
        if (event.target !== event.currentTarget || isTypingTarget(event.target)) {
            return;
        }
        const rows = [...(box.current?.querySelectorAll<HTMLElement>(ROW) ?? [])];
        const at = rows.indexOf(event.currentTarget);
        const go = (to: number): void => {
            const row = rows[to];
            if (row !== undefined) {
                event.preventDefault();
                setActive(row.dataset.row ?? null);
                row.focus();
            }
        };
        const id = stepId ?? branch.id ?? "";
        if (event.key === "ArrowDown") {
            go(at + 1);
        } else if (event.key === "ArrowUp") {
            go(at - 1);
        } else if (event.key === "Home") {
            go(0);
        } else if (event.key === "End") {
            go(rows.length - 1);
        } else if (matchesKey(event.nativeEvent, "Mod+]") || matchesKey(event.nativeEvent, "Mod+[")) {
            event.preventDefault();
            const by = event.key === "]" ? 1 : -1;
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
                removeBranchOf(id, branch.name ?? letterOf(rule.branches.indexOf(branch)));
            } else {
                removeStepAt(branch, id);
            }
        } else if (event.key === "F2" && stepId === undefined) {
            event.preventDefault();
            setRenaming(id);
        } else if (event.key === " " || matchesKey(event.nativeEvent, "Shift+Mod+H")) {
            // Shift+Mod+H (the style tree's Show/Hide) and Space switch the row's group or step on
            // and off (its eye), as a checkbox does.
            event.preventDefault();
            toggle(branch, stepId);
        } else if (event.key === "Enter" && stepId !== undefined) {
            event.preventDefault();
            setOpenStep(openStep === id ? null : id);
        } else if (event.key === "Enter") {
            // A group row's Enter is its count chip: select its members, or show them in the table.
            event.preventDefault();
            showMembers(branchReading(branch.id)?.members, branch.id ?? null);
        }
    };

    // A dragged row's id, so a drop on another row of its group moves it there.
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
            if (isStep) {
                const to = branch.steps.findIndex((step) => step.id === id);
                if (branch.steps.some((step) => step.id === from)) {
                    onChange(moveStep(rule, branch.id ?? "", from, to));
                    say(`Moved to step ${String(to + 1)} of ${String(branch.steps.length)}`);
                }
            } else if (rule.branches.some((each) => each.id === from)) {
                const to = rule.branches.findIndex((each) => each.id === id);
                onChange(moveBranch(rule, from, to));
                say(`Moved to ${letterOf(to)}`);
            }
        },
    });

    const rowIds = rule.branches.flatMap((branch) => [
        ...(multi ? [branch.id ?? ""] : []),
        ...branch.steps.map((step) => step.id ?? ""),
    ]);
    const tabbed = active !== null && rowIds.includes(active) ? active : rowIds[0];

    return (
        <Stack
            ref={box}
            gap={4}
            className="sel-editor"
            data-host={host}
            onKeyDownCapture={(event) => {
                // Escape in a step card's box closes the card (its text is kept as it leaves the
                // box), unless the box's own list is open: the shared boxes keep their Escape
                // elsewhere, where a picker stays open around them.
                const target = event.target as HTMLElement;
                if (
                    event.key !== "Escape" ||
                    openStep === null ||
                    !target.matches("input, textarea") ||
                    target.closest("[data-step-card]") === null ||
                    target.closest("[data-portal]") !== null ||
                    target.getAttribute("aria-expanded") === "true" ||
                    "expanded" in target.dataset
                ) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                target.blur();
                const id = openStep;
                setOpenStep(null);
                focusAfter.current = `[data-row="${CSS.escape(id)}"]`;
            }}
            onKeyDown={(event) => {
                // Escape closes the innermost thing per press: the open card, then the editor (spec 3).
                if (event.key !== "Escape" || event.defaultPrevented) {
                    return;
                }
                // An open list or menu takes its own Escape first (a row's aria-expanded is its card).
                const target = event.target as Element;
                if (
                    target.closest("[data-portal]") !== null ||
                    (target.matches("[aria-expanded=true]") && !target.matches("[data-row]"))
                ) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                if (openStep !== null) {
                    const id = openStep;
                    setOpenStep(null);
                    focusAfter.current = `[data-row="${CSS.escape(id)}"]`;
                    return;
                }
                onDone?.();
            }}
        >
            <Group gap={4} wrap="nowrap" className="sel-head">
                {host === "selector" && (
                    <CountChip
                        count={reading.total.count}
                        of={of}
                        side={side}
                        host={host}
                        disabled={false}
                        tabbable
                        tip={reading.pending.length > 0 ? `${String(reading.pending.length)} waiting` : undefined}
                        onClick={() => {
                            showMembers(reading.result, null);
                        }}
                    />
                )}
                <ToggleIconButton
                    label="Group colors"
                    tooltip="Group colors while picking"
                    icon={<GLYPHS.groupColors size={14} aria-hidden />}
                    checked={colors}
                    onChange={(next) => {
                        groupColors[host] = next;
                        setColors(next);
                    }}
                    style={{ marginLeft: "auto" }}
                />
                <TableButton side={side} />
            </Group>
            {rule.branches.map((branch, at) => {
                const branchRead = branchReading(branch.id);
                const color = branchRead?.color ?? branch.color ?? "currentColor";
                const name = branch.name ?? letterOf(at);
                const stepIds = branch.steps.map((step) => step.id ?? "");
                return (
                    <Stack key={branch.id} gap={2} className="sel-group" data-branch={branch.id}>
                        {multi && (
                            <div // NOSONAR(S6819): a Figma Layers row; its controls are reached by its keys, one Tab stop for the list
                                role="group"
                                tabIndex={tabbed === branch.id ? 0 : -1}
                                data-row={branch.id}
                                aria-keyshortcuts="Enter Space F2 Delete Control+D Meta+D Control+] Control+["
                                className="sel-row sel-group-row"
                                aria-label={[
                                    name,
                                    colorWord(color),
                                    countWords(branchRead?.count ?? 0, of, side),
                                    branch.on === false ? "off" : "",
                                ]
                                    .filter((each) => each !== "")
                                    .join(", ")}
                                onKeyDown={(event) => {
                                    rowKeys(event, branch);
                                }}
                                onFocus={() => {
                                    setActive(branch.id ?? null);
                                    setMarked(branch.id ?? null);
                                }}
                                onBlur={() => {
                                    setMarked(null);
                                }}
                                onPointerEnter={() => {
                                    setMarked(branch.id ?? null);
                                }}
                                onPointerLeave={() => {
                                    setMarked(null);
                                }}
                                onDoubleClick={() => {
                                    setRenaming(branch.id ?? null);
                                }}
                                {...dragProps(branch, branch.id ?? "", false)}
                            >
                                <span
                                    className="sel-chit"
                                    data-filled={picking && colors ? "" : undefined}
                                    style={{
                                        borderColor: color,
                                        background: picking && colors ? color : "transparent",
                                    }}
                                    aria-hidden
                                />
                                {renaming === branch.id ? (
                                    // Figma's rename: the name preselected, Enter or a click away keeps it.
                                    <InlineRename
                                        value={name}
                                        label={`Rename ${name}`}
                                        onCommit={(typed) => {
                                            const text = typed.trim();
                                            if (text !== name) {
                                                onChange(
                                                    editBranch(rule, branch.id ?? "", {
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
                                    <Text size="sm" fw={600} truncate style={{ flex: 1, minWidth: 0 }}>
                                        {name}
                                    </Text>
                                )}
                                {branchRead !== undefined && (
                                    <CountChip
                                        pending={branchRead.state === "pending"}
                                        count={branchRead.count}
                                        of={of}
                                        side={side}
                                        host={host}
                                        disabled={false}
                                        tabbable={false}
                                        onClick={() => {
                                            showMembers(branchRead.members, branch.id ?? null);
                                        }}
                                    />
                                )}
                                <Tooltip label={<TooltipShortcut label={`Use ${name}`} shortcut="Space" />}>
                                    <Checkbox
                                        size="xs"
                                        tabIndex={-1}
                                        aria-label={`Use ${name}`}
                                        checked={branch.on !== false}
                                        onChange={() => {
                                            toggle(branch);
                                        }}
                                    />
                                </Tooltip>
                                <GroupMenu
                                    name={name}
                                    first={at === 0}
                                    last={at === rule.branches.length - 1}
                                    onRename={() => {
                                        setRenaming(branch.id ?? null);
                                    }}
                                    on={branch.on !== false}
                                    onToggle={() => {
                                        toggle(branch);
                                    }}
                                    onShow={() => {
                                        showMembers(branchRead?.members, branch.id ?? null);
                                    }}
                                    showLabel={host === "selector" ? "Select members" : "Show in table"}
                                    onDuplicate={() => {
                                        duplicate(branch);
                                    }}
                                    onMove={(by) => {
                                        moveBranchBy(branch.id ?? "", by);
                                    }}
                                    onDelete={() => {
                                        removeBranchOf(branch.id ?? "", name);
                                    }}
                                />
                            </div>
                        )}
                        <SegmentedControl
                            size="xs"
                            label={`${name} starts with`}
                            data={[
                                { value: "none", label: `No ${NOUNS[side].many}` },
                                { value: "all", label: `All ${NOUNS[side].many}` },
                            ]}
                            value={branch.start}
                            onChange={(next) => {
                                onChange(editBranch(rule, branch.id ?? "", { start: next === "all" ? "all" : "none" }));
                            }}
                        />
                        {branch.steps.map((step, index) => {
                            const id = step.id ?? "";
                            const read = readingOf(id);
                            const words = stepWords(session, step, side, read);
                            const reason = reasonWords(read?.reason ?? null, stepIds);
                            const verb = VERB_WORDS[step.op];
                            const soFar =
                                read === undefined || read.waiting
                                    ? ""
                                    : `, ${String(read.count)} of ${String(of)} ${NOUNS[side].many} so far`;
                            const summary =
                                read?.state === "inert" || read?.state === "pending" ? reason.short : words.test;
                            const open = openStep === id;
                            return (
                                <React.Fragment key={id}>
                                    <div // NOSONAR(S6819): a Figma Fill row; its controls are reached by its keys, one Tab stop for the list
                                        role="group"
                                        tabIndex={tabbed === id ? 0 : -1}
                                        data-row={id}
                                        data-state={read?.state}
                                        className="sel-row sel-step-row"
                                        aria-expanded={open}
                                        aria-keyshortcuts="Enter Space Delete Control+D Meta+D Control+] Control+["
                                        aria-label={[
                                            `${verb.word}, ${[words.value, summary].filter((each) => each !== "").join(" ")}${soFar}`,
                                            ...(step.on === false ? ["off"] : []),
                                        ].join(", ")}
                                        onKeyDown={(event) => {
                                            rowKeys(event, branch, id);
                                        }}
                                        onFocus={() => {
                                            setActive(id);
                                        }}
                                        onClick={(event) => {
                                            if ((event.target as Element).closest("button, input") === null) {
                                                setOpenStep(open ? null : id);
                                            }
                                        }}
                                        {...dragProps(branch, id, true)}
                                    >
                                        <VerbMenu
                                            verb={step.op}
                                            tabbable={false}
                                            onVerb={(op) => {
                                                onChange(editStep(rule, branch.id ?? "", id, { op }));
                                            }}
                                        />
                                        {/* The whole step in the tooltip of its words; each control has its own. */}
                                        <Tooltip
                                            label={[
                                                `${verb.word} (${verb.figma})`,
                                                words.value,
                                                words.test,
                                                reason.long,
                                            ]
                                                .filter((each) => each !== "")
                                                .join(", ")}
                                            openDelay={500}
                                        >
                                            <span className="sel-words">
                                                <Text size="sm" truncate className="sel-value">
                                                    {words.value}
                                                </Text>
                                                <Text size="sm" c="dimmed" truncate className="sel-test">
                                                    {summary}
                                                </Text>
                                            </span>
                                        </Tooltip>
                                        {read?.orderMatters === true && (
                                            <Tooltip label="Order matters here">
                                                <GLYPHS.order size={12} aria-label="Order matters" />
                                            </Tooltip>
                                        )}
                                        {/* The open card's header says the count and holds the remove. */}
                                        {!open && read !== undefined && !read.waiting && (
                                            <Text size="sm" c="dimmed" className="sel-count">
                                                {read.count}
                                            </Text>
                                        )}
                                        <Tooltip
                                            label={<TooltipShortcut label={`Use ${words.value}`} shortcut="Space" />}
                                        >
                                            <Checkbox
                                                size="xs"
                                                tabIndex={-1}
                                                aria-label={`Use ${words.value}`}
                                                checked={step.on !== false}
                                                onChange={() => {
                                                    toggle(branch, id);
                                                }}
                                            />
                                        </Tooltip>
                                        {!open && (
                                            <Tooltip
                                                label={
                                                    <TooltipShortcut
                                                        label={`Remove ${words.value}`}
                                                        shortcut="Delete"
                                                    />
                                                }
                                            >
                                                <CloseButton
                                                    size="xs"
                                                    tabIndex={-1}
                                                    className="sel-remove"
                                                    aria-label={`Remove ${words.value}`}
                                                    onClick={() => {
                                                        removeStepAt(branch, id);
                                                    }}
                                                />
                                            </Tooltip>
                                        )}
                                    </div>
                                    {open && (
                                        <StepCard
                                            session={session}
                                            rule={rule}
                                            step={step}
                                            reading={read}
                                            host={host}
                                            of={of}
                                            first={index === 0}
                                            last={index === branch.steps.length - 1}
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
                                    )}
                                </React.Fragment>
                            );
                        })}
                        <StepPlus
                            session={session}
                            rule={rule}
                            branch={branch}
                            adding={adding !== null && adding.branch === branch.id ? adding.op : null}
                            hostPicks={hostPicks}
                            onAdd={(op) => {
                                startAdding(branch, op);
                            }}
                            onPick={(op, stepRule) => {
                                pick(branch, op, stepRule);
                            }}
                            onCancel={() => {
                                stopAdding(branch);
                            }}
                        />
                    </Stack>
                );
            })}
            <Group gap={4} justify="space-between">
                <Tooltip
                    label={
                        reading.branchesLeft === 0
                            ? `No more groups: ${String(rule.branches.length)} is the most`
                            : "Or: match another way"
                    }
                >
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        data-or=""
                        leftSection={<GLYPHS.add size={12} aria-hidden />}
                        aria-disabled={reading.branchesLeft === 0}
                        data-disabled={reading.branchesLeft === 0 ? true : undefined}
                        onClick={() => {
                            if (reading.branchesLeft === 0) {
                                return;
                            }
                            const made = addBranch(rule);
                            onChange(made.rule);
                            setOpenStep(null);
                            setAdding({ branch: made.id, op: "add", fresh: true });
                        }}
                    >
                        Or
                    </Button>
                </Tooltip>
                {onDone !== undefined && (
                    <Button size="compact-xs" onClick={onDone}>
                        Done
                    </Button>
                )}
            </Group>
        </Stack>
    );
}

/**
 * "+" at a group's foot: a split button whose main half adds a step with the group's next verb
 * and opens the value picker at once, and whose caret opens the verb menu first (spec 4). While a
 * new step waits for its value, the picker stands in its row.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rule - the selection
 * @param props.branch - the group
 * @param props.adding - the verb of the step waiting for its value, or null
 * @param props.hostPicks - the host's own picker entries, after Results
 * @param props.onAdd - starts a new step with a verb
 * @param props.onPick - takes the new step's value as its rule
 * @param props.onCancel - takes the new step back (its picker closed with nothing chosen)
 * @returns The control
 */
function StepPlus({
    session,
    rule,
    branch,
    adding,
    hostPicks,
    onAdd,
    onPick,
    onCancel,
}: Readonly<{
    session: GraphSession;
    rule: UnionLeaf;
    branch: UnionBranch;
    adding: Verb | null;
    hostPicks: readonly PickSection[];
    onAdd: (op: Verb) => void;
    onPick: (op: Verb, stepRule: RuleTree) => void;
    onCancel: () => void;
}>): React.JSX.Element {
    const verb = defaultVerb(branch);
    const picked = useRef(false);
    if (adding !== null) {
        const words = VERB_WORDS[adding];
        const choose = (stepRule: RuleTree): void => {
            picked.current = true;
            onPick(adding, stepRule);
        };
        return (
            <AddCondition
                fields={pickerFields(session, sideOf(rule), rule.within)}
                used={branch.steps.flatMap((step) => {
                    const path =
                        (step.rule as { attribute?: string; reads?: string }).attribute ??
                        (step.rule as { reads?: string }).reads;
                    return path === undefined ? [] : [`${sideOf(rule)}:${path}`];
                })}
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
                        <words.glyph size={14} aria-hidden />
                        <Text size="sm" c="dimmed">
                            {words.word}
                        </Text>
                    </div>
                }
            />
        );
    }
    const VerbGlyph = VERB_WORDS[verb].glyph;
    // The verb it adds is drawn as its glyph and said as a word, so it never reads as "Or".
    return (
        <span data-plus={branch.id} className="sel-plus">
            <SplitButton
                size="sm"
                icon={<VerbGlyph size={14} aria-hidden />}
                label={`Add a step: ${VERB_WORDS[verb].word}`}
                menuLabel="Add a step with a verb"
                onClick={() => {
                    onAdd(verb);
                }}
            >
                {VERBS.map((each) => {
                    const item = VERB_WORDS[each];
                    return (
                        <Menu.Item
                            key={each}
                            leftSection={<item.glyph size={14} aria-hidden />}
                            aria-label={`${item.word} (${item.figma})`}
                            onClick={() => {
                                onAdd(each);
                            }}
                        >
                            {item.word}
                        </Menu.Item>
                    );
                })}
            </SplitButton>
            <Text span size="sm" c="dimmed" aria-hidden className="sel-plus-word">
                {VERB_WORDS[verb].word}
            </Text>
        </span>
    );
}

/**
 * A group's "..." menu: Rename, Duplicate, Move up, Move down | Show or Hide, its members |
 * Delete, each with its icon and key, as the style tree's row menu.
 * @param props - Component props
 * @param props.name - the group's name
 * @param props.first - it is the first group
 * @param props.last - it is the last group
 * @param props.on - whether it is on
 * @param props.showLabel - the members item's words for the host
 * @param props.onRename - starts renaming it
 * @param props.onToggle - switches it on or off
 * @param props.onShow - selects its members, or shows them in the table
 * @param props.onDuplicate - copies it under itself
 * @param props.onMove - moves it up or down
 * @param props.onDelete - removes it
 * @returns The menu
 */
function GroupMenu({
    name,
    first,
    last,
    on,
    showLabel,
    onRename,
    onToggle,
    onShow,
    onDuplicate,
    onMove,
    onDelete,
}: Readonly<{
    name: string;
    first: boolean;
    last: boolean;
    on: boolean;
    showLabel: string;
    onRename: () => void;
    onToggle: () => void;
    onShow: () => void;
    onDuplicate: () => void;
    onMove: (by: -1 | 1) => void;
    onDelete: () => void;
}>): React.JSX.Element {
    return (
        <Menu position="bottom-end" withinPortal>
            <Menu.Target>
                <TargetTooltip label="More">
                    <ActionIcon variant="subtle" size="sm" tabIndex={-1} aria-label={`More for ${name}`}>
                        <GLYPHS.more size={14} aria-hidden />
                    </ActionIcon>
                </TargetTooltip>
            </Menu.Target>
            <Menu.Dropdown data-portal="">
                <SelectionMenuItems
                    items={[
                        { id: "rename", label: "Rename", icon: "rename", group: "edit", key: "F2", onRun: onRename },
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
                            key: "Mod+[",
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
                            key: "Mod+]",
                            reason: last ? "Already at the bottom" : null,
                            onRun: () => {
                                onMove(1);
                            },
                        },
                        {
                            id: "hide",
                            label: on ? "Hide" : "Show",
                            icon: on ? "hide" : "show",
                            group: "view",
                            key: "Shift+Mod+H",
                            onRun: onToggle,
                        },
                        {
                            id: "members",
                            label: showLabel,
                            icon: "selection",
                            group: "view",
                            key: "Enter",
                            onRun: onShow,
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
            </Menu.Dropdown>
        </Menu>
    );
}

/**
 * The selection header's Table button: the toolbar's Table (same glyph and key), opening the table
 * on this side's rows, Matches only, with the Group column; focus stays in the editor (spec 8a).
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
 * A count chip, "24 of 77": in a style layer a click selects what it counts; in a filter it opens
 * the table on those rows, Matches only, and never selects (spec 2: a selection change would switch
 * every Select card off). The header's is a Tab stop; a group row's is reached by the row's Enter.
 * @param props - Component props
 * @param props.count - the count
 * @param props.of - the base's size
 * @param props.side - nodes or edges
 * @param props.host - where the selection is edited
 * @param props.disabled - whether it has nothing to show yet
 * @param props.tabbable - whether it is a Tab stop
 * @param props.tip - more words for its tooltip
 * @param props.pending - the group waits on a run
 * @param props.onClick - shows what it counts
 * @returns The chip
 */
function CountChip({
    count,
    of,
    side,
    host,
    disabled,
    tabbable,
    tip,
    pending = false,
    onClick,
}: Readonly<{
    pending?: boolean;
    count: number;
    of: number;
    side: "node" | "edge";
    host: Host;
    disabled: boolean;
    tabbable: boolean;
    tip?: string;
    onClick: () => void;
}>): React.JSX.Element {
    const words = countWords(count, of, side);
    const label = host === "selector" ? `Select ${words}` : `Show ${words} in the table`;
    // A group waiting on a run shows no confident number: its short word, the last count in the tooltip.
    if (pending) {
        return (
            <Tooltip label={`Waiting; last ${words}`}>
                <Text size="sm" c="dimmed" className="sel-count" aria-label={`Waiting, last ${words}`}>
                    Waits
                </Text>
            </Tooltip>
        );
    }
    return (
        <Tooltip label={tip === undefined ? label : `${label}; ${tip}`}>
            <Button
                size="compact-xs"
                variant="subtle"
                tabIndex={tabbable ? 0 : -1}
                className="sel-count"
                aria-label={label}
                disabled={disabled}
                onClick={onClick}
            >
                {`${String(count)} of ${String(of)}`}
            </Button>
        </Tooltip>
    );
}

/**
 * Where focus goes in a step card that just opened: the control its test is chosen in first (a
 * Relative to step's reference), else its first box to type in (a bound, the text), else its first
 * input (a list, which opens to pick from), else its first button.
 * @param id - the step's id.
 * @returns the selectors, first match wins.
 */
function cardFocus(id: string): readonly string[] {
    const card = `[data-step-card="${CSS.escape(id)}"]`;
    // A read-only input is a select (the operator); a typed box (a text card's autocomplete is a
    // combobox too) comes first. A pending card's buttons are not its body: focus waits for a box.
    return [
        `${card} input[data-first-focus]`,
        `${card} input:not([type=hidden], [type=checkbox], [type=radio], [readonly])`,
        `${card} input:not([type=hidden])`,
        `${card}:not([data-pending]) button`,
    ];
}

/**
 * A group's color as a word for its row's name ("teal").
 * @param color - the element's color.
 * @returns the word, or "" for none.
 */
function colorWord(color: string): string {
    return /^#[0-9a-f]{6}/i.test(color) ? colorName(color.slice(0, 7)).toLowerCase() : "";
}
