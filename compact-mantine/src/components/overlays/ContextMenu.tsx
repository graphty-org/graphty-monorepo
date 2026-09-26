import { Menu, type MenuProps } from "@mantine/core";
import {
    cloneElement,
    type JSX,
    type KeyboardEvent,
    type MouseEvent,
    type ReactElement,
    type ReactNode,
    useEffect,
    useRef,
    useState,
} from "react";

// Accessibility: Figma opens its context menus with the right mouse button
// only. This one ALSO opens from the keyboard -- Shift+F10 and the ContextMenu
// key, the platform conventions -- at the focused element's bottom-left corner
// (design/figma-spec.md 14). The menu is Mantine's, so its rows are menuitems
// with arrow-key movement, type-ahead and Escape; on close, focus goes back to
// the element that had it.

/** Where the menu's top-left corner sits relative to the pointer, in px (Figma, C33). */
const POINTER_OFFSET = { x: 3, y: -5 } as const;

/**
 * How long after a keyboard open a `contextmenu` event is treated as that same
 * key press (browsers fire one for Shift+F10 and the ContextMenu key), in ms.
 */
const KEYBOARD_ECHO_MS = 500;

/**
 * Props for ContextMenu: the target, the rows, and any Mantine `Menu` prop
 * except those that place and open it, which the context menu owns.
 */
export interface ContextMenuProps
    extends Omit<MenuProps, "children" | "opened" | "defaultOpened" | "position" | "offset" | "trigger"> {
    /**
     * The element that opens the menu when it is right-clicked, or when it (or
     * something inside it) has focus and Shift+F10 or the ContextMenu key is
     * pressed. One element that accepts `onContextMenu` and `onKeyDown`.
     */
    target: ReactElement<{
        onContextMenu?: (event: MouseEvent<HTMLElement>) => void;
        onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
    }>;
    /** The menu's rows: `Menu.Item`, `Menu.Label`, `Menu.Divider`, `Menu.Sub`, `MenuCheckItem`. */
    children: ReactNode;
}

/**
 * A dark menu opened at the pointer by a right-click (design/figma-spec.md 8.2):
 * its top-left corner 3px right of and 5px above the pointer, flipping and
 * shifting to stay on screen, with the first enabled row highlighted so Enter
 * acts on it at once. It also opens from the keyboard (Shift+F10, the
 * ContextMenu key) at the focused element. Escape, a click outside or choosing a
 * row closes it and returns focus to where it was.
 * @param props - Component props
 * @param props.target - The element that opens the menu
 * @param props.children - The menu's rows
 * @param props.onChange - Called when the menu opens or closes
 * @returns The target, with the menu attached
 * @example
 * ```tsx
 * <ContextMenu target={<div className="canvas" tabIndex={0} />}>
 *     <Menu.Item rightSection="Ctrl+C">Copy</Menu.Item>
 *     <Menu.Item rightSection="Ctrl+V">Paste here</Menu.Item>
 *     <Menu.Divider />
 *     <Menu.Item color="red">Delete</Menu.Item>
 * </ContextMenu>
 * ```
 */
export function ContextMenu({ target, children, onChange, ...menuProps }: ContextMenuProps): JSX.Element {
    const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
    const lastPoint = useRef({ x: 0, y: 0 });
    const returnFocus = useRef<HTMLElement | null>(null);
    const keyboardOpenedAt = useRef(-Infinity);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const opened = point !== null;

    const openAt = (x: number, y: number): void => {
        returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        lastPoint.current = { x, y };
        setPoint({ x, y });
        onChange?.(true);
    };

    const close = (): void => {
        setPoint(null);
        onChange?.(false);
        returnFocus.current?.focus();
    };

    // The first enabled row is highlighted on open. Mantine's focus trap puts
    // focus on its placeholder first (a timeout scheduled on mount); this runs
    // after it and moves focus to the row, which is what the :focus highlight
    // and Enter act on.
    useEffect(() => {
        if (!opened) {
            return undefined;
        }
        const timer = setTimeout(() => {
            dropdownRef.current
                ?.querySelector<HTMLElement>("[data-menu-item]:not([data-disabled]):not(:disabled)")
                ?.focus();
        }, 0);
        return () => {
            clearTimeout(timer);
        };
    }, [opened, point]);

    const handleContextMenu = (event: MouseEvent<HTMLElement>): void => {
        target.props.onContextMenu?.(event);
        if (event.defaultPrevented) {
            return;
        }
        event.preventDefault();
        if (performance.now() - keyboardOpenedAt.current < KEYBOARD_ECHO_MS) {
            return;
        }
        openAt(event.clientX + POINTER_OFFSET.x, event.clientY + POINTER_OFFSET.y);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
        target.props.onKeyDown?.(event);
        if (event.defaultPrevented) {
            return;
        }
        if ((event.shiftKey && event.key === "F10") || event.key === "ContextMenu") {
            event.preventDefault();
            // The menu mounts during this event, and Mantine's click-outside
            // listener (which also listens for keydown on the document) would
            // otherwise receive this same key press and close it at once.
            event.stopPropagation();
            keyboardOpenedAt.current = performance.now();
            const rect = (event.target as HTMLElement).getBoundingClientRect();
            openAt(rect.left, rect.bottom);
        }
    };

    const { x, y } = point ?? lastPoint.current;

    return (
        <>
            {cloneElement(target, { onContextMenu: handleContextMenu, onKeyDown: handleKeyDown })}
            <Menu
                {...menuProps}
                opened={opened}
                onChange={(next) => {
                    if (!next) {
                        close();
                    }
                }}
                position="bottom-start"
                offset={0}
            >
                <Menu.Target>
                    {/* A 1px anchor whose bottom-left corner is the menu's top-left. It has a
                        box because floating-ui's hide middleware treats a 0 x 0 anchor on the
                        viewport's edge (a canvas at x 0) as clipped, and hides the menu. */}
                    <span
                        aria-hidden="true"
                        data-context-menu-anchor=""
                        style={{ position: "fixed", left: x, top: y - 1, width: 1, height: 1, pointerEvents: "none" }}
                    />
                </Menu.Target>
                <Menu.Dropdown ref={dropdownRef}>{children}</Menu.Dropdown>
            </Menu>
        </>
    );
}
