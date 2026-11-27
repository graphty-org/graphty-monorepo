import type { GraphSession } from "@graphty/graphty-element/session";
import React from "react";

import { MoreMenu } from "../data-place/SourceEntry";
import { CommandMenuItem } from "../frame/menus";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { namingLines, rowNames, sourceNames } from "./cardWords";
import { openJoinWorkspace } from "./join";
import { isJoin, linesOfJoin, stepCardId, stepGroups } from "./joinCards";
import { JoinList, type JoinListRow } from "./JoinList";
import { WORKSPACE_WORDS } from "./words";

/**
 * "Join +" below the data sources (the source-steps experiment), built as "Filter +" is: its "+" opens
 * the join workspace, and its key (Shift+J) is said on hover. Every join of the graph is listed under it,
 * one line each: a press opens the workspace on it, and so does its "..." menu's Open; Remove opens the
 * workspace with it taken out.
 * @param props - Component props
 * @param props.session - the element's session
 * @returns the section
 */
export function JoinRow({ session }: Readonly<{ session: GraphSession }>): React.JSX.Element {
    const { store } = useWorkspace();
    const all = session.data.steps();
    // One line per card: the steps one join wrote are one, named in the order its sources were picked.
    const groups = stepGroups(
        all.filter((step) => isJoin(step)),
        [],
    );
    const names = rowNames(
        session,
        sourceNames(session),
        groups.map(([step]) =>
            namingLines(session, all, { lines: step.join === undefined ? null : linesOfJoin(step.join), step }),
        ),
    );
    const joins = groups.map(([step]) => step);
    const rows = joins.map((step, at): JoinListRow => {
        const name = names[at];
        return {
            id: stepCardId(step.index),
            name,
            menu: (
                <MoreMenu name={name}>
                    <CommandMenuItem
                        icon={<GLYPHS.join size={14} aria-hidden />}
                        label={WORKSPACE_WORDS.openJoin}
                        shortcut={undefined}
                        reason={null}
                        onRun={() => {
                            openJoinWorkspace(store, { step: step.index });
                        }}
                    />
                    <CommandMenuItem
                        icon={<GLYPHS.delete size={14} aria-hidden />}
                        label={WORKSPACE_WORDS.remove}
                        shortcut={undefined}
                        reason={null}
                        onRun={() => {
                            openJoinWorkspace(store, { without: step.index });
                        }}
                    />
                </MoreMenu>
            ),
        };
    });
    return (
        <JoinList
            rows={rows}
            current={null}
            onSelect={(id) => {
                openJoinWorkspace(store, { step: joins.find((step) => stepCardId(step.index) === id)?.index });
            }}
            onAdd={() => {
                openJoinWorkspace(store);
            }}
        />
    );
}
