// Quest's system keyboard over an immersive session (research: voice-and-text-entry.md, section
// 4.2; Meta's "WebXR keyboard" page). Focusing a DOM input from inside an XR `select` event (which
// counts as user activation) makes Quest Browser show its own keyboard, microphone key included.
// Its rules: each showing is a new editing session whose first key replaces the whole value; it
// sends no key events, so the value is read on `input`; dismissing it blurs the input; the input
// must be in the DOM and on screen, or the page scrolls. Callers treat the value as text to add to
// their own. Quest only: Chrome on Galaxy XR reports no `isSystemKeyboardSupported`.

import type { WebXRDefaultExperience } from "@babylonjs/core";

/** What a caller hears while the system keyboard is open. */
interface SystemKeyboardListener {
    /** Called inside the select event, right after the input is focused. */
    opened?(eventType: string): void;
    /** The value so far (this showing only). */
    input(value: string): void;
    /** The keyboard was dismissed, with the final value of this showing. */
    close(value: string): void;
}

/** The bridge. */
interface SystemKeyboard {
    /** Whether this session shows a system keyboard, and if not why. */
    status(): { supported: boolean; reason: string };
    /** Open it on the next XR select event that `when` accepts (its input source). */
    arm(when: (source: XRInputSource) => boolean, listener: SystemKeyboardListener): void;
    disarm(): void;
    /** Dismiss it if open. */
    close(): void;
}

const bridges = new WeakMap<WebXRDefaultExperience, SystemKeyboard>();

/**
 * The system keyboard bridge of an XR experience (one per experience, made on first use).
 * @param xr - the XR experience
 * @returns the bridge
 */
export function systemKeyboard(xr: WebXRDefaultExperience): SystemKeyboard {
    const known = bridges.get(xr);
    if (known) {
        return known;
    }
    const input = document.createElement("input");
    input.type = "text";
    input.autocomplete = "off";
    input.setAttribute("aria-hidden", "true");
    input.tabIndex = -1;
    Object.assign(input.style, {
        position: "fixed",
        left: "0",
        top: "0",
        width: "1px",
        height: "1px",
        opacity: "0",
        border: "0",
        padding: "0",
    });
    document.body.append(input);
    let armed: { when: (s: XRInputSource) => boolean; listener: SystemKeyboardListener } | null = null;
    let current: SystemKeyboardListener | null = null;
    input.addEventListener("input", () => {
        current?.input(input.value);
    });
    input.addEventListener("blur", () => {
        const c = current;
        current = null;
        c?.close(input.value);
    });
    const onSelect = (ev: XRInputSourceEvent): void => {
        if (!armed?.when(ev.inputSource)) {
            return;
        }
        const { listener } = armed;
        armed = null;
        current = listener;
        input.value = "";
        input.focus();
        listener.opened?.(ev.type);
    };
    const sm = xr.baseExperience.sessionManager;
    const attach = (s: XRSession): void => {
        s.addEventListener("select", onSelect);
    };
    sm.onXRSessionInit.add(attach);
    if (sm.inXRSession) {
        attach(sm.session);
    }
    const bridge: SystemKeyboard = {
        status() {
            if (!sm.inXRSession) {
                return { supported: false, reason: "not in a session" };
            }
            const ok = (sm.session as unknown as { isSystemKeyboardSupported?: boolean }).isSystemKeyboardSupported;
            return ok === true
                ? { supported: true, reason: "system keyboard" }
                : { supported: false, reason: "this browser shows no system keyboard over a session" };
        },
        arm(when, listener) {
            armed = { when, listener };
        },
        disarm() {
            armed = null;
        },
        close() {
            input.blur();
        },
    };
    bridges.set(xr, bridge);
    return bridge;
}
