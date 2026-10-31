import { MenuCheckItem } from "@graphty/compact-mantine";
import {
    COLUMN_ROLES,
    type ColumnRef,
    type ColumnRole,
    type DataIssue,
    type GraphSession,
    type LoadedSource,
} from "@graphty/graphty-element/session";
import { Menu } from "@mantine/core";
import React from "react";

import { remap } from "../data-place/words";
import { useWorkspace } from "../state/WorkspaceContext";
import {
    failWords,
    fixLabel,
    headerRoles,
    issueLabel,
    type RecordKind,
    ROLE_WORDS,
    type TableColumnChoice,
    VALUE_TYPES,
    valueTypeOf,
} from "./columns";

/**
 * MenuCheckItem's empty 16 px check column, for a plain row among an issue's fix rows, so Ignore
 * and Show rows start where the fixes do (Figma: a menu's labels stay aligned).
 */
const CHECK_COLUMN = <span className="cm-menu-row-check" aria-hidden="true" />;

/** What the header menu asks the table to do with its own arrangement. */
export interface HeaderMenuActions {
    readonly sort: (descending: boolean) => void;
    readonly rename: () => void;
    readonly hide: () => void;
    readonly hideOthers: () => void;
    readonly unhide: (columns: readonly TableColumnChoice[]) => void;
    /** Narrows the table to the rows one issue is on. */
    readonly showRows: (issue: DataIssue) => void;
    /** Ignores every issue the header carries, one undo step. */
    readonly ignoreAll: () => void;
}

/** Props for HeaderMenu. */
interface HeaderMenuProps {
    readonly column: TableColumnChoice;
    readonly kind: RecordKind;
    /** The issues whose warning this header carries. */
    readonly issues: readonly DataIssue[];
    /** The table's hidden columns, for Unhide. */
    readonly hidden: readonly TableColumnChoice[];
    readonly actions: HeaderMenuActions;
}

/**
 * Gives a column a role, one undo step: in place, or for a role the rows are made from
 * (`COLUMN_ROLES[kind].atLoad`: id, source, target, kind) by reading the column's load again with
 * the column in that role, as the Fields row does.
 * @param session - the element's session.
 * @param ref - the column.
 * @param role - the role, or null for none.
 * @param kind - nodes or edges.
 * @param load - the load whose rows carry the column, when it can be read again.
 */
async function assignRole(
    session: GraphSession,
    ref: ColumnRef,
    role: ColumnRole | null,
    kind: RecordKind,
    load: LoadedSource | undefined,
): Promise<void> {
    if (role !== null && COLUMN_ROLES[kind].atLoad.includes(role)) {
        if (load === undefined) {
            throw new Error("the load cannot be read again");
        }
        const side = kind === "node" ? "nodes" : "edges";
        await session.data.reloadSource(load.key, { mapping: remap(load, side, { [role]: ref.name }) });
        return;
    }
    await session.data.setRole(ref, role);
}

/**
 * A header's menu (spec section 3.5.2), one level, with Type and Role as short pick lists: first
 * each issue's fixes (the one the data shows checked), Ignore and Show rows, and Ignore all for
 * more than one, so the keyboard reaches what the warning's hover shows; then
 * Type, Role, Rename..., Hide, Hide others, Unhide (each hidden column, then all; only when something
 * is hidden), the
 * commands other packages register for a column (Match on this, in join mode), and the sorts.
 * Items whose precondition is missing are absent.
 * @param props - Component props
 * @param props.column - the column
 * @param props.kind - nodes or edges
 * @param props.issues - the column's issues
 * @param props.hidden - the hidden columns
 * @param props.actions - the table's own arrangement
 * @returns the menu's items
 */
export function HeaderMenu({ column, kind, issues, hidden, actions }: HeaderMenuProps): React.JSX.Element {
    const workspace = useWorkspace();
    const { session, store, registry } = workspace;
    const fail = (): void => {
        store.set({ notice: { message: "Column not changed" } });
    };
    const { ref } = column;
    const current = valueTypeOf(column.descriptor);
    // A found location is already the column's role (columnChoices).
    const role = column.role ?? null;
    const from = column.descriptor?.sources;
    const load = session?.data
        .sources()
        .find((source) => source.reloadable === true && (from?.includes(source.key) ?? true));
    const registered =
        ref === undefined ? [] : registry.columnHeader.filter((command) => command.shown?.(workspace, ref) ?? true);

    return (
        <>
            {session === null
                ? null
                : issues.map((issue) => (
                      <React.Fragment key={issue.id}>
                          <Menu.Label>{issueLabel(issue)}</Menu.Label>
                          {[...(issue.current === undefined ? [] : [issue.current]), ...issue.fixes].map((fix) => (
                              <MenuCheckItem
                                  key={fix}
                                  radio
                                  checked={fix === issue.current}
                                  onClick={() => {
                                      session.data.fix(issue, fix).catch(fail);
                                  }}
                              >
                                  {fixLabel(fix)}
                              </MenuCheckItem>
                          ))}
                          <Menu.Item
                              leftSection={CHECK_COLUMN}
                              onClick={() => {
                                  session.data.ignoreIssue(issue, true).catch(fail);
                              }}
                          >
                              Ignore
                          </Menu.Item>
                          <Menu.Item
                              leftSection={CHECK_COLUMN}
                              onClick={() => {
                                  actions.showRows(issue);
                              }}
                          >
                              Show rows
                          </Menu.Item>
                          <Menu.Divider />
                      </React.Fragment>
                  ))}
            {session === null || issues.length < 2 ? null : (
                <>
                    <Menu.Item onClick={actions.ignoreAll}>Ignore all</Menu.Item>
                    <Menu.Divider />
                </>
            )}
            {session === null || ref === undefined ? null : (
                <>
                    <Menu.Sub>
                        <Menu.Sub.Target>
                            <Menu.Sub.Item>Type</Menu.Sub.Item>
                        </Menu.Sub.Target>
                        <Menu.Sub.Dropdown>
                            {VALUE_TYPES.map(({ type, label }) => (
                                <MenuCheckItem
                                    key={type}
                                    radio
                                    checked={type === current}
                                    rightSection={type === current ? undefined : failWords(session, ref, type)}
                                    onClick={() => {
                                        if (type !== current) {
                                            session.data.setType(ref, type).catch(fail);
                                        }
                                    }}
                                >
                                    {label}
                                </MenuCheckItem>
                            ))}
                        </Menu.Sub.Dropdown>
                    </Menu.Sub>
                    <Menu.Sub>
                        <Menu.Sub.Target>
                            <Menu.Sub.Item>Role</Menu.Sub.Item>
                        </Menu.Sub.Target>
                        <Menu.Sub.Dropdown>
                            {[null, ...headerRoles(kind, load !== undefined)].map((each) => (
                                <MenuCheckItem
                                    key={each ?? "none"}
                                    radio
                                    checked={each === role}
                                    onClick={() => {
                                        if (each !== role) {
                                            assignRole(session, ref, each, kind, load).catch(fail);
                                        }
                                    }}
                                >
                                    {each === null ? "None" : ROLE_WORDS[each]}
                                </MenuCheckItem>
                            ))}
                        </Menu.Sub.Dropdown>
                    </Menu.Sub>
                    <Menu.Item onClick={actions.rename}>Rename...</Menu.Item>
                </>
            )}
            <Menu.Item onClick={actions.hide}>Hide</Menu.Item>
            <Menu.Item onClick={actions.hideOthers}>Hide others</Menu.Item>
            {hidden.length === 0 ? null : (
                <Menu.Sub>
                    <Menu.Sub.Target>
                        <Menu.Sub.Item>Unhide</Menu.Sub.Item>
                    </Menu.Sub.Target>
                    <Menu.Sub.Dropdown mah={320} style={{ overflowY: "auto" }}>
                        {hidden.map((each) => (
                            <Menu.Item
                                key={each.id}
                                onClick={() => {
                                    actions.unhide([each]);
                                }}
                            >
                                {each.header}
                            </Menu.Item>
                        ))}
                        <Menu.Divider />
                        <Menu.Item
                            onClick={() => {
                                actions.unhide(hidden);
                            }}
                        >
                            Unhide all
                        </Menu.Item>
                    </Menu.Sub.Dropdown>
                </Menu.Sub>
            )}
            {registered.map((command) => (
                <Menu.Item
                    key={command.id}
                    onClick={() => {
                        if (ref !== undefined) {
                            void command.run(workspace, ref);
                        }
                    }}
                >
                    {command.label}
                </Menu.Item>
            ))}
            <Menu.Divider />
            <Menu.Item
                onClick={() => {
                    actions.sort(false);
                }}
            >
                Sort ascending
            </Menu.Item>
            <Menu.Item
                onClick={() => {
                    actions.sort(true);
                }}
            >
                Sort descending
            </Menu.Item>
        </>
    );
}
