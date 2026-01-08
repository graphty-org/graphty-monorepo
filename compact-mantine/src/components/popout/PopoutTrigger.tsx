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

/**
 * Wrapper component for the popout trigger element.
 * Attaches click handler, ref, and ARIA attributes to the child element.
 * @param props - Component props
 * @param props.children - The trigger element (typically a button or icon)
 * @returns The PopoutTrigger component
 */
export function PopoutTrigger({ children }: PopoutTriggerProps): JSX.Element {
    const { toggle, triggerRef, isOpen, id } = usePopoutContext();

    const handleClick = useCallback(
        (event: MouseEvent) => {
            event.stopPropagation();
            toggle();
        },
        [toggle],
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
