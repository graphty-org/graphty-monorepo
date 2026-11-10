import "./recipe.css";

import { CardList, type CardListItem, Popout, PopoutManager } from "@graphty/compact-mantine";
import type { JoinStepEntry } from "@graphty/graphty-element/session";
import { ActionIcon, Badge, Button, Group, Menu, Text, UnstyledButton } from "@mantine/core";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { GLYPHS } from "../../glyphs";
import { isTypingTarget, matchesKey } from "../../keys/keys";
import { type SelectionMenuItem, SelectionMenuItems } from "../../selection/SelectionMenu";
import { AddTableButton } from "../AddTableButton";
import { type JoinWorkspaceApi, useJoinWorkspace } from "../context";
import { PreviewPane } from "../PreviewPane";
import { RowsPane } from "../RowsPane";
import { ConflictsButton } from "./Conflicts";
import {
    errorWords,
    OP_BY_ID,
    OP_TILES,
    opOf,
    type OpTile,
    startChoices,
    startInput,
    stepTitle,
    summaryChips,
} from "./ops";
import { StepBody } from "./StepBody";

/** The recipe's keys, shown on their buttons and menu items. */
const RECIPE_KEYS = {
    step: "N",
    duplicate: "Mod+D",
    up: "Mod+[",
    down: "Mod+]",
    remove: "Delete",
} as const;

/** Each step's color, by its position: the card's border and number. */
const STEP_COLORS = ["#9747ff", "#f24822", "#0fa958", "#0d99ff", "#ffa629", "#e8448f", "#14ae5c", "#7a5af8"];

/**
 * The recipe workspace's body: the ordered step cards on the left (compact-mantine's CardList),
 * "+ Step" under them with its intent tiles, and the preview over the table on the right. Every
 * count, match and preview is graphty-element's recipe draft; the cards only show and change its
 * steps.
 * @returns the body.
 */
export function RecipeBody(): React.JSX.Element {
    const api = useJoinWorkspace();
    const { draft, version } = api;
    const [tiles, setTiles] = useState(false);
    const left = useRef<HTMLDivElement>(null);
    const { steps } = draft;

    const addStep = (op: OpTile["op"]): void => {
        setTiles(false);
        const from = startInput(op, draft.inputs, steps);
        if (from === undefined) {
            return;
        }
        let made = "";
        api.edit((each) => {
            made = each.add({ from, choices: startChoices(op, each, from) });
        });
        api.select(made);
        api.setFate(null);
    };

    const pick = useRef(addStep);
    pick.current = addStep;
    // N opens the tiles while focus is in the workspace and not in a text box; while they are
    // open, a tile's digit adds its step (the tiles are drawn outside the workspace's box).
    useEffect(() => {
        const keys = (event: KeyboardEvent): void => {
            if (event.defaultPrevented || isTypingTarget(event.target)) {
                return;
            }
            const tile = OP_TILES.find((each) => matchesKey(event, each.key));
            if (tiles && tile !== undefined) {
                event.preventDefault();
                pick.current(tile.op);
                return;
            }
            const inWorkspace = event.target instanceof Element && event.target.closest(".jw-modal") !== null;
            if (inWorkspace && matchesKey(event, RECIPE_KEYS.step) && draft.inputs.length > 0) {
                event.preventDefault();
                setTiles(true);
            }
        };
        globalThis.addEventListener("keydown", keys);
        return () => {
            globalThis.removeEventListener("keydown", keys);
        };
    }, [draft, tiles]);

    const counts = useMemo(() => {
        const after = draft.preview();
        const before = steps.length === 0 ? after : draft.preview({ step: steps[0].id, before: true });
        return {
            version,
            nodes: after.nodes.length,
            edges: after.edges.length,
            moreNodes: after.nodes.length - before.nodes.length,
            moreEdges: after.edges.length - before.edges.length,
        };
    }, [draft, version, steps]);
    const errors = steps.filter((step) => draft.outcome(step.id).error !== undefined).length;

    return (
        <PopoutManager>
            <div className="jw-body">
                <div
                    className="jw-left jr-left"
                    ref={left}
                    onClickCapture={(event) => {
                        const card = (event.target as Element).closest<HTMLElement>("[data-card-id]");
                        if (card?.dataset.cardId !== undefined && card.dataset.cardId !== api.step) {
                            api.select(card.dataset.cardId);
                            api.setFate(null);
                        }
                    }}
                    onKeyDown={(event) => {
                        stepKeys(event, api);
                    }}
                >
                    <Group gap={4} wrap="nowrap" className="jr-head">
                        <Badge size="sm" variant="light" color="gray">
                            {counts.nodes} nodes
                        </Badge>
                        <Badge size="sm" variant="light" color="gray">
                            {counts.edges} edges
                        </Badge>
                        <Delta count={counts.moreNodes} unit="nodes" />
                        <Delta count={counts.moreEdges} unit="edges" />
                        {errors > 0 && (
                            <Badge size="sm" variant="light" color="red">
                                {errors} {errors === 1 ? "error" : "errors"}
                            </Badge>
                        )}
                        <span className="sel-spacer" />
                        <AddTableButton />
                    </Group>
                    <CardList
                        label="Steps"
                        items={steps.map((step, at) => cardOf(api, step, at))}
                        onRemove={(id) => {
                            api.edit((each) => {
                                each.remove(id);
                            });
                        }}
                        onReorder={(id, to) => {
                            api.edit((each) => {
                                each.move(id, to);
                            });
                        }}
                        empty={
                            <div className="jr-empty" aria-hidden>
                                <GLYPHS.join size={32} />
                            </div>
                        }
                        add={
                            <Popout opened={tiles} onOpenChange={setTiles}>
                                <Popout.Trigger>
                                    <Button
                                        size="compact-xs"
                                        variant="default"
                                        fullWidth
                                        className="jr-add"
                                        disabled={draft.inputs.length === 0}
                                        aria-keyshortcuts={RECIPE_KEYS.step}
                                        leftSection={<GLYPHS.add size={14} aria-hidden />}
                                        rightSection={
                                            <Text span size="sm" c="dimmed" className="sel-key">
                                                {RECIPE_KEYS.step}
                                            </Text>
                                        }
                                    >
                                        Step
                                    </Button>
                                </Popout.Trigger>
                                <Popout.Panel
                                    width={360}
                                    placement="bottom"
                                    header={{ variant: "title", title: "Step" }}
                                    closeLabel="Close Step"
                                >
                                    <Popout.Content>{tiles ? <Tiles onPick={addStep} /> : null}</Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        }
                    />
                </div>
                <div className="jw-right">
                    <PreviewPane />
                    <RowsPane />
                </div>
            </div>
        </PopoutManager>
    );
}

/**
 * A count's change, as "+12 nodes".
 * @param props - Component props
 * @param props.count - the change.
 * @param props.unit - nodes or edges.
 * @returns the chip, or null for no change.
 */
function Delta({ count, unit }: Readonly<{ count: number; unit: string }>): React.JSX.Element | null {
    if (count === 0) {
        return null;
    }
    return (
        <Badge size="sm" variant="light" color={count > 0 ? "green" : "red"}>
            {count > 0 ? "+" : ""}
            {count} {unit}
        </Badge>
    );
}

/**
 * The intent tiles: six large, three small; a digit picks one.
 * @param props - Component props
 * @param props.onPick - adds a step of the intent picked.
 * @returns the tiles.
 */
function Tiles({ onPick }: Readonly<{ onPick: (op: OpTile["op"]) => void }>): React.JSX.Element {
    const box = useRef<HTMLDivElement>(null);
    useEffect(() => {
        box.current?.querySelector<HTMLElement>("button")?.focus();
    }, []);
    const tile = (each: OpTile): React.JSX.Element => {
        const Glyph = GLYPHS[each.glyph];
        return (
            <UnstyledButton
                key={each.op}
                className="jr-tile"
                data-small={each.small === true ? "" : undefined}
                aria-keyshortcuts={each.key}
                onClick={() => {
                    onPick(each.op);
                }}
            >
                <Glyph size={each.small === true ? 14 : 18} aria-hidden className="jr-tile-glyph" />
                <Text span size="sm" fw={each.small === true ? 400 : 600} className="jr-tile-label">
                    {each.label}
                </Text>
                <Text span size="sm" c="dimmed" className="sel-key jr-tile-key">
                    {each.key}
                </Text>
            </UnstyledButton>
        );
    };
    return (
        <div ref={box}>
            <div className="jr-tile-grid">{OP_TILES.filter((each) => each.small !== true).map(tile)}</div>
            <div className="jr-tile-more">{OP_TILES.filter((each) => each.small === true).map(tile)}</div>
        </div>
    );
}

/**
 * The menu and key commands of a step: duplicate, move up and down, remove.
 * @param api - the workspace.
 * @param step - the step.
 * @param at - its position.
 * @returns the items.
 */
function stepCommands(api: JoinWorkspaceApi, step: JoinStepEntry, at: number): readonly SelectionMenuItem[] {
    const count = api.draft.steps.length;
    return [
        {
            id: "duplicate",
            label: "Duplicate",
            icon: "duplicate",
            group: "edit",
            key: RECIPE_KEYS.duplicate,
            onRun: () => {
                let made = "";
                api.edit((each) => {
                    made = each.add({ from: step.from, choices: step.choices }, at + 1);
                });
                api.select(made);
            },
        },
        {
            id: "up",
            label: "Move up",
            icon: "moveUp",
            group: "edit",
            key: RECIPE_KEYS.up,
            reason: at === 0 ? "first" : null,
            reasonDrawn: false,
            onRun: () => {
                api.edit((each) => {
                    each.move(step.id, at - 1);
                });
            },
        },
        {
            id: "down",
            label: "Move down",
            icon: "moveDown",
            group: "edit",
            key: RECIPE_KEYS.down,
            reason: at === count - 1 ? "last" : null,
            reasonDrawn: false,
            onRun: () => {
                api.edit((each) => {
                    each.move(step.id, at + 1);
                });
            },
        },
        {
            id: "remove",
            label: "Remove",
            icon: "delete",
            group: "remove",
            key: RECIPE_KEYS.remove,
            onRun: () => {
                api.edit((each) => {
                    each.remove(step.id);
                });
            },
        },
    ];
}

/**
 * A step's commands by key, while focus is in its card and not in a text box.
 * @param event - the key.
 * @param api - the workspace.
 */
function stepKeys(event: React.KeyboardEvent, api: JoinWorkspaceApi): void {
    if (isTypingTarget(event.target)) {
        return;
    }
    const card = (event.target as Element).closest<HTMLElement>("[data-card-id]");
    const at = api.draft.steps.findIndex((each) => each.id === card?.dataset.cardId);
    if (at === -1) {
        return;
    }
    const command = stepCommands(api, api.draft.steps[at], at).find(
        (each) => each.key !== undefined && (each.reason ?? null) === null && matchesKey(event.nativeEvent, each.key),
    );
    if (command !== undefined) {
        event.preventDefault();
        command.onRun();
    }
}

/**
 * One step's card: its number and intent, its title, its counts or why it cannot run, its menu;
 * its body and its Conflicts button.
 * @param api - the workspace.
 * @param step - the step.
 * @param at - its position.
 * @returns the card.
 */
function cardOf(api: JoinWorkspaceApi, step: JoinStepEntry, at: number): CardListItem {
    const { draft } = api;
    const op = opOf(step.choices);
    const tile = OP_BY_ID[op];
    const Glyph = GLYPHS[tile.glyph];
    const outcome = draft.outcome(step.id);
    const { report } = outcome;
    const title = `${String(at + 1)} ${stepTitle(step, draft.inputs)}`;
    const chips = report === undefined ? [] : summaryChips(op, report, draft, step.id);
    return {
        id: step.id,
        title,
        color: STEP_COLORS[at % STEP_COLORS.length],
        label: `Step ${title}`,
        className: "jr-card",
        data: {
            "data-step": step.id,
            "data-op": op,
            "data-selected": api.step === step.id ? "" : undefined,
            "data-error": outcome.error === undefined ? undefined : "",
        },
        aside: <Glyph size={14} aria-label={tile.label} className="jr-card-glyph" />,
        header: (
            <Group gap={3} wrap="nowrap" className="jr-sum">
                {outcome.error === undefined ? (
                    chips.map((chip) => (
                        <Badge key={chip} size="sm" variant="light" color="gray">
                            {chip}
                        </Badge>
                    ))
                ) : (
                    <Badge size="sm" variant="light" color="red">
                        {errorWords(outcome)}
                    </Badge>
                )}
            </Group>
        ),
        menu: (
            <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                    <ActionIcon variant="subtle" size="sm" aria-label={`More for step ${String(at + 1)}`}>
                        <GLYPHS.more size={14} aria-hidden />
                    </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown data-portal="">
                    <SelectionMenuItems items={stepCommands(api, step, at)} />
                </Menu.Dropdown>
            </Menu>
        ),
        children: <StepBody step={step} op={op} outcome={outcome} />,
        footer: <ConflictsButton step={step} op={op} report={report} />,
    };
}
