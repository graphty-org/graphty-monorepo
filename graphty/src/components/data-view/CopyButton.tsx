import { ActionIcon, Tooltip } from "@mantine/core";
import { Check, Clipboard } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

interface CopyButtonProps {
    /** The value to copy to clipboard. Objects/arrays will be JSON stringified. */
    value: unknown;
    /** Optional JMESPath string to copy when shift-clicking */
    path?: string;
    /** Size of the button. Defaults to "compact" */
    size?: "compact" | "xs" | "sm" | "md" | "lg" | "xl";
}

/**
 * Formats a value for copying to clipboard.
 * - Strings, numbers, booleans: converted to string
 * - Objects and arrays: JSON stringified with 2-space indentation
 * - null: "null"
 * - undefined: "undefined"
 * @param value - The value to format for clipboard
 * @returns The formatted string representation
 */
function formatValueForClipboard(value: unknown): string {
    if (value === null) {
        return "null";
    }

    if (value === undefined) {
        return "undefined";
    }

    if (typeof value === "object") {
        return JSON.stringify(value, null, 2);
    }

    // At this point value is a primitive (string, number, boolean, bigint, symbol)
    // These all have safe toString() implementations
    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
        return value.toString();
    }

    if (typeof value === "symbol") {
        return value.toString();
    }

    // For any other edge cases (function, etc.)
    return typeof value === "function" ? "[Function]" : "[Unknown]";
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
