import type { GraphSession } from "@graphty/graphty-element/session";
import React, { useState } from "react";

import { MoreMenu } from "../data-place/SourceEntry";
import { CommandMenuItem } from "../frame/menus";
import { GLYPHS } from "../glyphs";
import { CARD_MENU_WORDS } from "../selection/words";
import { useWorkspace } from "../state/WorkspaceContext";
import { editJoins } from "./actions";
import { namingLines, rowNames, sourceNames } from "./cardWords";
import { openJoinWorkspace } from "./join";
import { isJoin, linesOfJoin, stepCardId, stepGroups } from "./joinCards";
import { JoinList, type JoinListRow } from "./JoinList";
import { WORKSPACE_WORDS } from "./words";

/**
 * "Join +" below the data sources (the source-steps experiment), built as "Filter +" is: its "+" opens
 * the join workspace, and its key (Shift+J) is said on hover. Every join of the graph is listed under it,
 * one line each, "Off" after a join turned off: a press opens the workspace on it, and so does its "..."
 * menu's Open. Its menu renames it and turns it off or on, each one undo step, by the words a join card's
 * menu uses; Delete opens the workspace with it taken out.
 * @param props - Component props
 * @param props.session - the element's session
 * @returns the section
 */
export function JoinRow({ session }: Readonly<{ session: GraphSession }>): React.JSX.Element {
    const { store } = useWorkspace();
    // on reload: fresh: pointer: the join whose name's box is open, or null
    const [renaming, setRenaming] = useState<string | null>(null);
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
    const say = (words: string): void => {
        store.set({ announcement: words });
    };
    const rows = groups.map((group, at): JoinListRow => {
        const [step] = group;
        const name = names[at];
        const off = group.every((each) => each.off);
        const tag = step.join;
        return {
            id: stepCardId(step.index),
            name,
            ...(off ? { state: WORKSPACE_WORDS.off } : {}),
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
                    {/* A join written without a tag has nowhere to keep a name. */}
                    {tag === undefined ? null : (
                        <CommandMenuItem
                            icon={<GLYPHS.rename size={14} aria-hidden />}
                            label={CARD_MENU_WORDS.rename}
                            shortcut={undefined}
                            reason={null}
                            onRun={() => {
                                setRenaming(stepCardId(step.index));
                            }}
                        />
                    )}
                    <CommandMenuItem
                        icon={off ? <GLYPHS.show size={14} aria-hidden /> : <GLYPHS.hide size={14} aria-hidden />}
                        label={off ? CARD_MENU_WORDS.turnOn : CARD_MENU_WORDS.turnOff}
                        shortcut={undefined}
                        reason={null}
                        onRun={() => {
                            void editJoins(store, session, (draft) => {
                                for (const each of group) {
                                    draft.editStep(each.index, { off: !off });
                                }
                            }).then((done) => {
                                if (done) {
                                    say(off ? CARD_MENU_WORDS.on(name) : CARD_MENU_WORDS.off(name));
                                }
                            });
                        }}
                    />
                    <CommandMenuItem
                        icon={<GLYPHS.delete size={14} aria-hidden />}
                        label={CARD_MENU_WORDS.delete}
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
    const rename = (id: string, typed: string): void => {
        const at = groups.findIndex(([step]) => stepCardId(step.index) === id);
        const tag = groups[at]?.[0].join;
        const name = typed.trim();
        // Enter on the name as it reads renames nothing.
        if (tag === undefined || name === (tag.name ?? names[at])) {
            return;
        }
        void editJoins(store, session, (draft) => {
            draft.renameJoin(tag.id, name === "" ? null : name);
        }).then((done) => {
            if (done) {
                say(name === "" ? CARD_MENU_WORDS.nameCleared : CARD_MENU_WORDS.renamed(name));
            }
        });
    };
    return (
        <JoinList
            rows={rows}
            current={null}
            onSelect={(id) => {
                openJoinWorkspace(store, { step: groups.find(([step]) => stepCardId(step.index) === id)?.[0].index });
            }}
            onAdd={() => {
                openJoinWorkspace(store);
            }}
            renaming={renaming}
            onRenamingChange={setRenaming}
            onRename={rename}
        />
    );
}
