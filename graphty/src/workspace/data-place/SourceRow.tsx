import { ContextMenu, EntityChip } from "@graphty/compact-mantine";
import type { LoadedSource } from "@graphty/graphty-element/session";
import { ActionIcon, Menu, TextInput, Tooltip } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import type { SourceRowCommand } from "../commands/registry";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { useWorkspace } from "../state/WorkspaceContext";
import { joinMatch, serverCount, sourceName } from "./words";

const KIND_ICONS: Readonly<Record<LoadedSource["kind"], React.ReactNode>> = {
    file: <GLYPHS.file size={14} aria-hidden />,
    server: <GLYPHS.server size={14} aria-hidden />,
    sample: <GLYPHS.sampleSource size={14} aria-hidden />,
    join: <GLYPHS.webAddress size={14} aria-hidden />,
};

const HOVER_ICONS: Readonly<Record<NonNullable<SourceRowCommand["icon"]>, React.ReactNode>> = {
    more: <GLYPHS.loadMore size={14} aria-hidden />,
    refresh: <GLYPHS.refresh size={14} aria-hidden />,
};

/** The row's own Rename, listed among the registered commands. */
const RENAME_ORDER = 80;

/**
 * The name being edited in place: Enter or leaving it commits, Escape cancels.
 * @param props - Component props
 * @param props.name - the name now
 * @param props.onDone - takes the new name, or null to cancel
 * @returns the input
 */
function RenameInput({
    name,
    onDone,
}: Readonly<{ name: string; onDone: (name: string | null) => void }>): React.JSX.Element {
    const [text, setText] = useState(name);
    const input = useRef<HTMLInputElement>(null);
    // Focused once the menu that opened it has closed and handed focus back to its button, so
    // that hand-back is not taken as leaving the field.
    useEffect(() => {
        const timer = setTimeout(() => {
            input.current?.focus();
            input.current?.select();
        }, 0);
        return () => {
            clearTimeout(timer);
        };
    }, []);
    return (
        <TextInput
            ref={input}
            size="xs"
            className="dp-rename"
            aria-label="Source name"
            value={text}
            onChange={(event) => {
                setText(event.currentTarget.value);
            }}
            onBlur={(event) => {
                // The menu that opened it hands focus back to its button in the same row, and the
                // window losing focus blurs the field too: neither is the reader leaving it.
                const to = event.relatedTarget;
                if (to instanceof Node && event.currentTarget.closest(".dp-source")?.contains(to) === true) {
                    event.currentTarget.focus();
                    return;
                }
                if (document.hasFocus()) {
                    onDone(text);
                }
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    onDone(text);
                } else if (event.key === "Escape") {
                    onDone(null);
                }
            }}
        />
    );
}

/**
 * One Sources row (spec section 3.2): the kind's icon, the name, the node and edge chips (none for
 * a count of 0); a joined table's link and matched rows; a server load's node chip "500 of 40,000". On hover
 * or focus, Load more, Refresh and "..." take the chips' place, and a running one stays drawn busy. Its menu (right-click, Shift+F10 or "...") lists every registered Sources row command
 * that applies, and Rename.
 * @param props - Component props
 * @param props.source - the load
 * @param props.selected - whether it is the selected row
 * @param props.onSelect - selects it
 * @returns the row
 */
export function SourceRow({
    source,
    selected,
    onSelect,
}: Readonly<{ source: LoadedSource; selected: boolean; onSelect: () => void }>): React.JSX.Element {
    const workspace = useWorkspace();
    const { session, registry, store } = workspace;
    const [renaming, setRenaming] = useState(false);
    // The hover action still running (Load more, Refresh), drawn busy until it settles.
    const [busy, setBusy] = useState<string | null>(null);
    const name = sourceName(source);
    const commands = registry.sourceRow.filter((command) => command.shown?.(workspace, source) ?? true);
    const items: { id: string; label: string; order: number; run: () => void }[] = [
        ...commands.map((command) => ({
            id: command.id,
            label: command.label,
            order: command.order ?? Number.MAX_SAFE_INTEGER,
            run: () => {
                void command.run(workspace, source);
            },
        })),
        {
            id: "source.rename",
            label: "Rename",
            order: RENAME_ORDER,
            run: () => {
                setRenaming(true);
            },
        },
    ].sort((a, b) => a.order - b.order);
    const rename = (next: string | null): void => {
        setRenaming(false);
        if (next === null || next.trim() === "" || next === name || session === null) {
            return;
        }
        session.data.renameSource(next.trim(), source.key).catch(() => {
            store.set({ notice: { message: "Not renamed" } });
        });
    };
    const match = joinMatch(source);
    const menuItems = items.map((item) => (
        <Menu.Item key={item.id} onClick={item.run}>
            {item.label}
        </Menu.Item>
    ));

    return (
        <ContextMenu
            target={
                <div // NOSONAR(S6819): a <ul>/<li> would bring list styling and spacing the compact rows do not use; the role gives the same semantics
                    className="dp-source"
                    data-source={source.key}
                    data-selected={selected ? "" : undefined}
                    data-busy={busy === null ? undefined : ""}
                    role="listitem"
                    aria-label={name}
                >
                    {renaming ? (
                        <RenameInput name={name} onDone={rename} />
                    ) : (
                        <button type="button" className="dp-source-main" aria-pressed={selected} onClick={onSelect}>
                            <span className="dp-source-icon">{KIND_ICONS[source.kind]}</span>
                            <span className="dp-source-name">{name}</span>
                            {match === null ? null : (
                                <span className="dp-quiet" aria-label={`${match} matched`}>
                                    {match}
                                </span>
                            )}
                            <span className="dp-source-chips">
                                {source.counts.nodes === 0 ? null : (
                                    // A server load's chip reads "100 of 171" when its source says how many it holds.
                                    <EntityChip kind="node">
                                        {serverCount(source.counts.nodes, source.total)}
                                    </EntityChip>
                                )}
                                {source.counts.edges === 0 ? null : (
                                    <EntityChip kind="edge">{formatNumber(source.counts.edges)}</EntityChip>
                                )}
                            </span>
                        </button>
                    )}
                    <span className="dp-source-actions">
                        {commands.flatMap((command) =>
                            command.icon === undefined
                                ? []
                                : [
                                      <Tooltip key={command.id} label={command.label}>
                                          <ActionIcon
                                              variant="subtle"
                                              size="sm"
                                              aria-label={command.label}
                                              loading={busy === command.id}
                                              disabled={busy !== null}
                                              onClick={() => {
                                                  setBusy(command.id);
                                                  void Promise.resolve(command.run(workspace, source)).finally(() => {
                                                      setBusy(null);
                                                  });
                                              }}
                                          >
                                              {HOVER_ICONS[command.icon]}
                                          </ActionIcon>
                                      </Tooltip>,
                                  ],
                        )}
                        <Menu position="bottom-end">
                            <Menu.Target>
                                <ActionIcon variant="subtle" size="sm" aria-label={`${name} menu`}>
                                    <GLYPHS.more size={14} aria-hidden />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>{menuItems}</Menu.Dropdown>
                        </Menu>
                    </span>
                </div>
            }
        >
            {menuItems}
        </ContextMenu>
    );
}
