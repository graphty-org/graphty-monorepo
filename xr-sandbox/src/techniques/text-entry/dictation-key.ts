// The dictation key beside the keyboard. Its route depends on the browser (design section 9.11):
// - Web Speech (Chrome on Galaxy XR): poke or point at it to listen, again to stop; the words are
//   added to the field.
// - Quest's system keyboard (Quest Browser has no Web Speech): pinch or trigger at it, and the
//   system keyboard opens over the session with its own microphone key. Opening it needs an XR
//   `select` event, so a fingertip poke cannot open it; a poke says to pinch instead.
// - Neither: the key reads "No dictation" and logs the reason.
// It is its own small mesh, so the select event can tell it was aimed at from the mesh under the
// ray, with no reach into the GUI's internals.

import type { TechniqueContext } from "../../framework/technique";
import { listen, type Listening, speechSupport } from "../../scene/speech";
import { systemKeyboard } from "../../scene/system-keyboard";
import { guiButton, type Panel } from "../../scene/ui";
import type { Keyboard } from "./keyboard";

/** How dictation would run here. */
export type DictationRoute = "web-speech" | "system-keyboard" | "none";

/** The key. */
export interface DictationKey {
    readonly panel: Panel;
    route(): { route: DictationRoute; reason: string };
    /** The keyboard opened: show the key, and arm the system keyboard when that is the route. */
    open(): void;
    close(): void;
}

/**
 * Add text after the field's text, with one space between words.
 * @param base - the field's text before dictation
 * @param words - the dictated words
 * @returns the joined text
 */
const join = (base: string, words: string): string => {
    if (!words) {
        return base;
    }
    const gap = base && !base.endsWith(" ") ? " " : "";
    return `${base}${gap}${words}`;
};

/**
 * Build the key, hidden, beside the keyboard.
 * @param ctx - the technique context
 * @param kb - the keyboard
 * @returns the key
 */
export function createDictationKey(ctx: TechniqueContext, kb: Keyboard): DictationKey {
    const panel = ctx.ui.panel("dictate", 0.12, 0.06, 240);
    panel.mesh.parent = kb.mesh;
    panel.mesh.position.set(0.24, -0.05, 0);
    let listening: Listening | null = null;
    let openedAt = -Infinity;
    let base = "";

    const route = (): { route: DictationRoute; reason: string } => {
        const want = ctx.settings.str("dictation");
        if (want === "off") {
            return { route: "none", reason: "dictation is off in the settings" };
        }
        const speech = speechSupport();
        const xr = ctx.xr();
        const sys = xr ? systemKeyboard(xr).status() : { supported: false, reason: "no XR" };
        if (want !== "system-keyboard" && speech.supported) {
            return { route: "web-speech", reason: speech.reason };
        }
        if (want !== "web-speech" && sys.supported) {
            return { route: "system-keyboard", reason: sys.reason };
        }
        return { route: "none", reason: [speech.reason, sys.reason].join("; ") };
    };

    const LABELS: Record<DictationRoute, string> = {
        "web-speech": "Dictate",
        "system-keyboard": "Quest keyboard",
        none: "No dictation",
    };
    const button = guiButton(
        "text-entry-dictate",
        "Dictate",
        () => {
            click();
        },
        112,
        232,
    );
    button.fontSize = 30;
    panel.stack.addControl(button);
    const setLabel = (t: string): void => {
        if (button.textBlock && button.textBlock.text !== t) {
            button.textBlock.text = t;
        }
    };

    const arm = (): void => {
        const xr = ctx.xr();
        if (!xr || route().route !== "system-keyboard") {
            return;
        }
        systemKeyboard(xr).arm(
            (source) => {
                const c = xr.input.controllers.find((x) => x.inputSource === source);
                return !!c && xr.pointerSelection.getMeshUnderPointer(c.uniqueId) === panel.mesh;
            },
            {
                opened: (eventType) => {
                    openedAt = performance.now();
                    base = kb.text;
                    ctx.log("systemKeyboard.open", {
                        event: eventType,
                        focused: document.activeElement?.tagName ?? null,
                    });
                },
                input: (v) => {
                    kb.text = join(base, v);
                },
                close: (v) => {
                    kb.text = join(base, v);
                    ctx.log("systemKeyboard.close", { chars: v.length });
                    if (panel.visible) {
                        arm();
                    }
                },
            },
        );
    };

    const click = (): void => {
        const r = route();
        if (r.route === "web-speech") {
            if (listening) {
                listening.stop();
                return;
            }
            base = kb.text;
            const l = listen((words) => {
                kb.text = join(base, words);
            });
            if (!l) {
                return;
            }
            listening = l;
            setLabel("Stop");
            ctx.log("dictation.start", { engine: r.route });
            void l.done.then(({ text, reason }) => {
                kb.text = join(base, text);
                listening = null;
                setLabel(LABELS["web-speech"]);
                ctx.log("dictation.end", { engine: r.route, reason, words: text ? text.split(/\s+/).length : 0 });
            });
        } else if (r.route === "system-keyboard") {
            // The select event opens it. The GUI click of the same press can come just before or just
            // after that event, so look a moment later: no opening by then means it was a poke.
            const clickedAt = performance.now();
            setTimeout(() => {
                if (Math.abs(openedAt - clickedAt) > 1000) {
                    ctx.log("dictation.hint", { reason: "a poke cannot open the system keyboard; pinch or trigger" });
                    setLabel("Pinch me");
                }
            }, 300);
        } else {
            ctx.log("dictation.unavailable", { reason: r.reason });
        }
    };

    return {
        panel,
        route,
        open() {
            setLabel(LABELS[route().route]);
            panel.show();
            arm();
        },
        close() {
            listening?.stop();
            const xr = ctx.xr();
            if (xr) {
                systemKeyboard(xr).disarm();
                systemKeyboard(xr).close();
            }
            panel.hide();
        },
    };
}
