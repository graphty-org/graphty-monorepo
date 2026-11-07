import type { CodedFact } from "@graphty/graphty-element/session";
import { Badge, Tooltip, VisuallyHidden } from "@mantine/core";
import React, { useId } from "react";

import { modelChip, type ModelChipWords } from "./modelWords";

/** Props for ModelChip. */
interface ModelChipProps {
    /** The chip's words and tooltip. */
    readonly chip: ModelChipWords;
    /** Red for what stops a model, yellow for what is worth knowing. */
    readonly tone?: "error" | "warning";
    /** Its accessible name, when it says more than its words; it starts with them. */
    readonly name?: string;
    /** Makes it a button. */
    readonly onClick?: () => void;
    /** For a button that opens a pop-over: whether it is open. */
    readonly expanded?: boolean;
}

/**
 * One problem graphty-element reports on a model or a picture, as a chip (node-models design
 * 13.6): one or two words, the detail in the tooltip, never a sentence. Every chip takes focus, so
 * its tooltip shows on keyboard focus as on hover, and its detail is its description, so a screen
 * reader hears it too.
 * @param props - Component props
 * @param props.chip - its words and tooltip
 * @param props.tone - error or warning
 * @param props.name - its accessible name
 * @param props.onClick - what pressing it does, when it is a button
 * @param props.expanded - whether the pop-over it opens is open
 * @returns The chip
 */
export const ModelChip = React.forwardRef<HTMLButtonElement, ModelChipProps>(function ModelChip(
    { chip, tone = "error", name, onClick, expanded },
    ref,
) {
    // Mantine's light Badge as it is; its text contrast on red and yellow is tracked in issue #6233.
    const color = tone === "error" ? "red" : "yellow";
    const detail = useId();
    return (
        <>
            <Tooltip label={chip.tip}>
                {onClick === undefined ? (
                    <Badge
                        size="sm"
                        color={color}
                        variant="light"
                        tabIndex={0}
                        aria-label={name}
                        aria-describedby={detail}
                    >
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
                        aria-describedby={detail}
                        aria-haspopup="dialog"
                        aria-expanded={expanded}
                        onClick={onClick}
                    >
                        {chip.word}
                    </Badge>
                )}
            </Tooltip>
            <VisuallyHidden id={detail}>{chip.tip}</VisuallyHidden>
        </>
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
