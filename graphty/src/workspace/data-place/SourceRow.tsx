import { ContextMenu, EntityChip, Popout, PopoutManager } from "@graphty/compact-mantine";
import type { LoadedSource } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Menu, TextInput, Tooltip, VisuallyHidden } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import type { SourceRowCommand } from "../commands/registry";
import { CommandMenuItem } from "../frame/menus";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { useWorkspace } from "../state/WorkspaceContext";
import { IssuesList } from "../table/IssuesList";
import { countWords, joinMatch, joinWords, serverCount, sourceName } from "./words";

const KIND_ICONS: Readonly<Record<LoadedSource["kind"], React.ReactNode>> = {
    file: <GLYPHS.file size={14} aria-hidden />,
    url: <GLYPHS.webAddress size={14} aria-hidden />,
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

/** The glyph each row menu item draws before its label, as the Style "+" items do. */
const ITEM_GLYPHS: Readonly<Record<string, React.ReactNode>> = {
    "source.edit-join": <GLYPHS.join size={14} aria-hidden />,
    "source.replace": <GLYPHS.upload size={14} aria-hidden />,
    "source.load-more": <GLYPHS.loadMore size={14} aria-hidden />,
    "source.refresh": <GLYPHS.refresh size={14} aria-hidden />,
    "source.select-nodes": <GLYPHS.selection size={14} aria-hidden />,
    "source.rename": <GLYPHS.rename size={14} aria-hidden />,
    "source.export": <GLYPHS.saveLocal size={14} aria-hidden />,
    "source.remove": <GLYPHS.delete size={14} aria-hidden />,
};

/** The key shown at an item's right: the window key that does the same, or the row's own F2. */
const ITEM_KEYS: Readonly<Record<string, string>> = { "source.export": "Mod+E", "source.rename": "F2" };

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
    // Tab leaves the field for the row's next control, which commits: no keyboard trap.
    const tabbing = useRef(false);
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
                if (
                    !tabbing.current &&
                    to instanceof Node &&
                    event.currentTarget.closest(".dp-source")?.contains(to) === true
                ) {
                    event.currentTarget.focus();
                    return;
                }
                if (document.hasFocus()) {
                    onDone(text);
                }
            }}
            onKeyDown={(event) => {
                tabbing.current = event.key === "Tab";
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
 * The row's warning chip: the load's open issues, counted; it opens the one issue list
 * (`IssuesList`, the table's) for that load in a popover on the row. It stays while the popover is
 * open, so settling the last issue leaves the list and the focus where they are.
 * @param props - Component props
 * @param props.source - the load
 * @param props.name - its name
 * @returns the chip, or null when the load has no open issue
 */
function IssuesChip({ source, name }: Readonly<{ source: LoadedSource; name: string }>): React.JSX.Element | null {
    const { session } = useWorkspace();
    const [opened, setOpened] = useState(false);
    const count = session?.data.issues().filter((issue) => issue.source === source.key).length ?? 0;
    if (count === 0 && !opened) {
        return null;
    }
    return (
        <PopoutManager>
            <Popout opened={opened} onOpenChange={setOpened}>
                <Popout.Trigger>
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        color="yellow"
                        className="dp-source-issues"
                        leftSection={<GLYPHS.warning size={14} className="ws-issue-icon" aria-hidden />}
                        aria-label={`${String(count)} ${count === 1 ? "issue" : "issues"} in ${name}`}
                        aria-haspopup="dialog"
                        aria-expanded={opened}
                    >
                        {formatNumber(count)}
                    </Button>
                </Popout.Trigger>
                <Popout.Panel
                    width={360}
                    placement="right"
                    alignment="start"
                    header={{ variant: "title", title: `Issues in ${name}` }}
                >
                    <Popout.Content>
                        <IssuesList source={source.key} />
                    </Popout.Content>
                </Popout.Panel>
            </Popout>
        </PopoutManager>
    );
}

/**
 * One Sources row (spec section 3.2): the kind's icon, the name, the node and edge chips (none for
 * a count of 0, named "13 nodes, 18 edges"); a joined table's matched rows when some did not join; a
 * server load's node chip "500 of 40,000". The name gives way last and shows in full in a tooltip.
 * On hover or focus, Load more, Refresh and "..." appear after the chips, and a running one stays
 * drawn busy. Its menu (right-click, Shift+F10 or "...") lists every registered Sources row command
 * that applies, and Rename. A load with open issues shows a warning chip with their count, which
 * opens its issue list.
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
    const counted = countWords(source);
    const menuItems = items.map((item) => (
        <CommandMenuItem
            key={item.id}
            icon={ITEM_GLYPHS[item.id]}
            label={item.label}
            shortcut={ITEM_KEYS[item.id]}
            reason={null}
            onRun={item.run}
        />
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
                        <button
                            type="button"
                            className="dp-source-main"
                            aria-pressed={selected}
                            onClick={onSelect}
                            // A double-click or F2 renames the row, as in the layer tree; its menu shows the key.
                            onDoubleClick={() => {
                                setRenaming(true);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "F2") {
                                    event.preventDefault();
                                    setRenaming(true);
                                }
                            }}
                        >
                            <span className="dp-source-icon">{KIND_ICONS[source.kind]}</span>
                            <Tooltip label={name} openDelay={500}>
                                <span className="dp-source-name">{name}</span>
                            </Tooltip>
                            {match === null ? null : (
                                <Tooltip label={joinWords(source)}>
                                    <span className="dp-quiet" aria-hidden>
                                        {match}
                                    </span>
                                </Tooltip>
                            )}
                            {match === null ? null : <VisuallyHidden>{joinWords(source)}</VisuallyHidden>}
                            {counted === "" ? null : (
                                <Tooltip label={counted}>
                                    <span className="dp-source-chips" aria-hidden>
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
                                </Tooltip>
                            )}
                            {counted === "" ? null : <VisuallyHidden>{counted}</VisuallyHidden>}
                        </button>
                    )}
                    {renaming ? null : <IssuesChip source={source} name={name} />}
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
                                <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    className="dp-source-more"
                                    aria-label={`${name} menu`}
                                >
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
