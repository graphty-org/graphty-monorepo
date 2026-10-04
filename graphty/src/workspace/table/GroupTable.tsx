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
    /** "Show members in table": the Nodes tab, narrowed to this group, called with its name. */
    onShowMembers: (group: SummaryGroup, name: string) => void;
}

/** One row: a group and its name. */
interface Row {
    readonly group: SummaryGroup;
    readonly name: string;
}

/**
 * A group run's item tab (tier1-design.md section 2.9): one row per group with its size, largest
 * first. Each row's "..." menu holds "Show members in table". The rows keep the element's order,
 * so the headers do not sort and the caption "Largest group first" stays true.
 * @param props - Component props
 * @param props.runLabel - The run's name
 * @param props.groups - The run's groups
 * @param props.height - The table's height in pixels
 * @param props.onShowMembers - Called with the group whose members to show
 * @returns The table
 */
export function GroupTable({ runLabel, groups, height, onShowMembers }: GroupTableProps): React.JSX.Element {
    const rows = groups.map((group, index): Row => ({ group, name: groupName(group, index + 1) }));
    const columns: DataTableColumn<Row>[] = [
        { id: "group", header: "Group", sortable: false, value: (row) => row.name },
        { id: "size", header: "Size", sortable: false, value: (row) => row.group.size, align: "end" },
        {
            id: "menu",
            header: "",
            width: 40,
            sortable: false,
            filterable: false,
            hideable: false,
            value: () => undefined,
            cell: (row) => (
                <Menu position="bottom-end">
                    <Menu.Target>
                        <ActionIcon variant="subtle" aria-label={`${row.name} options`}>
                            <UiGlyph name="more" />
                        </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item
                            onClick={() => {
                                onShowMembers(row.group, row.name);
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
        <DataTable<Row>
            label={runLabel}
            data={rows}
            columns={columns}
            getRowId={(row) => String(row.group.group)}
            height={height}
            selectionMode="none"
        />
    );
}
