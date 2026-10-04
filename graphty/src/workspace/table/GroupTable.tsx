import { DataTable, type DataTableColumn, UiGlyph } from "@graphty/compact-mantine";
import type { SummaryGroup } from "@graphty/graphty-element/session";
import { ActionIcon, Menu } from "@mantine/core";
import type React from "react";

import { groupName } from "./columns";

/** Props for GroupTable. */
interface GroupTableProps {
    /** The run's name, for the table's accessible name. */
    runLabel: string;
    /** The run's groups, as graphty-element's result summary lists them (largest first). */
    groups: readonly SummaryGroup[];
    height: number;
    /** "Show members in table": the Nodes tab, narrowed to this group. */
    onShowMembers: (group: SummaryGroup) => void;
}

/**
 * A group run's item tab (tier1-design.md section 2.9): one row per group with its size. Each
 * row's "..." menu holds "Show members in table".
 * @param props - Component props
 * @param props.runLabel - The run's name
 * @param props.groups - The run's groups
 * @param props.height - The table's height in pixels
 * @param props.onShowMembers - Called with the group whose members to show
 * @returns The table
 */
export function GroupTable({ runLabel, groups, height, onShowMembers }: GroupTableProps): React.JSX.Element {
    const columns: DataTableColumn<SummaryGroup>[] = [
        { id: "group", header: "Group", value: groupName },
        { id: "size", header: "Size", value: (group) => group.size, align: "end" },
        {
            id: "menu",
            header: "",
            width: 40,
            sortable: false,
            filterable: false,
            hideable: false,
            value: () => undefined,
            cell: (group) => (
                <Menu position="bottom-end">
                    <Menu.Target>
                        <ActionIcon variant="subtle" aria-label={`${groupName(group)} options`}>
                            <UiGlyph name="more" />
                        </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item
                            onClick={() => {
                                onShowMembers(group);
                            }}
                        >
                            Show members in table
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            ),
        },
    ];
    return (
        <DataTable<SummaryGroup>
            label={runLabel}
            data={groups}
            columns={columns}
            getRowId={(group) => String(group.group)}
            height={height}
            selectionMode="none"
        />
    );
}
