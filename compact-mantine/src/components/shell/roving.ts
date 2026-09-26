import { useMantineTheme } from "@mantine/core";
import { type FocusEvent, type KeyboardEvent, type RefObject, useLayoutEffect, useRef } from "react";

import { ensureCompactStyles } from "../../theme/global-styles";

/** What a roving toolbar moves between: its buttons and the radios of a mode switch. */
const ITEM_SELECTOR = 'button, input[type="radio"], [role="radio"]';

/** The handlers and ref a roving container spreads onto its root. */
interface RovingFocus<T extends HTMLElement> {
    ref: RefObject<T | null>;
    onFocus: (event: FocusEvent<T>) => void;
    onKeyDown: (event: KeyboardEvent<T>) => void;
}

/**
 * One Tab stop for a whole toolbar (WAI-ARIA toolbar pattern, spec 11.1 / 11.4): the item that
 * last had focus -- at first the selected tool (`aria-pressed`, `data-active` or a checked radio)
 * -- is the only one with `tabIndex=0`; the arrows of `orientation` and Home / End move between
 * the enabled items. Arrow keys are consumed, so a mode radio is focused, not changed, by them.
 * @param orientation - which arrows move
 * @returns the ref and handlers for the container
 */
export function useRovingFocus<T extends HTMLElement>(orientation: "horizontal" | "vertical"): RovingFocus<T> {
    const ref = useRef<T>(null);
    const current = useRef<HTMLElement | null>(null);

    const items = (): HTMLElement[] =>
        Array.from(ref.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []).filter(
            (el) => !(el as HTMLButtonElement).disabled && el.getAttribute("aria-disabled") !== "true",
        );

    const setCurrent = (all: HTMLElement[], active: HTMLElement): void => {
        current.current = active;
        for (const el of all) {
            el.tabIndex = el === active ? 0 : -1;
        }
    };

    // Runs after every render: items come and go, and the selected tool can change.
    useLayoutEffect(() => {
        const all = items();
        if (all.length === 0) {
            return;
        }
        const kept = current.current && all.includes(current.current) ? current.current : null;
        const selected = all.find(
            (el) =>
                el.getAttribute("aria-pressed") === "true" ||
                el.hasAttribute("data-active") ||
                (el as HTMLInputElement).checked,
        );
        setCurrent(all, kept ?? selected ?? all[0]);
    });

    const onFocus = (event: FocusEvent<T>): void => {
        const all = items();
        const target = event.target as HTMLElement;
        if (all.includes(target)) {
            setCurrent(all, target);
        }
    };

    const onKeyDown = (event: KeyboardEvent<T>): void => {
        const rtl = orientation === "horizontal" && ref.current !== null && getComputedStyle(ref.current).direction === "rtl";
        let back = rtl ? "ArrowRight" : "ArrowLeft";
        let forward = rtl ? "ArrowLeft" : "ArrowRight";
        if (orientation === "vertical") {
            [back, forward] = ["ArrowUp", "ArrowDown"];
        }
        if (![back, forward, "Home", "End"].includes(event.key)) {
            return;
        }
        const all = items();
        const index = all.indexOf(document.activeElement as HTMLElement);
        if (index < 0) {
            return;
        }
        event.preventDefault();
        let next = (index + (event.key === forward ? 1 : -1) + all.length) % all.length;
        if (event.key === "Home") {
            next = 0;
        } else if (event.key === "End") {
            next = all.length - 1;
        }
        all[next].focus();
    };

    return { ref, onFocus, onKeyDown };
}

/**
 * Put the package stylesheet on the page from a shell component, which renders only unthemed
 * Mantine primitives and so does not reach the theme's own injection.
 */
export function useShellStyles(): void {
    const theme = useMantineTheme();
    ensureCompactStyles(theme.other.compact);
}
