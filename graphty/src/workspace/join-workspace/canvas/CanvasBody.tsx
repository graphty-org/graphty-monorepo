import "./canvas.css";

import type { JoinRegion, JoinRowFate, JoinStepOutcome } from "@graphty/graphty-element/session";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { isTypingTarget, matchesKey } from "../../keys/keys";
import { AddTableButton } from "../AddTableButton";
import { shownStep, useJoinWorkspace } from "../context";
import { type PreviewFocus, PreviewPane } from "../PreviewPane";
import { RowsPane } from "../RowsPane";
import { JoinBar } from "./JoinBar";
import { BAR_KEYS, boxesOf } from "./model";
import { type CanvasDrop, type CanvasFocusKey, ModelCanvas } from "./ModelCanvas";
import { choicesFor, type DropContext, type JoinOp, opsFor, pathOf, suggestedOp } from "./ops";
import { TileMenu, type TileMenuState } from "./TileMenu";

/** What is picked out: its id, and the rows and elements it shows. */
interface Focus extends CanvasFocusKey {
    readonly fate?: JoinRowFate;
}

/** Each row fate's element fate, for the preview to pick out. */
const ELEMENT_OF: Partial<Record<JoinRowFate, PreviewFocus>> = {
    joined: "matched",
    merged: "merged",
    linked: "matched",
    "new-end": "added",
};

/** Each Venn region's rows and elements. */
const REGION_FOCUS: Readonly<Record<JoinRegion, { readonly fate?: JoinRowFate; readonly element: PreviewFocus }>> = {
    both: { fate: "merged", element: "merged" },
    "only-from": { fate: "new-end", element: "added" },
    "only-onto": { element: "untouched" },
};

/**
 * The model canvas build of the join workspace's body: the canvas of source boxes over the bar of
 * joins on the left; the preview over the paged rows on the right. Dropping a column opens the
 * tile menu of join kinds; every join is a step of graphty-element's recipe draft, which counts
 * it, and nothing reaches the graph until Done.
 * @returns the body.
 */
export function CanvasBody(): React.JSX.Element {
    const api = useJoinWorkspace();
    const { draft, version } = api;
    const selected = shownStep(api);
    const [targets, setTargets] = useState<ReadonlyMap<string, readonly string[]>>(new Map());
    const [menu, setMenu] = useState<TileMenuState | null>(null);
    const [focus, setFocus] = useState<Focus | null>(null);
    const [conflicts, setConflicts] = useState(false);
    const { boxes, outcomes } = useMemo(() => {
        const { steps } = draft;
        return {
            version,
            boxes: boxesOf(draft.inputs, steps),
            outcomes: new Map<string, JoinStepOutcome>(steps.map((step) => [step.id, draft.outcome(step.id)])),
        };
    }, [draft, version]);
    // A new step shown lets go of what the last one picked out.
    useEffect(() => {
        setFocus(null);
        setConflicts(false);
    }, [selected]);

    const add = (op: JoinOp, ctx: DropContext, target?: string): void => {
        let id = "";
        api.edit((each) => {
            id = each.add({ from: ctx.from.key, choices: choicesFor(op, ctx) });
        });
        if (target !== undefined) {
            setTargets((now) => new Map(now).set(id, [target]));
        }
        api.select(id);
    };
    const pick = (op: JoinOp): void => {
        if (menu !== null) {
            setMenu(null);
            add(op, menu.ctx, menu.target);
        }
    };
    const pickRef = useRef(pick);
    pickRef.current = pick;

    const drop = (event: CanvasDrop): void => {
        const { inputs } = draft;
        let from = inputs.find((input) => input.key === event.from.box);
        if (from === undefined || event.to?.box === event.from.box) {
            return;
        }
        let { column } = event.from;
        let target: string | undefined;
        let ctx: DropContext;
        const to = event.to === null ? undefined : boxes.find((box) => box.key === event.to?.box);
        const toColumn = event.to?.column ?? (to?.columns.includes("id") === true ? "id" : to?.columns[0]);
        if (to === undefined || toColumn === undefined) {
            ctx = { from, column, suggestion: draft.suggest(from.key) };
        } else if (to.held && from.held) {
            const via = inputs.find((input) => input.key === to.key);
            ctx = {
                from,
                column,
                ...(via === undefined ? {} : { via: { input: via, column: toColumn } }),
                suggestion: draft.suggest(from.key),
            };
        } else if (to.held) {
            // A loaded source dropped on a held table: the table's rows are read, onto the source.
            const turned = inputs.find((input) => input.key === to.key);
            if (turned === undefined) {
                return;
            }
            target = from.key;
            const path = pathOf(column);
            from = turned;
            column = toColumn;
            ctx = {
                from,
                column,
                path,
                ontoColumns: boxes.find((box) => box.key === target)?.columns ?? [],
                suggestion: draft.suggest(from.key),
            };
        } else {
            target = to.key;
            ctx = {
                from,
                column,
                path: pathOf(toColumn),
                ontoColumns: to.columns,
                suggestion: draft.suggest(from.key),
            };
        }
        ctx = { ...ctx, graphColumns: boxes.filter((box) => !box.held).flatMap((box) => box.columns) };
        const ops = opsFor(ctx);
        const reached = target === undefined ? undefined : boxes.find((box) => box.key === target);
        let toWords = reached === undefined ? "+" : `${reached.name}.${event.to?.column ?? toColumn ?? ""}`;
        if (ctx.via !== undefined) {
            toWords = `${ctx.via.input.name}.${ctx.via.column}`;
        }
        setMenu({
            ctx,
            ...(target === undefined ? {} : { target }),
            ops,
            pre: Math.max(0, ops.indexOf(suggestedOp(ctx))),
            at: event.client,
            title: {
                from: `${from.name}.${column}`,
                to: toWords,
            },
        });
    };

    const removeRef = useRef<() => void>(() => undefined);
    removeRef.current = () => {
        if (selected !== undefined) {
            api.edit((each) => {
                each.remove(selected);
            });
        }
    };
    const openRef = useRef({ menu, conflicts });
    openRef.current = { menu, conflicts };
    // The canvas's keys, before the shell's: the menu's 1-9, Enter and Esc while it is open; Delete
    // removes the shown join; C opens its conflicts. Listeners on one target run in the order they
    // were added, and a child's effect runs before its parent's, so this is added once, on mount:
    // added again later, it would run after the shell's, which cancels the workspace on Esc.
    useEffect(() => {
        const keys = (event: KeyboardEvent): void => {
            if (event.defaultPrevented || event.isComposing) {
                return;
            }
            const target = event.target instanceof Element ? event.target : null;
            const { menu, conflicts } = openRef.current;
            if (menu !== null) {
                if (event.key === "Escape") {
                    event.preventDefault();
                    setMenu(null);
                } else if (/^[1-9]$/.test(event.key)) {
                    event.preventDefault();
                    const op = menu.ops[Number(event.key) - 1];
                    if (op !== undefined) {
                        pickRef.current(op);
                    }
                } else if (event.key === "Enter" && target?.closest('[role="menuitem"]') === null) {
                    event.preventDefault();
                    pickRef.current(menu.ops[menu.pre]);
                }
                return;
            }
            if (conflicts && event.key === "Escape") {
                event.preventDefault();
                setConflicts(false);
                return;
            }
            if (isTypingTarget(target) || event.ctrlKey || event.metaKey || event.altKey) {
                return;
            }
            if (matchesKey(event, BAR_KEYS.remove)) {
                event.preventDefault();
                removeRef.current();
            } else if (matchesKey(event, BAR_KEYS.conflicts)) {
                event.preventDefault();
                setConflicts((open) => !open);
            }
        };
        globalThis.addEventListener("keydown", keys, true);
        return () => {
            globalThis.removeEventListener("keydown", keys, true);
        };
    }, []);

    const region = focus?.region;
    const rowFate = region === undefined ? focus?.fate : REGION_FOCUS[region].fate;
    let elementFocus = focus?.fate === undefined ? undefined : ELEMENT_OF[focus.fate];
    if (region !== undefined) {
        elementFocus = REGION_FOCUS[region].element;
    }
    return (
        <div className="jw-body jwc-body">
            <div className="jwc-left">
                <div className="jwc-toolbar">
                    <AddTableButton />
                </div>
                <ModelCanvas
                    boxes={boxes}
                    steps={draft.steps}
                    outcomes={outcomes}
                    selected={selected}
                    targets={targets}
                    focus={focus}
                    onSelect={(step) => {
                        api.select(step);
                    }}
                    onFocus={(step, next) => {
                        api.select(step);
                        setFocus(
                            next === null ? null : { ...next, ...(next.key === "merged" ? { fate: "merged" } : {}) },
                        );
                    }}
                    onDrop={drop}
                    onSplit={(box, column) => {
                        const from = draft.inputs.find((input) => input.key === box);
                        if (from !== undefined) {
                            add("split", { from, column, suggestion: draft.suggest(from.key) });
                        }
                    }}
                />
                <JoinBar
                    boxes={boxes}
                    selected={selected}
                    outcomes={outcomes}
                    targets={targets}
                    onTarget={(step, index, box) => {
                        setTargets((now) => {
                            const keys = [...(now.get(step) ?? [])];
                            keys[index] = box;
                            return new Map(now).set(step, keys);
                        });
                    }}
                    focus={focus}
                    onFocus={setFocus}
                    conflicts={conflicts}
                    onConflicts={setConflicts}
                    onAdd={() => {
                        const { inputs } = draft;
                        const from = inputs.findLast((input) => input.held) ?? inputs[0];
                        const suggestion = draft.suggest(from.key);
                        let id = "";
                        api.edit((each) => {
                            id = each.add({
                                from: from.key,
                                choices: { shape: suggestion.shape, keys: suggestion.keys },
                            });
                        });
                        api.select(id);
                    }}
                />
            </div>
            <div className="jw-right">
                <PreviewPane focus={elementFocus} />
                <RowsPane fate={rowFate} />
            </div>
            {menu === null ? null : (
                <TileMenu
                    menu={menu}
                    onPick={pick}
                    onClose={() => {
                        setMenu(null);
                    }}
                />
            )}
        </div>
    );
}
