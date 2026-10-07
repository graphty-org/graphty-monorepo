/**
 * The touch press-and-hold gesture, shared by every component that reacts to a held finger
 * (ContextMenu opens, Tree lifts a row). Internal: not exported from the package.
 *
 * iOS's rule: a press held still for HOLD_MS is a hold; a hold that then moves more than
 * HOLD_SLOP is a drag; a press that moves more than HOLD_SLOP before the hold elapses is a
 * scroll or a swipe and never becomes a hold. Every handler that joins the same pointerdown
 * shares ONE press and ONE timer, so a row inside a context-menu target times the hold once.
 */

/** How long a press must be held still to count as a hold, in ms. */
export const HOLD_MS = 500;

/** How far a press may wander, in px, and still be held still. */
export const HOLD_SLOP = 8;

/** What a joined handler hears about the press. */
export interface PressHandlers {
    /** The press was held still for HOLD_MS. */
    onHold?: () => void;
    /** A held press moved more than HOLD_SLOP: it is now a drag. Called once. */
    onLift?: (event: PointerEvent) => void;
    /** The press ended (up or cancel), whatever it became. */
    onEnd?: () => void;
}

interface Press {
    down: PointerEvent;
    held: boolean;
    lifted: boolean;
    timer: ReturnType<typeof setTimeout> | null;
    handlers: PressHandlers[];
}

const presses = new Map<number, Press>();

const anyHeld = (): boolean => [...presses.values()].some((p) => p.held);

const end = (pointerId: number): void => {
    const press = presses.get(pointerId);
    if (!press) {
        return;
    }
    presses.delete(pointerId);
    if (press.timer !== null) {
        clearTimeout(press.timer);
    }
    if (presses.size === 0) {
        stopListening();
    }
    press.handlers.forEach((h) => h.onEnd?.());
};

const onMove = (event: PointerEvent): void => {
    const press = presses.get(event.pointerId);
    if (!press || press.lifted) {
        return;
    }
    const far = Math.hypot(event.clientX - press.down.clientX, event.clientY - press.down.clientY) > HOLD_SLOP;
    if (!far) {
        return;
    }
    if (!press.held) {
        // Moved before the hold: a scroll or a swipe. Nothing more to time.
        if (press.timer !== null) {
            clearTimeout(press.timer);
            press.timer = null;
        }
        return;
    }
    press.lifted = true;
    press.handlers.forEach((h) => h.onLift?.(event));
};

const onUp = (event: PointerEvent): void => {
    end(event.pointerId);
};

// Once a press is held, the finger belongs to the gesture: the page must not scroll under it.
// touch-action cannot change mid-gesture, so a non-passive touchmove does it.
const onTouchMove = (event: TouchEvent): void => {
    if (anyHeld() && event.cancelable) {
        event.preventDefault();
    }
};

function startListening(): void {
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onUp, true);
    document.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
}

function stopListening(): void {
    document.removeEventListener("pointermove", onMove, true);
    document.removeEventListener("pointerup", onUp, true);
    document.removeEventListener("pointercancel", onUp, true);
    document.removeEventListener("touchmove", onTouchMove, true);
}

/**
 * Join the press this pointerdown starts. The first handler to join a pointerdown starts the
 * press and its timer; later handlers for the same pointerdown (an ancestor's, as the event
 * bubbles) join that same press.
 * @param down - the native pointerdown
 * @param handlers - what to call on hold, lift and end
 */
export function joinPress(down: PointerEvent, handlers: PressHandlers): void {
    let press = presses.get(down.pointerId);
    if (press?.down !== down) {
        end(down.pointerId);
        if (presses.size === 0) {
            startListening();
        }
        const fresh: Press = { down, held: false, lifted: false, timer: null, handlers: [] };
        fresh.timer = setTimeout(() => {
            fresh.timer = null;
            fresh.held = true;
            fresh.handlers.forEach((h) => h.onHold?.());
        }, HOLD_MS);
        presses.set(down.pointerId, fresh);
        press = fresh;
    }
    press.handlers.push(handlers);
}

/**
 * End a press early, as if the finger had lifted: its timer stops and every handler hears onEnd.
 * @param pointerId - the press's pointer
 */
export function endPress(pointerId: number): void {
    end(pointerId);
}
