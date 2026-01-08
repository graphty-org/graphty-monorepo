import type { JSX, ReactNode } from "react";

import { PopoutContent } from "./PopoutContent";
import { PopoutProvider, useOptionalPopoutContext } from "./PopoutContext";
import { PopoutPanel } from "./PopoutPanel";
import { PopoutTrigger } from "./PopoutTrigger";

/**
 * Props for the Popout compound component.
 */
interface PopoutProps {
    /** Child components (Popout.Trigger, Popout.Panel) */
    children: ReactNode;
}

/**
 * Compound component for creating floating pop-out panels.
 * Follows the Figma-style floating panel pattern.
 * Automatically detects when nested inside another Popout for hierarchy tracking.
 *
 * Usage:
 * ```tsx
 * <PopoutManager>
 * <Popout>
 * <Popout.Trigger>
 * <Button>Open</Button>
 * </Popout.Trigger>
 * <Popout.Panel width={280} header={{ variant: "title", title: "Settings" }}>
 * <Popout.Content>
 * Panel content here
 * </Popout.Content>
 * </Popout.Panel>
 * </Popout>
 * </PopoutManager>
 * ```
 * @param props - Component props
 * @param props.children - Child components (Popout.Trigger, Popout.Panel)
 * @returns The Popout compound component
 */
function PopoutRoot({ children }: PopoutProps): JSX.Element {
    // Check if this Popout is nested inside another Popout
    const parentContext = useOptionalPopoutContext();
    const parentId = parentContext?.id ?? null;

    return <PopoutProvider parentId={parentId}>{children}</PopoutProvider>;
}

// Attach sub-components to the root component
export const Popout = Object.assign(PopoutRoot, {
    Trigger: PopoutTrigger,
    Panel: PopoutPanel,
    Content: PopoutContent,
});
