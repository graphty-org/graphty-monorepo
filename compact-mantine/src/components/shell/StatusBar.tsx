import React from "react";

/** Props for StatusBar. Every other div attribute is passed to the bar. */
export interface StatusBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
    /** What sits at the bar's start: status chips, counts. */
    left?: React.ReactNode;
    /** What sits at the bar's end. */
    right?: React.ReactNode;
}

/**
 * The editor's status bar: a 24px row along the bottom of the window, with a start and an end
 * slot, for state the reader reads but does not act on (saved, offline, counts).
 *
 * The bar is not a live region itself: a child whose changes should be announced carries its own
 * `role="status"`, so only that child is read out when it changes.
 * @example
 * ```tsx
 * <StatusBar left={<AutosaveChip />} right={<PrivacyChip />} />
 * ```
 * @param props - see StatusBarProps.
 * @returns the status bar.
 */
export function StatusBar(props: Readonly<StatusBarProps>): React.JSX.Element {
    const { left, right, className, ...rest } = props;
    return (
        <div {...rest} className={className === undefined ? "cm-status-bar" : `cm-status-bar ${className}`}>
            <div className="cm-status-bar-start">{left}</div>
            <div className="cm-status-bar-end">{right}</div>
        </div>
    );
}
