import { ControlSection, DataRow } from "@graphty/compact-mantine";
import { Text } from "@mantine/core";
import type React from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { leftOutRow, leftOutSentence, loadIndexOf } from "./words";

/**
 * Lines with a key each: the line itself, numbered when it repeats.
 * @param lines - the lines, in order.
 * @returns each with its key.
 */
function keyedLines(lines: readonly string[]): { key: string; line: string }[] {
    const seen = new Map<string, number>();
    return lines.map((line) => {
        const n = (seen.get(line) ?? 0) + 1;
        seen.set(line, n);
        return { key: `${line}#${String(n)}`, line };
    });
}

/**
 * A Sources row in the inspector: what its load added and, when the load left edge rows out,
 * how many and why, then the left-out rows themselves, which the element keeps with the load
 * (through a save and reopen too). A table row shows its load's. Every count is the element's
 * (`data.sources()`).
 * @param props - Component props
 * @param props.row - The Sources row id, `source:<load>` or `source:<load>:<table>`
 * @returns The values
 */
export function SourceValues({ row }: Readonly<{ row: string }>): React.JSX.Element | null {
    const { session } = useWorkspace();
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
                    {keyedLines((leftOut.edges ?? []).map((edge) => leftOutRow(edge, leftOut.endColumns))).map(
                        ({ key, line }) => (
                            <DataRow key={key} name={line} />
                        ),
                    )}
                </>
            )}
        </ControlSection>
    );
}
