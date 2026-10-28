import { MenuCheckItem } from "@graphty/compact-mantine";
import {
    type ColumnRef,
    type ColumnRole,
    type DataIssue,
    type GraphSession,
    isGraphtyError,
    type ValueType,
} from "@graphty/graphty-element/session";
import { Menu } from "@mantine/core";
import React from "react";

import { pickEnd } from "../data-place/commands";
import { remap } from "../data-place/words";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace } from "../state/WorkspaceContext";
import {
    fixLabel,
    headerRoles,
    issueLabel,
    type RecordKind,
    ROLE_WORDS,
    type TableColumnChoice,
    VALUE_TYPES,
    valueTypeOf,
} from "./columns";

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
 * Gives a column a role, one undo step. A role the rows are made from (id, source, target, kind)
 * cannot change in place, so graphty-element refuses it; the column's load is then read again
 * with the column in that role, as the Fields row does. Source or target on a node column is one
 * end of rows read as edges: held until the other end is picked, here or in Fields.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 * @param ref - the column.
 * @param role - the role, or null for none.
 * @param kind - nodes or edges.
 * @param from - the loads whose rows carry the column, when the element says.
 */
async function assignRole(
    workspace: WorkspaceStore,
    session: GraphSession,
    ref: ColumnRef,
    role: ColumnRole | null,
    kind: RecordKind,
    from: readonly string[] | undefined,
): Promise<void> {
    const load = session.data
        .sources()
        .find((source) => source.reloadable === true && (from?.includes(source.key) ?? true));
    if (kind === "node" && (role === "source" || role === "target") && load !== undefined) {
        await pickEnd(workspace, session, load, role, ref.name);
        return;
    }
    try {
        await session.data.setRole(ref, role);
    } catch (error) {
        if (!isGraphtyError(error) || error.code !== "E_UNSUPPORTED" || role === null || load === undefined) {
            throw error;
        }
        const side = kind === "node" ? "nodes" : "edges";
        await session.data.reloadSource(load.key, { mapping: remap(load, side, { [role]: ref.name }) });
    }
}

/**
 * How many values would not convert to a type, as the Type row says before it is chosen.
 * @param session - the element's session.
 * @param ref - the column.
 * @param type - the type.
 * @returns such as "1 will not convert", or undefined when every value converts.
 */
function failWords(session: GraphSession, ref: ColumnRef, type: ValueType): string | undefined {
    try {
        const { fails } = session.data.previewType(ref, type);
        return fails === 0 ? undefined : `${String(fails)} will not convert`;
    } catch {
        return undefined;
    }
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
                              onClick={() => {
                                  session.data.ignoreIssue(issue, true).catch(fail);
                              }}
                          >
                              Ignore
                          </Menu.Item>
                          <Menu.Item
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
                            {[null, ...headerRoles(kind)].map((role) => (
                                <MenuCheckItem
                                    key={role ?? "none"}
                                    radio
                                    checked={role === (column.role ?? null)}
                                    onClick={() => {
                                        if (role !== (column.role ?? null)) {
                                            assignRole(
                                                store,
                                                session,
                                                ref,
                                                role,
                                                kind,
                                                column.descriptor?.sources,
                                            ).catch(fail);
                                        }
                                    }}
                                >
                                    {role === null ? "none" : ROLE_WORDS[role]}
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
