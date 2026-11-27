import { ContextMenu, ControlSection, FieldRow, Popout, PopoutManager } from "@graphty/compact-mantine";
import type { LoadedSource } from "@graphty/graphty-element/session";
import { ActionIcon, Badge, Button, Menu, Text, Tooltip } from "@mantine/core";
import React, { useState } from "react";

import type { SourceRowCommand } from "../commands/registry";
import { sourceReferencesOn } from "../features";
import { CommandMenuItem } from "../frame/menus";
import { RenameInput } from "../frame/RenameInput";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { TIME_FIELD_EVENTS, useSessionEvents } from "../sessionEvents";
import { remap, removeStaged } from "../source-steps/actions";
import { StagedRows } from "../source-steps/StagedFields";
import { STAGED_WORDS } from "../source-steps/words";
import { useWorkspace } from "../state/WorkspaceContext";
import { IssuesList } from "../table/IssuesList";
import { SourceFields } from "./Fields";
import { FiltersSection } from "./Filters";
import { countWords, sourceName, stagedCountWords } from "./words";

const HOVER_ICONS: Readonly<Record<NonNullable<SourceRowCommand["icon"]>, React.ReactNode>> = {
    more: <GLYPHS.loadMore size={14} aria-hidden />,
    refresh: <GLYPHS.refresh size={14} aria-hidden />,
};

/** The entry's own Rename, listed among the registered commands. */
const RENAME_ORDER = 80;

/** The glyph each menu item draws before its label, as the Style "+" items do. */
const ITEM_GLYPHS: Readonly<Record<string, React.ReactNode>> = {
    "source.edit-join": <GLYPHS.join size={14} aria-hidden />,
    "source.replace": <GLYPHS.upload size={14} aria-hidden />,
    "source.edit-network": <GLYPHS.rename size={14} aria-hidden />,
    "source.load-more": <GLYPHS.loadMore size={14} aria-hidden />,
    "source.refresh": <GLYPHS.refresh size={14} aria-hidden />,
    "source.select-nodes": <GLYPHS.selection size={14} aria-hidden />,
    "source.rename": <GLYPHS.rename size={14} aria-hidden />,
    "source.export": <GLYPHS.saveLocal size={14} aria-hidden />,
    "source.remove": <GLYPHS.delete size={14} aria-hidden />,
};

/** The key shown at an item's right: the window key that does the same, or the entry's own F2. */
const ITEM_KEYS: Readonly<Record<string, string>> = { "source.export": "Mod+E", "source.rename": "F2" };

/**
 * The entry's warning chip: the load's open issues, counted; it opens the one issue list
 * (`IssuesList`, the table's) for that load in a popover. It stays while the popover is open, so
 * settling the last issue leaves the list and the focus where they are.
 * @param props - Component props
 * @param props.source - the load
 * @param props.name - its name
 * @returns the chip, or null when the load has no open issue
 */
function IssuesChip({ source, name }: Readonly<{ source: LoadedSource; name: string }>): React.JSX.Element | null {
    const { session } = useWorkspace();
    // on reload: fresh: pointer: the issue list opened for a look
    const [opened, setOpened] = useState(false);
    const count = session?.data.issues().filter((issue) => issue.source === source.key).length ?? 0;
    if (count === 0 && !opened) {
        return null;
    }
    // Every issue fixed while the list is open: a check, not a warning reading "0".
    const done = count === 0;
    const issues = `${String(count)} ${count === 1 ? "issue" : "issues"} in ${name}`;
    const icon = done ? (
        <GLYPHS.check size={14} aria-hidden />
    ) : (
        <GLYPHS.warning size={14} className="ws-issue-icon" aria-hidden />
    );
    return (
        <PopoutManager>
            <Popout opened={opened} onOpenChange={setOpened}>
                <Popout.Trigger>
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        color={done ? "gray" : "yellow"}
                        className="dp-source-issues"
                        leftSection={icon}
                        aria-label={done ? `No issues left in ${name}` : issues}
                        aria-haspopup="dialog"
                        aria-expanded={opened}
                    >
                        {done ? null : formatNumber(count)}
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
 * The "..." button of an entry or a join, opening its menu.
 * @param props - Component props
 * @param props.name - the entry's name
 * @param props.children - the menu's items
 * @returns the button and its menu
 */
export function MoreMenu({ name, children }: Readonly<{ name: string; children: React.ReactNode }>): React.JSX.Element {
    return (
        <Menu position="bottom-end">
            <Menu.Target>
                <ActionIcon variant="subtle" size="sm" className="dp-source-more" aria-label={`${name} menu`}>
                    <GLYPHS.more size={14} aria-hidden />
                </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>{children}</Menu.Dropdown>
        </Menu>
    );
}

/**
 * Renaming a source in its entry.
 * @param source - the source
 * @returns whether a rename is under way, and what starts and ends it
 */
function useRename(source: LoadedSource): {
    readonly renaming: boolean;
    readonly start: () => void;
    readonly done: (next: string | null) => void;
} {
    const { session, store } = useWorkspace();
    // on reload: fresh: in flight: a rename under way
    const [renaming, setRenaming] = useState(false);
    return {
        renaming,
        start: () => {
            setRenaming(true);
        },
        done: (next) => {
            setRenaming(false);
            if (next === null || next.trim() === "" || next === sourceName(source) || session === null) {
                return;
            }
            session.data.renameSource(next.trim(), source.key).catch(() => {
                store.set({ notice: { message: "Not renamed" } });
            });
        },
    };
}

/**
 * What every source entry is: a list item with its menu by right-click, whose header F2 or a
 * double-click renames, drawn as the rename box while it does.
 * @param props - Component props
 * @param props.name - the source's name
 * @param props.rename - its rename
 * @param props.attributes - the item's data attributes
 * @param props.menuItems - its menu
 * @param props.children - its section
 * @returns the entry
 */
function EntryFrame({
    name,
    rename,
    attributes,
    menuItems,
    children,
}: Readonly<{
    name: string;
    rename: ReturnType<typeof useRename>;
    attributes: Readonly<Record<`data-${string}`, string | undefined>>;
    menuItems: React.ReactNode;
    children: React.ReactNode;
}>): React.JSX.Element {
    return (
        <ContextMenu
            target={
                <div // eslint-disable-line jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-interactions -- a <ul>/<li> would bring list styling the entries do not use; F2 on the entry's header renames it, as its menu shows
                    className="dp-source-entry"
                    {...attributes}
                    role="listitem"
                    aria-label={name}
                    onKeyDown={(event) => {
                        if (event.key === "F2" && (event.target as HTMLElement).matches("[aria-expanded]")) {
                            event.preventDefault();
                            rename.start();
                        }
                    }}
                    // A double-click on the header renames the source, as in the layer tree.
                    onDoubleClick={(event) => {
                        if ((event.target as HTMLElement).closest("[aria-expanded]") !== null) {
                            rename.start();
                        }
                    }}
                >
                    {rename.renaming ? (
                        <RenameInput
                            name={name}
                            onDone={rename.done}
                            label="Source name"
                            container=".dp-source-entry"
                            className="dp-rename"
                        />
                    ) : (
                        children
                    )}
                </div>
            }
        >
            {menuItems}
        </ContextMenu>
    );
}

/**
 * The summary a closed entry shows after its name: its node and edge counts ("13 nodes, 18
 * edges"). How a joined table matched is in the inspector's details, not here: the sidebar holds no
 * join information.
 * @param source - the load
 * @returns the words, or undefined for none
 */
function summaryOf(source: LoadedSource): string | undefined {
    const words = countWords(source);
    return words === "" ? undefined : words;
}

/**
 * One loaded data source's entry in the Data place (the owner's rule: one collapsible entry per
 * source). Closed, it shows the source's name and its counts; open, its Nodes and Edges rows, its
 * fields and their pickers, then its own Filters with "Filter +". Its header carries the issues
 * chip, Load more and Refresh, and "..." with every registered source command and Rename (F2, or
 * the same menu by right-click). Opening it picks the source and opens it in the inspector.
 * @param props - Component props
 * @param props.source - the load
 * @param props.selected - whether it is the picked source
 * @param props.opened - whether it is open
 * @param props.onOpenChange - opens or closes it; opening picks it
 * @param props.primary - whether it is the only load, whose filters the toolbar adds to
 * @returns the entry
 */
export function SourceEntry({
    source,
    selected,
    opened,
    onOpenChange,
    primary,
}: Readonly<{
    source: LoadedSource;
    selected: boolean;
    opened: boolean;
    onOpenChange: (open: boolean) => void;
    primary: boolean;
}>): React.JSX.Element {
    const workspace = useWorkspace();
    const { session, registry } = workspace;
    useSessionEvents(session, TIME_FIELD_EVENTS);
    const renamed = useRename(source);
    // The hover action still running (Load more, Refresh), drawn busy until it settles.
    // on reload: fresh: in flight: a Load more or Refresh under way
    const [busy, setBusy] = useState<string | null>(null);
    const name = sourceName(source);
    const commands = registry.sourceRow.filter((command) => command.shown?.(workspace, source) ?? true);
    const items = [
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
            run: renamed.start,
        },
    ].sort((a, b) => a.order - b.order);
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
    const actions = (
        <span className="dp-source-actions">
            {source.copy === "reference" && sourceReferencesOn(session) ? (
                // With the source references experiment, a load a save keeps as a reference.
                <Badge component="span" variant="light" className="dp-source-ref" aria-label="Reference">
                    Ref
                </Badge>
            ) : null}
            <IssuesChip source={source} name={name} />
            {commands.flatMap((command) =>
                command.icon === undefined
                    ? []
                    : [
                          <Tooltip key={command.id} label={command.label}>
                              <ActionIcon
                                  variant="subtle"
                                  size="sm"
                                  className="dp-source-hover"
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
            <MoreMenu name={name}>{menuItems}</MoreMenu>
        </span>
    );
    const summary = summaryOf(source);
    return (
        <EntryFrame
            name={name}
            rename={renamed}
            attributes={{
                "data-source": source.key,
                "data-selected": selected ? "" : undefined,
                "data-busy": busy === null ? undefined : "",
            }}
            menuItems={menuItems}
        >
            <ControlSection
                label={name}
                headingLevel={3}
                {...(summary === undefined ? {} : { summary })}
                actions={actions}
                opened={opened}
                onOpenChange={onOpenChange}
            >
                {session === null ? null : <SourceFields session={session} source={source} />}
                <FiltersSection source={source.key} primary={primary} headingLevel={4} />
            </ControlSection>
        </EntryFrame>
    );
}

/**
 * A staged source's entry (the source-steps experiment): never drawn, matched or joined here. Closed,
 * it shows its name and the nodes and edges its rows are read as; open, how its rows are read (Rows are,
 * Key, an edge's ends) and its own Filters, which test its rows and count them, and judge what it builds
 * once it is joined; its details are in the inspector. Its "..." (also by right-click) holds Rename (F2)
 * and Remove. Adding and joining it happen in the join workspace (Join +).
 * @param props - Component props
 * @param props.source - the staged source
 * @param props.selected - whether it is the picked source
 * @param props.opened - whether it is open
 * @param props.onOpenChange - opens or closes it; opening picks it
 * @returns the entry, or nothing before the element has come up
 */
export function StagedEntry({
    source,
    selected,
    opened,
    onOpenChange,
}: Readonly<{
    source: LoadedSource;
    selected: boolean;
    opened: boolean;
    onOpenChange: (open: boolean) => void;
}>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const renamed = useRename(source);
    if (session === null) {
        return null;
    }
    const menuItems = (
        <>
            <CommandMenuItem
                icon={ITEM_GLYPHS["source.rename"]}
                label="Rename"
                shortcut={ITEM_KEYS["source.rename"]}
                reason={null}
                onRun={renamed.start}
            />
            <CommandMenuItem
                icon={ITEM_GLYPHS["source.remove"]}
                label={STAGED_WORDS.remove}
                shortcut={undefined}
                reason={null}
                onRun={() => {
                    void removeStaged(store, session, source.key);
                }}
            />
        </>
    );
    const name = sourceName(source);
    const { tables } = session.data.sourceTable(source.key).summary();
    // One row is read as a node, an edge or both: each table holds every row it reads.
    const rows = Math.max(0, ...tables.map((each) => each.rows));
    return (
        <EntryFrame
            name={name}
            rename={renamed}
            attributes={{ "data-staged": source.key, "data-selected": selected ? "" : undefined }}
            menuItems={menuItems}
        >
            <ControlSection
                label={name}
                headingLevel={3}
                summary={stagedCountWords(rows)}
                opened={opened}
                onOpenChange={onOpenChange}
                actions={
                    <span className="dp-source-actions">
                        <MoreMenu name={name}>{menuItems}</MoreMenu>
                    </span>
                }
            >
                <FieldRow>
                    <Text size="xs" truncate>
                        {STAGED_WORDS.rows}
                    </Text>
                    <Text size="xs" aria-label={STAGED_WORDS.rows}>
                        {formatNumber(rows)}
                    </Text>
                </FieldRow>
                <StagedRows
                    session={session}
                    reader={session.data}
                    source={source}
                    write={(patch) => {
                        void remap(store, session, source.key, patch);
                    }}
                />
                <FiltersSection source={source.key} primary={false} headingLevel={4} />
            </ControlSection>
        </EntryFrame>
    );
}
