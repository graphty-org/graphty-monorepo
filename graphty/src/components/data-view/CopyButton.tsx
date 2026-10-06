import { ActionIcon, Tooltip } from "@mantine/core";
import { Check, Clipboard } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import { formatValueForClipboard } from "./clipboard";

interface CopyButtonProps {
    /** The value to copy to clipboard. Objects/arrays will be JSON stringified. */
    value: unknown;
    /** Optional JMESPath string to copy when shift-clicking */
    path?: string;
    /** Size of the button. Defaults to "compact" */
    size?: "compact" | "xs" | "sm" | "md" | "lg" | "xl";
}

/**
 * A small icon button that copies a value to the clipboard.
 *
 * - Click: Copies the value (formatted for display)
 * - Shift+Click: Copies the JMESPath (if provided)
 *
 * Shows a "Copied!" feedback tooltip for 1.5 seconds after copying.
 *
 * This component is wrapped with React.memo for performance optimization.
 */
export const CopyButton = React.memo(function CopyButton({
    value,
    path,
    size = "compact",
}: CopyButtonProps): React.JSX.Element {
    const [copied, setCopied] = useState(false);

    // Reset copied state after a delay
    useEffect(() => {
        if (!copied) {
            return undefined;
        }

        const timer = setTimeout(() => {
            setCopied(false);
        }, 1500);

        return () => {
            clearTimeout(timer);
        };
    }, [copied]);

    const handleClick = useCallback(
        (event: React.MouseEvent) => {
            const shouldCopyPath = event.shiftKey && path;
            const textToCopy = shouldCopyPath ? path : formatValueForClipboard(value);

            void navigator.clipboard.writeText(textToCopy).then(() => {
                setCopied(true);
            });
        },
        [value, path],
    );

    const ariaLabel = copied ? "Copied!" : "Copy value";

    // Compute tooltip label separately to avoid nested ternary
    let tooltipLabel = "Copy to clipboard";
    if (copied) {
        tooltipLabel = "Copied!";
    } else if (path) {
        tooltipLabel = "Click to copy value, Shift+Click to copy path";
    }

    return (
        <Tooltip label={tooltipLabel} position="top" withArrow>
            <ActionIcon
                variant="subtle"
                color={copied ? "green" : "gray"}
                size={size}
                onClick={handleClick}
                aria-label={ariaLabel}
            >
                {copied ? <Check size={12} /> : <Clipboard size={12} />}
            </ActionIcon>
        </Tooltip>
    );
});
