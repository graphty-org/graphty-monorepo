/**
 * The workspace's matches strip (design/ui/selection-groups/spec.md, sections 3.0 and 8): the
 * selection's matches only, each row tinted in its group's color, columns sized to their content, virtualized. It
 * reads the members graphty-element counts (`scope.watchSteps`); a row clicked while Pick on canvas
 * is armed fills the reference instead of selecting. Its search comes first ("Large graphs", spec
 * 4.3): past the rows it draws, typing finds the rest (graphty-element's `matching`).
 */

import { type DataTableSort, SearchInput } from "@graphty/compact-mantine";
import type { EdgeId, GraphSession, NodeId, UnionLeaf } from "@graphty/graphty-element/session";
import { useElementSize } from "@mantine/hooks";
import React, { useDeferredValue, useState } from "react";

import { columnChoices, type RecordKind } from "../table/columns";
import { RecordTable } from "../table/RecordTable";
import { useEditedSelection } from "./useSteps";
import { letterOf } from "./words";

/**
 * The strip.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rule - the selection being edited
 * @param props.title - the selection's title, which a lone group goes by
 * @param props.branch - the group a count chip narrowed it to, or null for every match
 * @returns The strip
 */
export function MatchesStrip({
    session,
    rule,
    title,
    branch = null,
}: Readonly<{ session: GraphSession; rule: UnionLeaf; title: string; branch?: string | null }>): React.JSX.Element {
    const reading = useEditedSelection(session, rule);
    const { ref, height } = useElementSize();
    const [sort, setSort] = useState<DataTableSort | null>(null);
    const [text, setText] = useState("");
    // The table reads its page as the search allows: a keystroke is drawn at once.
    const typed = useDeferredValue(text.trim());
    const kind: RecordKind = rule.side === "nodes" ? "node" : "edge";
    // Rows are tinted by group only when there are two groups to tell apart.
    const groupOf =
        reading === null || reading.rule.branches.length < 2
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
    const columns = columnChoices(session, kind).filter(
        (choice) =>
            choice.hidden !== true &&
            (choice.group === "key" ||
                choice.role === "label" ||
                (choice.attribute !== undefined && tested.has(choice.attribute)) ||
                (choice.run !== undefined && runs.has(choice.run))),
    );
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
                        columns={columns}
                        scope={reading.branches.find((each) => each.id === branch)?.members ?? reading.result}
                        groupOf={groupOf}
                        sort={sort}
                        onSortChange={setSort}
                        height={height}
                        matching={typed === "" ? undefined : typed}
                        localSelection
                    />
                )}
            </div>
        </section>
    );
}
