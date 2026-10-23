import { Box, type BoxProps, type ElementProps } from "@mantine/core";
import React from "react";

import { useLabels } from "../../i18n";
import { useRovingFocus, useShellStyles } from "./roving";

/**
 * Props for the Toolbar component.
 */
export interface ToolbarProps extends BoxProps, ElementProps<"div"> {
    /** Accessible name of the toolbar. Defaults to the "Tools" label. */
    "aria-label"?: string;
    /**
     * Pin the toolbar to the bottom center of the window, 12px up (Figma's position). Leave it off
     * to position the toolbar yourself.
     */
    floating?: boolean;
    /**
     * Where Tab first lands in the toolbar: the selected tool ("pressed", the default, for a tool
     * palette whose pressed button is the current tool) or the first item ("first", for a bar of
     * commands and toggles, where a pressed toggle is not where the reader starts). After that,
     * Tab returns to the item that last had focus.
     */
    startAt?: "pressed" | "first";
    /** Tool groups, tool buttons, dividers and a mode switch. */
    children?: React.ReactNode;
}

/**
 * The floating editor toolbar: a white (dark #2c2c2c) bar 48 tall with 13px corners and the
 * 200 elevation, holding tool buttons, tool groups with flyouts, dividers and a
 * `SegmentedControl variant="toolbar"` mode switch.
 *
 * It is one Tab stop: focus lands on the selected tool (or the first item, `startAt="first"`),
 * and ArrowLeft / ArrowRight / Home / End move between tools, chevrons and the mode radios.
 * @param props - Component props
 * @param props.floating - Pin the toolbar to the bottom center of the window
 * @param props.startAt - Where Tab first lands: the selected tool or the first item
 * @param props.children - Tool groups, tool buttons, dividers and a mode switch
 * @param props.className - Extra class on the root
 * @param props.onKeyDown - Called before the roving-focus key handling
 * @param props.onFocus - Called before the roving-focus bookkeeping
 * @returns The toolbar
 * @example
 * ```tsx
 * <Toolbar aria-label="Editor" floating>
 *     <ToolGroup label="Shape tools" tools={shapes} activeTool={tool} onToolChange={setTool} />
 *     <Toolbar.Divider />
 *     <SegmentedControl variant="toolbar" data={modes} />
 * </Toolbar>
 * ```
 */
function ToolbarRoot({
    floating,
    startAt,
    children,
    className,
    onKeyDown,
    onFocus,
    ...others
}: ToolbarProps): React.JSX.Element {
    useShellStyles();
    const labels = useLabels();
    const roving = useRovingFocus<HTMLDivElement>("horizontal", startAt);
    return (
        <Box
            {...others}
            ref={roving.ref}
            role="toolbar"
            aria-label={others["aria-label"] ?? labels.toolbar}
            aria-orientation="horizontal"
            className={className ? `cm-toolbar ${className}` : "cm-toolbar"}
            mod={{ floating }}
            onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                onKeyDown?.(event);
                roving.onKeyDown(event);
            }}
            onFocus={(event: React.FocusEvent<HTMLDivElement>) => {
                onFocus?.(event);
                roving.onFocus(event);
            }}
        >
            {children}
        </Box>
    );
}

/**
 * The toolbar's 1px divider, full height (48).
 * @returns The divider
 */
function ToolbarDivider(): React.JSX.Element {
    return <hr className="cm-toolbar-divider" aria-orientation="vertical" />;
}

/** The floating editor toolbar, with `Toolbar.Divider`. */
export const Toolbar = Object.assign(ToolbarRoot, { Divider: ToolbarDivider });
