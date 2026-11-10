import { ActionIcon, Text } from "@mantine/core";
import React, { useEffect, useMemo, useRef } from "react";

import { GLYPHS } from "../../glyphs";
import { formatNumber } from "../../inspector/words";
import { useJoinWorkspace } from "../context";
import type { Point } from "./model";
import { OP_GLYPHS } from "./opGlyphs";
import { addsThings, choicesFor, type DropContext, type JoinOp, mainCount, OP_WORDS } from "./ops";

/** An open drop menu: the drop, its kinds and the one picked in advance. */
export interface TileMenuState {
    readonly ctx: DropContext;
    /** The box the drop reaches, for the step's wire. */
    readonly target?: string;
    readonly ops: readonly JoinOp[];
    readonly pre: number;
    /** Where it opens, in the viewport. */
    readonly at: Point;
    /** The drop's two ends, as the header names them. */
    readonly title: { readonly from: string; readonly to: string };
}

/** The menu's size, to keep it on screen. */
const MENU_W = 420;
const MENU_H = 200;

/**
 * The join kinds a drop can mean, as tiles: each with its count from graphty-element
 * (`draft.estimate`) and its number key. It stays open until a tile is picked or Esc.
 * @param props - Component props
 * @param props.menu - the open menu.
 * @param props.onPick - picks a kind.
 * @param props.onClose - closes it.
 * @returns the menu.
 */
export function TileMenu({
    menu,
    onPick,
    onClose,
}: Readonly<{ menu: TileMenuState; onPick: (op: JoinOp) => void; onClose: () => void }>): React.JSX.Element {
    const { draft, version } = useJoinWorkspace();
    const box = useRef<HTMLDivElement>(null);
    const counts = useMemo(
        () => ({
            version,
            of: menu.ops.map((op) => {
                const choices = choicesFor(op, menu.ctx);
                const outcome = draft.estimate({ from: menu.ctx.from.key, choices });
                return outcome.report === undefined
                    ? null
                    : `${addsThings(op, choices) ? "+" : ""}${formatNumber(mainCount(op, outcome.report, choices))}`;
            }),
        }),
        [draft, version, menu],
    );
    useEffect(() => {
        box.current?.querySelector<HTMLElement>('[data-pre=""]')?.focus();
    }, []);
    const left = Math.max(8, Math.min(menu.at.x, globalThis.innerWidth - MENU_W - 8));
    const top = Math.max(8, Math.min(menu.at.y, globalThis.innerHeight - MENU_H - 8));
    return (
        <div ref={box} className="jwc-menu" role="menu" aria-label="Join kind" style={{ left, top, width: MENU_W }}>
            <div className="jwc-menu-head">
                <Text span size="sm" fw={600} truncate>
                    {menu.title.from}
                </Text>
                <GLYPHS.go size={12} aria-hidden />
                <Text span size="sm" fw={600} truncate className="jwc-menu-to">
                    {menu.title.to}
                </Text>
                <ActionIcon size="sm" variant="subtle" aria-label="Close" aria-keyshortcuts="Escape" onClick={onClose}>
                    <GLYPHS.close size={14} aria-hidden />
                </ActionIcon>
                <Text span size="sm" c="dimmed" className="sel-key">
                    Esc
                </Text>
            </div>
            <div className="jwc-tiles">
                {menu.ops.map((op, index) => {
                    const Icon = OP_GLYPHS[op];
                    const count = counts.of[index];
                    return (
                        <button
                            key={op}
                            type="button"
                            role="menuitem"
                            className="jwc-tile"
                            data-pre={index === menu.pre ? "" : undefined}
                            aria-keyshortcuts={String(index + 1)}
                            disabled={count === null}
                            onClick={() => {
                                onPick(op);
                            }}
                        >
                            <Icon size={16} aria-hidden />
                            <span className="jwc-tile-name">{OP_WORDS[op].tile}</span>
                            <span className="jwc-tile-count">{count ?? "-"}</span>
                            <span className="sel-key jwc-tile-key">{index + 1}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
