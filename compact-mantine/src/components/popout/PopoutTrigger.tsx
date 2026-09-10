import {
    cloneElement,
    isValidElement,
    type JSX,
    type MouseEvent,
    type MouseEventHandler,
    type ReactElement,
    type Ref,
    useCallback,
} from "react";

import type { PopoutTriggerProps } from "../../types/popout";
import { usePopoutContext } from "./PopoutContext";

// Accessibility: the APG "Disclosure" pattern. The trigger keeps its own
// accessible name from its content and adds aria-expanded, aria-controls and
// aria-haspopup="dialog"; give it a real <button>, which brings Enter and Space
// activation and focus order with it.

/**
 * Turns the element inside it into the control that opens a pop-out.
 *
 * Attaches the click handler, the ref the panel is positioned against, and the
 * ARIA attributes that tie the control to the panel. Pass exactly one element,
 * and prefer a button: the wrapper adds no keyboard handling of its own, so a
 * non-focusable element would leave the pop-out unreachable from the keyboard.
 * @param props - Component props
 * @param props.children - The trigger element (typically a button or icon button)
 * @param props.action - What activating the trigger does: toggle the panel, or only open it
 * @returns The trigger element with the pop-out's behaviour attached
 */
export function PopoutTrigger({ children, action = "toggle" }: PopoutTriggerProps): JSX.Element {
    const {
        open, toggle, triggerRef, isOpen, id,
    } = usePopoutContext();

    const handleClick = useCallback(
        (event: MouseEvent) => {
            event.stopPropagation();
            if (action === "open") {
                // A pop-out that also opens on hover has already opened by the
                // time the click arrives; toggling here would close it again.
                open(event);
                return;
            }
            toggle(event);
        },
        [action, open, toggle],
    );

    // Clone the child element to attach our click handler and ref
    if (!isValidElement(children)) {
        throw new Error("PopoutTrigger requires a single valid React element as its child");
    }

    // Generate panel ID for aria-controls (matches the ID used by PopoutPanel)
    const panelId = `popout-panel-${id}`;

    const child = children as ReactElement<{
        onClick?: MouseEventHandler;
        ref?: Ref<HTMLElement>;
        "data-popout-trigger"?: boolean;
        "aria-expanded"?: boolean;
        "aria-controls"?: string;
        "aria-haspopup"?: string;
    }>;

    return cloneElement(child, {
        onClick: (event: MouseEvent) => {
            // Call original onClick if it exists
            child.props.onClick?.(event);
            handleClick(event);
        },
        ref: triggerRef as Ref<HTMLElement>,
        // Mark this element as a popout trigger for click-outside detection
        "data-popout-trigger": true,
        // ARIA attributes for accessibility
        "aria-expanded": isOpen,
        "aria-controls": panelId,
        "aria-haspopup": "dialog",
    });
}
