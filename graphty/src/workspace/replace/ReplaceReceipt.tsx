import { EntityChip } from "@graphty/compact-mantine";
import type { ReplaceReport } from "@graphty/graphty-element/session";
import { Button } from "@mantine/core";
import React from "react";

import { countWords, unboundWords } from "./words";

/** Props for ReplaceReceipt. */
interface ReplaceReceiptProps {
    /** The replaced source's name. */
    readonly before: string;
    /** The copy's name. */
    readonly after: string;
    /** What the element counted. */
    readonly report: ReplaceReport;
    /** Opens what came unbound; absent hides Show. */
    readonly onShow?: () => void;
}

/**
 * The replace receipt (spec section 3.7): the two names, node and edge chips for what was added,
 * removed and changed, what came unbound with Show. The notice it sits in carries Undo.
 * @param props - Component props
 * @param props.before - the replaced source's name
 * @param props.after - the copy's name
 * @param props.report - what the element counted
 * @param props.onShow - opens what came unbound
 * @returns the receipt
 */
export function ReplaceReceipt({ before, after, report, onShow }: ReplaceReceiptProps): React.JSX.Element {
    const unbound = unboundWords(report);
    return (
        <span className="rp-receipt" style={{ display: "inline-flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span>{`Replaced ${before} with ${after}`}</span>
            {(["node", "edge"] as const).flatMap((kind) =>
                countWords(report[kind === "node" ? "nodes" : "edges"]).map((words) => (
                    <EntityChip key={`${kind}-${words}`} kind={kind}>
                        {words}
                    </EntityChip>
                )),
            )}
            {unbound.map((words) => (
                <span key={words}>{words}</span>
            ))}
            {unbound.length > 0 && onShow !== undefined ? (
                <Button variant="subtle" size="compact-xs" onClick={onShow}>
                    Show
                </Button>
            ) : null}
        </span>
    );
}
