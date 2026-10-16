import { Menu, type MenuProps } from "@mantine/core";
import {
    cloneElement,
    type JSX,
    type KeyboardEvent,
    type MouseEvent,
    type PointerEvent,
    type ReactElement,
    type ReactNode,
    type SyntheticEvent,
    type TouchEvent,
    useEffect,
    useRef,
    useState,
} from "react";

import { joinPress } from "../pressGesture";

// Accessibility: Figma opens its context menus with the right mouse button
// only. This one ALSO opens from the keyboard -- Shift+F10 and the ContextMenu
// key, the platform conventions -- at the focused element's bottom-left corner
// (design/figma-spec.md 14). The menu is Mantine's, so its rows are menuitems
// with arrow-key movement, type-ahead and Escape; on close, focus goes back to
// the element that had it. On touch and pen there is no right button, so a
// press held still for half a second (pressGesture) opens it too, at the
// finger; lifting that finger chooses nothing, and moving it on (a drag)
// closes the menu again.

/** Where the menu's top-left corner sits relative to the pointer, in px (Figma, C33). */
const POINTER_OFFSET = { x: 3, y: -5 } as const;

/**
 * How long after a keyboard open a `contextmenu` event is treated as that same
 * key press (browsers fire one for Shift+F10 and the ContextMenu key), in ms.
 */
const KEYBOARD_ECHO_MS = 500;

/** The declarations that keep iOS's callout and text selection off the target while it is pressed. */
const PRESS_STYLES = ["-webkit-touch-callout", "-webkit-user-select", "user-select"] as const;

/**
 * Props for ContextMenu: the target, the rows, and any Mantine `Menu` prop
 * except those that place and open it, which the context menu owns.
 */
export interface ContextMenuProps extends Omit<
    MenuProps,
    "children" | "opened" | "defaultOpened" | "position" | "offset" | "trigger"
> {
    /**
     * The element that opens the menu when it is right-clicked or touched and
     * held, or when it (or something inside it) has focus and Shift+F10 or the
     * ContextMenu key is pressed. A hold reaches the target's `onContextMenu`
     * as a `contextmenu` event from the pressed element, like a right-click.
     * One element that accepts `onContextMenu`, `onKeyDown` and the pointer handlers.
     */
    target: ReactElement<{
        onContextMenu?: (event: MouseEvent<HTMLElement>) => void;
        onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
        onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
        onClickCapture?: (event: MouseEvent<HTMLElement>) => void;
        onTouchEnd?: (event: TouchEvent<HTMLElement>) => void;
    }>;
    /** The menu's rows: `Menu.Item`, `Menu.Label`, `Menu.Divider`, `Menu.Sub`, `MenuCheckItem`. */
    children: ReactNode;
}

/**
 * A dark menu opened at the pointer by a right-click (design/figma-spec.md 8.2):
 * its top-left corner 3px right of and 5px above the pointer, flipping and
 * shifting to stay on screen, with no row highlighted until a key or the
 * pointer moves to one. On touch and pen, a press held still for half a second
 * opens it at the finger. It also opens from the keyboard (Shift+F10, the
 * ContextMenu key) at the focused element, with the first enabled row
 * highlighted so Enter acts on it at once. Escape, a click outside or choosing a
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
    // The touch or pen press being timed, if any: it restores the target's styles when it ends.
    const press = useRef<(() => void) | null>(null);
    // Set once a hold has opened the menu: the click that ends the press, and the
    // contextmenu event a browser fires for the same long press (Android), are
    // that hold and not new requests.
    const swallowClick = useRef(false);
    const swallowContextMenu = useRef(false);
    // True while the hold's own contextmenu event is being dispatched.
    const holding = useRef(false);
    // Set while a menu a hold opened is still under the finger that opened it: lifting that
    // finger (its pointerup and the click after it) chooses nothing. The next press in the
    // menu, or a key, clears it.
    const liftPending = useRef(false);

    // How the menu was opened: only a keyboard open has a keyboard position to show.
    const openedByKeyboard = useRef(false);

    const openAt = (x: number, y: number, byKeyboard = false): void => {
        openedByKeyboard.current = byKeyboard;
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

    // Opened from the keyboard, the first enabled row is highlighted, so Enter acts on it at once.
    // Opened by the pointer (a right-click, a held press) nothing is: the pointer has no keyboard
    // position yet, and a pre-highlighted row reads as the suggested choice. Focus then rests on
    // the menu itself, where ArrowDown / ArrowUp reach the first row (Mantine's dropdown). Both
    // run after Mantine's focus trap has placed its own focus (a timeout scheduled on mount).
    useEffect(() => {
        if (!opened) {
            return undefined;
        }
        const timer = setTimeout(() => {
            const menu = dropdownRef.current;
            if (!openedByKeyboard.current) {
                menu?.focus();
                return;
            }
            menu?.querySelector<HTMLElement>("[data-menu-item]:not([data-disabled]):not(:disabled)")?.focus();
        }, 0);
        return () => {
            clearTimeout(timer);
        };
    }, [opened, point]);

    const endPress = (): void => {
        const restore = press.current;
        press.current = null;
        restore?.();
    };

    useEffect(() => endPress, []);

    const handlePointerDown = (event: PointerEvent<HTMLElement>): void => {
        // Only the target's own handler claims a press by preventing its default. Something
        // inside the target that prevents it for its own reasons (a 3D canvas stopping text
        // selection while it drags) has not claimed the hold.
        const preventedInside = event.defaultPrevented;
        target.props.onPointerDown?.(event);
        endPress();
        swallowClick.current = false;
        swallowContextMenu.current = false;
        const claimed = event.defaultPrevented && !preventedInside;
        if (claimed || event.pointerType === "mouse" || !event.isPrimary) {
            return;
        }
        const element = event.currentTarget;
        const pressed = event.target as Element;
        const { clientX, clientY } = event;
        const styles = PRESS_STYLES.map((name) => element.style.getPropertyValue(name));
        PRESS_STYLES.forEach((name) => {
            element.style.setProperty(name, "none");
        });
        const restore = (): void => {
            PRESS_STYLES.forEach((name, i) => {
                element.style.setProperty(name, styles[i]);
            });
        };
        press.current = restore;
        let openedByHold = false;
        // One press, one timer: a row inside the target (Tree) joins the same press.
        joinPress(event.nativeEvent, {
            onHold: () => {
                if (press.current !== restore) {
                    return;
                }
                endPress();
                // A contextmenu event from the pressed element, so the target's own
                // handler sees a hold exactly as it sees a right-click.
                holding.current = true;
                pressed.dispatchEvent(
                    new globalThis.MouseEvent("contextmenu", {
                        bubbles: true,
                        cancelable: true,
                        clientX,
                        clientY,
                        button: 2,
                    }),
                );
                holding.current = false;
                openedByHold = true;
                liftPending.current = true;
                swallowClick.current = true;
                swallowContextMenu.current = true;
            },
            // The held finger moved on: it is a drag now, not a menu.
            onLift: () => {
                if (openedByHold) {
                    setPoint(null);
                    onChange?.(false);
                }
            },
            onEnd: () => {
                if (press.current === restore) {
                    endPress();
                }
            },
        });
    };

    const handleTouchEnd = (event: TouchEvent<HTMLElement>): void => {
        target.props.onTouchEnd?.(event);
        // The finger lifting after a hold would otherwise send the compatibility
        // mousedown that closes the menu as a click outside it, then a click.
        if (swallowClick.current && event.cancelable) {
            event.preventDefault();
        }
    };

    const handleClickCapture = (event: MouseEvent<HTMLElement>): void => {
        if (swallowClick.current) {
            swallowClick.current = false;
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        target.props.onClickCapture?.(event);
    };

    const handleContextMenu = (event: MouseEvent<HTMLElement>): void => {
        const fromHold = holding.current;
        if (swallowContextMenu.current && !fromHold) {
            // The browser's own long-press menu event, after the hold already opened ours.
            swallowContextMenu.current = false;
            event.preventDefault();
            return;
        }
        // A browser that fires its long-press event before the hold timer does
        // opens the menu here; the timer must not open it a second time.
        if (press.current !== null && !fromHold) {
            endPress();
            swallowClick.current = true;
            liftPending.current = true;
        }
        // As with a press, only the target's own handler claims the event: a canvas inside it
        // that prevents the browser's menu has not.
        const preventedInside = event.defaultPrevented;
        target.props.onContextMenu?.(event);
        if (event.defaultPrevented && !preventedInside) {
            return;
        }
        event.preventDefault();
        if (performance.now() - keyboardOpenedAt.current < KEYBOARD_ECHO_MS) {
            return;
        }
        openAt(event.clientX + POINTER_OFFSET.x, event.clientY + POINTER_OFFSET.y);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
        liftPending.current = false;
        swallowClick.current = false;
        swallowContextMenu.current = false;
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
            openAt(rect.left, rect.bottom, true);
        }
    };

    const { x, y } = point ?? lastPoint.current;

    const ignoreLift = (event: SyntheticEvent): void => {
        if (liftPending.current) {
            event.preventDefault();
            event.stopPropagation();
        }
    };
    const armMenu = (): void => {
        liftPending.current = false;
    };

    return (
        <>
            {cloneElement(target, {
                onContextMenu: handleContextMenu,
                onKeyDown: handleKeyDown,
                onPointerDown: handlePointerDown,
                onClickCapture: handleClickCapture,
                onTouchEnd: handleTouchEnd,
            })}
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
                <Menu.Dropdown
                    ref={dropdownRef}
                    onPointerUpCapture={ignoreLift}
                    onClickCapture={ignoreLift}
                    onPointerDownCapture={armMenu}
                    onKeyDownCapture={armMenu}
                >
                    {children}
                </Menu.Dropdown>
            </Menu>
        </>
    );
}
