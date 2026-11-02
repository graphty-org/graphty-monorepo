/**
 * The workspace's matches strip (design/ui/selection-groups/spec.md, sections 3.0 and 8): the
 * selection's matches only, a Group column first, columns sized to their content, virtualized. It
 * reads the members graphty-element counts (`scope.watchSteps`); a row clicked while Pick on canvas
 * is armed fills the reference instead of selecting.
 */

import type { DataTableSort } from "@graphty/compact-mantine";
import type { EdgeId, GraphSession, NodeId, UnionLeaf } from "@graphty/graphty-element/session";
import { useElementSize } from "@mantine/hooks";
import React, { useState } from "react";

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
    const kind: RecordKind = rule.side === "nodes" ? "node" : "edge";
    // The Group column is drawn only when there are two groups to tell apart.
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
    const columns = columnChoices(session, kind).filter((choice) => choice.hidden !== true);
    return (
        <section className="sel-ws-strip" aria-label="Matches" ref={ref}>
            {reading !== null && height > 0 && (
                <RecordTable
                    key={JSON.stringify(reading.rule)}
                    session={session}
                    kind={kind}
                    columns={columns}
                    scope={reading.branches.find((each) => each.id === branch)?.members ?? reading.result}
                    groupOf={groupOf}
                    sort={sort}
                    onSortChange={setSort}
                    height={height}
                />
            )}
        </section>
    );
}
