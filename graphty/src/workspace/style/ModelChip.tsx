import type { CodedFact } from "@graphty/graphty-element/session";
import { Badge, Tooltip } from "@mantine/core";
import React from "react";

import { modelChip, type ModelChipWords } from "./modelWords";

/** Props for ModelChip. */
interface ModelChipProps {
    /** The chip's words and tooltip. */
    readonly chip: ModelChipWords;
    /** Red for what stops a model, yellow for what is worth knowing. */
    readonly tone?: "error" | "warning";
    /** Its accessible name, when it says more than its words. */
    readonly name?: string;
    /** Makes it a button. */
    readonly onClick?: () => void;
}

/**
 * One problem graphty-element reports on a model or a picture, as a chip (node-models design
 * 13.6): one or two words, the detail in the tooltip, never a sentence.
 * @param props - Component props
 * @param props.chip - its words and tooltip
 * @param props.tone - error or warning
 * @param props.name - its accessible name
 * @param props.onClick - what pressing it does, when it is a button
 * @returns The chip
 */
export const ModelChip = React.forwardRef<HTMLButtonElement, ModelChipProps>(function ModelChip(
    { chip, tone = "error", name, onClick },
    ref,
) {
    const color = tone === "error" ? "red" : "yellow";
    return (
        <Tooltip label={chip.tip}>
            {onClick === undefined ? (
                <Badge size="sm" color={color} variant="light" role="status" aria-label={name}>
                    {chip.word}
                </Badge>
            ) : (
                <Badge
                    ref={ref}
                    component="button"
                    type="button"
                    size="sm"
                    color={color}
                    variant="light"
                    className="ws-chip-button"
                    aria-label={name ?? chip.word}
                    aria-haspopup="dialog"
                    onClick={onClick}
                >
                    {chip.word}
                </Badge>
            )}
        </Tooltip>
    );
});

/**
 * A problem's chip, from its code.
 * @param props - Component props
 * @param props.fact - the element's coded problem
 * @returns The chip
 */
export function FactChip({ fact }: Readonly<{ fact: CodedFact }>): React.JSX.Element {
    return <ModelChip chip={modelChip(fact)} tone={fact.code.startsWith("W_") ? "warning" : "error"} />;
}
