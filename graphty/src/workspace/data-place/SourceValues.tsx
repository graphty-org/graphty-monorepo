import { ControlSection, DataRow } from "@graphty/compact-mantine";
import { Text } from "@mantine/core";
import type React from "react";

import { canReopen, editSource } from "../data-page/request";
import { useWorkspace } from "../state/WorkspaceContext";
import { count, leftOutSentence, loadIndexOf } from "./words";

/**
 * A Sources row in the inspector: what its load added and, when the load left edge rows out,
 * how many and why, with a link that reopens the load (Edit source...) on those rows. A table
 * row shows its load's. Every count is the element's (`data.sources()`).
 * @param props - Component props
 * @param props.row - The Sources row id, `source:<load>` or `source:<load>:<table>`
 * @returns The values
 */
export function SourceValues({ row }: Readonly<{ row: string }>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const load = session?.data.sources()[loadIndexOf(row) ?? -1];
    if (load === undefined) {
        return (
            <Text size="xs" c="dimmed" p="md">
                This row is gone
            </Text>
        );
    }
    const { leftOut } = load;
    return (
        <ControlSection label="Added" defaultOpened>
            <DataRow stat name="Nodes" value={load.added.nodes} />
            <DataRow stat name="Edges" value={load.added.edges} />
            {leftOut !== undefined && (
                <>
                    <Text size="xs" px="md" py={2}>
                        {leftOutSentence(leftOut)}
                    </Text>
                    {canReopen(load) && (
                        <DataRow
                            name={
                                leftOut.rows === 1
                                    ? "Show the left-out row"
                                    : `Show the ${count(leftOut.rows, "left-out row")}`
                            }
                            onClick={() => {
                                editSource(store, load, "unmatched");
                            }}
                        />
                    )}
                </>
            )}
        </ControlSection>
    );
}
