import { Box, Paper } from "@mantine/core";
import { type ReactPortal,useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { PopoutPanelProps, PopoutPosition } from "../../types/popout";
import { usePopoutContext, usePopoutManagerContext } from "./PopoutContext";
import { PopoutHeader } from "./PopoutHeader";
import { calculatePopoutPosition } from "./utils/position";

/**
 * The floating panel component that appears when the trigger is clicked.
 * Renders in a portal to avoid z-index and overflow issues.
 * @param props - Component props
 * @param props.width - The width of the panel in pixels
 * @param props.header - Header configuration for the panel
 * @param props.children - Content to display in the panel
 * @returns The PopoutPanel component or null when closed
 */
export function PopoutPanel({ width, header, children }: PopoutPanelProps): ReactPortal | null {
    const { isOpen, close, triggerRef, id } = usePopoutContext();
    const { getZIndex, portalContainer } = usePopoutManagerContext();
    const [position, setPosition] = useState<PopoutPosition>({ left: 0, top: 0 });

    // Calculate position when panel opens
    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const newPosition = calculatePopoutPosition(triggerRect, width);
            setPosition(newPosition);
        }
    }, [isOpen, width, triggerRef]);

    if (!isOpen || !portalContainer) {
        return null;
    }

    const zIndex = getZIndex(id);

    // Figma + Radix-inspired panel styling:
    // - 1px ring shadow for edge definition (Radix pattern)
    // - Adaptive shadows: lighter in light mode, darker in dark mode (like Radix)
    // - Uses light-dark() CSS function for automatic color scheme adaptation
    // - 8px corner radius
    const panel = (
        <Paper
            role="dialog"
            aria-modal="false"
            radius={8}
            style={{
                position: "fixed",
                left: position.left,
                top: position.top,
                width,
                zIndex,
                backgroundColor: "var(--mantine-color-body)",
                border: "none",
                // Figma-style shadows: tight, hard near edges, softer further out
                boxShadow: [
                    "0 0 0 1px light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.12))", // Crisp ring
                    "0 1px 2px light-dark(rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.4))", // Hard close shadow
                    "0 4px 8px light-dark(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.35))", // Medium shadow
                    "0 8px 16px light-dark(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.25))", // Soft far shadow
                ].join(", "),
            }}
        >
            <PopoutHeader config={header} onClose={close} />
            <Box>{children}</Box>
        </Paper>
    );

    // Render in a portal at the manager's container
    return createPortal(panel, portalContainer);
}
