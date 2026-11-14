import "./cards.css";

import { CardList, type CardListItem, PopoutManager } from "@graphty/compact-mantine";
import type { JoinInput, JoinStepEntry } from "@graphty/graphty-element/session";
import { ActionIcon, Badge, Button, Group, Menu, Text } from "@mantine/core";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { GLYPHS } from "../../glyphs";
import { isTypingTarget, matchesKey } from "../../keys/keys";
import { type SelectionMenuItem, SelectionMenuItems } from "../../selection/SelectionMenu";
import { AddTableButton } from "../AddTableButton";
import { type JoinWorkspaceApi, useJoinWorkspace } from "../context";
import { PreviewPane } from "../PreviewPane";
import { RowsPane } from "../RowsPane";
import { CardBody } from "./CardBody";
import { cardTitle, choicesFor, errorWords, matchLine, type Outcome, outcomeOf, summaryChips } from "./outcomes";

/** The cards' keys, shown on their buttons and menu items. */
const CARD_KEYS = {
    add: "N",
    duplicate: "Mod+D",
    up: "Mod+[",
    down: "Mod+]",
    remove: "Delete",
} as const;

/** Each card's color, by its position: its border and number. */
const CARD_COLORS = ["#9747ff", "#f24822", "#0fa958", "#0d99ff", "#ffa629", "#e8448f", "#14ae5c", "#7a5af8"];

/** A card whose answer is not picked yet: only the workspace holds it, not the recipe. */
interface Unpicked {
    readonly id: string;
    readonly from: string;
}

/**
 * The table a new card reads first: a held table no card reads yet, else any input no card reads,
 * else the last held table, else the last input.
 * @param inputs - the draft's inputs.
 * @param read - the inputs cards already read.
 * @returns the input's key, or undefined when there is none.
 */
function firstFree(inputs: readonly JoinInput[], read: ReadonlySet<string>): string | undefined {
    const held = inputs.filter((input) => input.held);
    return (
        held.find((input) => !read.has(input.key)) ??
        inputs.find((input) => !read.has(input.key)) ??
        held.at(-1) ??
        inputs.at(-1)
    )?.key;
}

/**
 * The join cards' body: one card per join on the left (compact-mantine's CardList), "+ Join"
 * under them, and the preview over the table on the right. A new card asks what each row of its
 * table becomes before anything else; picking the answer makes it a step of graphty-element's
 * recipe draft, which counts, matches and previews everything. Nothing reaches the graph until
 * Done.
 * @returns the body.
 */
export function CardsBody(): React.JSX.Element {
    const api = useJoinWorkspace();
    const { draft, version } = api;
    const { steps } = draft;
    const [unpicked, setUnpicked] = useState<readonly Unpicked[]>([]);
    const serial = useRef(0);

    const addCard = (): void => {
        const read = new Set([...steps.map((step) => step.from), ...unpicked.map((card) => card.from)]);
        const from = firstFree(draft.inputs, read);
        if (from === undefined) {
            return;
        }
        serial.current += 1;
        setUnpicked((now) => [...now, { id: `card:${String(serial.current)}`, from }]);
    };
    const pick = (card: Unpicked, answer: Outcome): void => {
        let made = "";
        api.edit((each) => {
            made = each.add({ from: card.from, choices: choicesFor(answer, each, card.from) });
        });
        setUnpicked((now) => now.filter((each) => each.id !== card.id));
        api.select(made);
        api.setFate(null);
    };

    const adder = useRef(addCard);
    adder.current = addCard;
    // N adds a card while focus is in the workspace and not in a text box.
    useEffect(() => {
        const keys = (event: KeyboardEvent): void => {
            if (event.defaultPrevented || isTypingTarget(event.target)) {
                return;
            }
            const inWorkspace = event.target instanceof Element && event.target.closest(".jw-modal") !== null;
            if (inWorkspace && matchesKey(event, CARD_KEYS.add)) {
                event.preventDefault();
                adder.current();
            }
        };
        globalThis.addEventListener("keydown", keys);
        return () => {
            globalThis.removeEventListener("keydown", keys);
        };
    }, []);

    const counts = useMemo(() => {
        const after = draft.preview();
        const before = steps.length === 0 ? after : draft.preview({ step: steps[0].id, before: true });
        return {
            version,
            nodes: after.nodes.length,
            edges: after.edges.length,
            moreNodes: after.nodes.length - before.nodes.length,
            moreEdges: after.edges.length - before.edges.length,
            tables: draft.inputs.filter((input) => input.held).length,
        };
    }, [draft, version, steps]);
    const errors = steps.filter((step) => draft.outcome(step.id).error !== undefined).length;
    const items: CardListItem[] = [
        ...steps.map((step, at) => stepCard(api, step, at)),
        ...unpicked.map((card, at) =>
            unpickedCard(api, card, steps.length + at, {
                onFrom: (from) => {
                    setUnpicked((now) => now.map((each) => (each.id === card.id ? { ...each, from } : each)));
                },
                onPick: (answer) => {
                    pick(card, answer);
                },
            }),
        ),
    ];

    return (
        <PopoutManager>
            <div className="jw-body">
                <div
                    className="jw-left jr-left"
                    onClickCapture={(event) => {
                        const card = (event.target as Element).closest<HTMLElement>("[data-step]");
                        if (card?.dataset.step !== undefined && card.dataset.step !== api.step) {
                            api.select(card.dataset.step);
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
                        {counts.tables > 0 && (
                            <Badge size="sm" variant="light" color="gray">
                                {counts.tables} {counts.tables === 1 ? "table" : "tables"}
                            </Badge>
                        )}
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
                        label="Joins"
                        items={items}
                        onRemove={(id) => {
                            if (steps.some((step) => step.id === id)) {
                                api.edit((each) => {
                                    each.remove(id);
                                });
                            } else {
                                setUnpicked((now) => now.filter((each) => each.id !== id));
                            }
                        }}
                        onReorder={(id, to) => {
                            if (steps.some((step) => step.id === id)) {
                                api.edit((each) => {
                                    each.move(id, Math.min(to, steps.length - 1));
                                });
                            }
                        }}
                        empty={
                            <div className="jr-empty" aria-hidden>
                                <GLYPHS.join size={32} />
                            </div>
                        }
                        add={
                            <Button
                                size="compact-xs"
                                variant="default"
                                fullWidth
                                className="jr-add"
                                disabled={draft.inputs.length === 0}
                                aria-keyshortcuts={CARD_KEYS.add}
                                leftSection={<GLYPHS.add size={14} aria-hidden />}
                                rightSection={
                                    <Text span size="sm" c="dimmed" className="sel-key">
                                        {CARD_KEYS.add}
                                    </Text>
                                }
                                onClick={addCard}
                            >
                                Join
                            </Button>
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
 * The menu and key commands of a card: duplicate, move up and down, remove.
 * @param api - the workspace.
 * @param step - the card's step.
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
            key: CARD_KEYS.duplicate,
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
            key: CARD_KEYS.up,
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
            key: CARD_KEYS.down,
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
            key: CARD_KEYS.remove,
            onRun: () => {
                api.edit((each) => {
                    each.remove(step.id);
                });
            },
        },
    ];
}

/**
 * A card's commands by key, while focus is in its card and not in a text box.
 * @param event - the key.
 * @param api - the workspace.
 */
function stepKeys(event: React.KeyboardEvent, api: JoinWorkspaceApi): void {
    if (isTypingTarget(event.target)) {
        return;
    }
    const card = (event.target as Element).closest<HTMLElement>("[data-step]");
    const at = api.draft.steps.findIndex((each) => each.id === card?.dataset.step);
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
 * The card of a step: its number, table and answer, its counts or why it cannot run, its menu and
 * its body.
 * @param api - the workspace.
 * @param step - the step.
 * @param at - its position.
 * @returns the card.
 */
function stepCard(api: JoinWorkspaceApi, step: JoinStepEntry, at: number): CardListItem {
    const { draft } = api;
    const answer = outcomeOf(step.choices);
    const outcome = draft.outcome(step.id);
    const { report } = outcome;
    const title = `${String(at + 1)} ${cardTitle(step, draft.inputs)}`;
    const chips = report === undefined ? [] : summaryChips(answer, report, draft, step.id);
    return {
        id: step.id,
        title,
        color: CARD_COLORS[at % CARD_COLORS.length],
        label: `Join ${title}`,
        className: "jr-card",
        data: {
            "data-step": step.id,
            "data-outcome": answer,
            "data-selected": api.step === step.id ? "" : undefined,
            "data-error": outcome.error === undefined ? undefined : "",
        },
        summary: (
            <Text span size="sm" c="dimmed" truncate>
                {[matchLine(step.choices), ...chips].join("; ")}
            </Text>
        ),
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
                    <ActionIcon variant="subtle" size="sm" aria-label={`More for join ${String(at + 1)}`}>
                        <GLYPHS.more size={14} aria-hidden />
                    </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown data-portal="">
                    <SelectionMenuItems items={stepCommands(api, step, at)} />
                </Menu.Dropdown>
            </Menu>
        ),
        children: (
            <CardBody
                from={step.from}
                step={step}
                outcome={outcome}
                onFrom={(from) => {
                    api.edit((each) => {
                        each.change(step.id, { from, choices: choicesFor(answer, each, from, step.id) });
                    });
                }}
                onPick={(next) => {
                    api.edit((each) => {
                        each.change(step.id, { from: step.from, choices: choicesFor(next, each, step.from, step.id) });
                    });
                }}
            />
        ),
    };
}

/**
 * The card of a join whose answer is not picked yet: its table and the question, nothing else.
 * @param api - the workspace.
 * @param card - the card.
 * @param at - its position.
 * @param on - what the reader's picks do.
 * @param on.onFrom - another table picked.
 * @param on.onPick - an answer picked.
 * @returns the card.
 */
function unpickedCard(
    api: JoinWorkspaceApi,
    card: Unpicked,
    at: number,
    on: { readonly onFrom: (from: string) => void; readonly onPick: (answer: Outcome) => void },
): CardListItem {
    const title = `${String(at + 1)} ${cardTitle({ from: card.from }, api.draft.inputs)}`;
    return {
        id: card.id,
        title,
        color: CARD_COLORS[at % CARD_COLORS.length],
        label: `Join ${title}`,
        className: "jr-card",
        data: { "data-unpicked": "" },
        summary: (
            <Text span size="sm" c="dimmed">
                ?
            </Text>
        ),
        children: <CardBody from={card.from} onFrom={on.onFrom} onPick={on.onPick} />,
    };
}
