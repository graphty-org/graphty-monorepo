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
 * Attaches click handler and ref to the child element.
 * @param props - Component props
 * @param props.children - The trigger element (typically a button or icon)
 * @returns The PopoutTrigger component
 */
export function PopoutTrigger({ children }: PopoutTriggerProps): JSX.Element {
    const { toggle, triggerRef } = usePopoutContext();

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

    const child = children as ReactElement<{
        onClick?: MouseEventHandler;
        ref?: Ref<HTMLElement>;
    }>;

    return cloneElement(child, {
        onClick: (event: MouseEvent) => {
            // Call original onClick if it exists
            child.props.onClick?.(event);
            handleClick(event);
        },
        ref: triggerRef as Ref<HTMLElement>,
    });
}
