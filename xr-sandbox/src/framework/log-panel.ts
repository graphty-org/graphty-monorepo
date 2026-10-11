// The in-headset log (design section 8): the last 10 log lines and the latest frame summary, since
// DOM consoles are invisible in an immersive session. A framework toggle; redrawn at most twice a
// second, and only when something new was logged.

import type { Scene } from "@babylonjs/core";
import type { TextBlock } from "@babylonjs/gui";

import { createPanel, guiText, type Panel } from "../scene/ui";
import type { Zones } from "../scene/zones";
import type { Logger } from "./logging";

/**
 * Build the log panel, hidden.
 * @param scene - the scene
 * @param zones - the body-anchored zones
 * @param log - the logger whose tail it shows
 * @returns the panel and a function to show or hide it
 */
export function createLogPanel(scene: Scene, zones: Zones, log: Logger): { panel: Panel; setOn(on: boolean): void } {
    const panel = createPanel(scene, "log-panel", 0.42, 0.14, 768);
    panel.mesh.parent = zones.log;
    const lines: TextBlock[] = [];
    for (let i = 0; i < 10; i++) {
        const t = guiText("", 25, i === 0 ? "#9fb3d9" : "#e8ecf4");
        t.fontSize = 16;
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
        lines[0].text = frames ? `frames ${JSON.stringify(frames.data)}` : "frames: none yet";
        const recent = log.tail.filter((e) => e.message !== "frames").slice(-9);
        for (let i = 1; i < 10; i++) {
            const e = recent[i - 1];
            const data = e?.data ? JSON.stringify(e.data).slice(0, 110) : "";
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
