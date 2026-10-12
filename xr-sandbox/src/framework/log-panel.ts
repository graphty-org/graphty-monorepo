// The in-headset log (design section 8): the last 5 log lines and the latest frame summary, since
// DOM consoles are invisible in an immersive session. A framework toggle; redrawn at most twice a
// second, and only when something new was logged.

import type { Scene } from "@babylonjs/core";
import type { TextBlock } from "@babylonjs/gui";

import { createPanel, type Panel } from "../scene/ui";
import type { Zones } from "../scene/zones";
import type { Logger } from "./logging";

/** Log lines shown under the frame summary. */
const SHOWN = 5;

/**
 * Build the log panel, hidden.
 * @param scene - the scene
 * @param zones - the body-anchored zones
 * @param log - the logger whose tail it shows
 * @returns the panel and a function to show or hide it
 */
export function createLogPanel(scene: Scene, zones: Zones, log: Logger): { panel: Panel; setOn(on: boolean): void } {
    const panel = createPanel(scene, "log-panel", 0.48, 0.14, 864, { fit: true });
    panel.mesh.parent = zones.log;
    const lines: TextBlock[] = [];
    for (let i = 0; i < SHOWN + 1; i++) {
        const t = panel.text("", i === 0 ? "#9fb3d9" : "#e8ecf4");
        lines.push(t);
        panel.stack.addControl(t);
    }
    let shownTime = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const refresh = (): void => {
        const last = log.tail.at(-1);
        if (!last || last.time === shownTime) {
            return;
        }
        shownTime = last.time;
        const frames = [...log.tail].reverse().find((e) => e.message === "frames");
        lines[0].text = frames ? `frames ${JSON.stringify(frames.data).replaceAll(",", ", ")}` : "frames: none yet";
        const recent = log.tail.filter((e) => e.message !== "frames").slice(-SHOWN);
        for (let i = 1; i <= SHOWN; i++) {
            const e = recent[i - 1];
            // Commas get a space so a long payload can wrap.
            const data = e?.data ? JSON.stringify(e.data).slice(0, 80).replaceAll(",", ", ") : "";
            lines[i].text = e ? `${e.level[0]} ${e.message} ${data}` : "";
        }
    };
    return {
        panel,
        setOn(on) {
            clearInterval(interval);
            if (on) {
                panel.show();
                interval = globalThis.setInterval(refresh, 500);
            } else {
                panel.hide();
            }
        },
    };
}
