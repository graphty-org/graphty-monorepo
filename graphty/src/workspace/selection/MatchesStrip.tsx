/**
 * The workspace's matches strip (design/ui/selection-groups/spec.md, sections 3.0 and 8): the
 * selection's matches only, each row tinted in its group's color, columns sized to their content, virtualized. It
 * reads the members graphty-element counts (`scope.watchSteps`); a row clicked while Pick on canvas
 * is armed fills the reference instead of selecting. Its search comes first ("Large graphs", spec
 * 4.3): past the rows it draws, typing finds the rest (graphty-element's `matching`).
 */

import { type DataTableSort, SearchInput } from "@graphty/compact-mantine";
import type { EdgeId, GraphSession, NodeId, UnionLeaf } from "@graphty/graphty-element/session";
import { Text } from "@mantine/core";
import React, { useDeferredValue, useState } from "react";

import { columnChoices, type RecordKind } from "../table/columns";
import { RecordTable } from "../table/RecordTable";
import { useBoxSize } from "../useBoxSize";
import { useEditedSelection } from "./useSteps";
import { letterOf } from "./words";

/**
 * The strip.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rule - the selection being edited
 * @param props.title - the selection's title, which a lone group goes by
 * @param props.branch - the group a count chip narrowed it to, or null for every match
 * @param props.modal - drawn in the full-screen workspace (the `selection-workspace` experiment): rows
 *     tinted by group, only the columns the steps test, a click marking the row here only. Off, a
 *     Group column, every column, and a click selecting in the graph.
 * @returns The strip
 */
export function MatchesStrip({
    session,
    rule,
    title,
    branch = null,
    modal = false,
}: Readonly<{
    session: GraphSession;
    rule: UnionLeaf;
    title: string;
    branch?: string | null;
    modal?: boolean;
}>): React.JSX.Element {
    const reading = useEditedSelection(session, rule);
    const { ref, height } = useBoxSize();
    const [sort, setSort] = useState<DataTableSort | null>(null);
    const [text, setText] = useState("");
    // The table reads its page as the search allows: a keystroke is drawn at once.
    const typed = useDeferredValue(text.trim());
    const kind: RecordKind = rule.side === "nodes" ? "node" : "edge";
    // Rows are tinted by group: in the workspace always, a single card's rows in its color too (the
    // owner, 2026-11-04); in the outline editor only when there are two groups to tell apart.
    const fewest = modal ? 1 : 2;
    const groupOf =
        reading === null || reading.rule.branches.length < fewest
            ? undefined
            : (id: NodeId | EdgeId): { name: string; color: string } | null => {
                  const branchId = reading.branchOf(id);
                  const at = reading.rule.branches.findIndex((branch) => branch.id === branchId);
                  const branch = reading.rule.branches[at];
                  const single = reading.rule.branches.length === 1 ? title : undefined;
                  return branch === undefined
                      ? null
                      : { name: branch.name ?? single ?? letterOf(at), color: branch.color ?? "" };
              };
    // The keys, the name, and one column per value the groups test: a run's column only when a
    // step reads that run, so runs outside this selection draw no column.
    const tested = new Set(
        (reading?.rule.branches ?? []).flatMap((each) =>
            each.steps.flatMap((step) => {
                const read = step.rule as { attribute?: string; reads?: string };
                const path = read.attribute ?? read.reads;
                return path === undefined ? [] : [path];
            }),
        ),
    );
    const runs = new Set((reading?.branches ?? []).flatMap((each) => each.steps.flatMap((step) => step.run ?? [])));
    // A step reads a data column by its path (`data.score`, `data.score.value`).
    const reads = (attribute: string): boolean =>
        [...tested].some(
            (path) => path === attribute || path === `data.${attribute}` || path.startsWith(`data.${attribute}.`),
        );
    const columns = columnChoices(session, kind).filter(
        (choice) =>
            choice.hidden !== true &&
            (!modal ||
                choice.group === "key" ||
                choice.role === "label" ||
                (choice.attribute !== undefined && reads(choice.attribute)) ||
                (choice.run !== undefined && runs.has(choice.run))),
    );
    // A card on the graph's structure (Degree) shows it too: it is no attribute, so no choice above.
    const structure =
        !modal || kind !== "node"
            ? []
            : session.data
                  .structureValues()
                  .filter((value) => tested.has(value.path))
                  .map((value) => ({
                      id: `s:${value.path}`,
                      header: value.plainName,
                      group: "attribute" as const,
                      numeric: true,
                      attribute: value.path,
                      structure: true,
                  }));
    if (modal && reading !== null && reading.total.count === 0) {
        return (
            <section className="sel-ws-strip" aria-label="Matches" data-empty="">
                <Text size="sm" c="dimmed">
                    No matches
                </Text>
            </section>
        );
    }
    return (
        <section className="sel-ws-strip" aria-label="Matches">
            <SearchInput
                className="sel-ws-strip-search"
                aria-label="Search matches"
                placeholder="Search matches"
                value={text}
                onChange={setText}
            />
            <div className="sel-ws-strip-table" ref={ref}>
                {reading !== null && height > 0 && (
                    <RecordTable
                        key={`${JSON.stringify(reading.rule)} ${typed}`}
                        session={session}
                        kind={kind}
                        columns={[...columns, ...structure]}
                        scope={reading.branches.find((each) => each.id === branch)?.members ?? reading.result}
                        groupOf={groupOf}
                        sort={sort}
                        onSortChange={setSort}
                        height={height}
                        matching={typed === "" ? undefined : typed}
                        localSelection={modal}
                        groupColumn={!modal}
                    />
                )}
            </div>
        </section>
    );
}
