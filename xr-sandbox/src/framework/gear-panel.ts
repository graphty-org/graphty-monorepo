// The gear panel (design section 4.3): the framework's own panel, reachable with every technique
// off -- by ray or poke on the gear button, the off-hand stick click, or both palms up for 1 s.
// Three tabs: Techniques (switch each on or off, with its settings), Framework (framework settings
// and actions) and Input map (the live claims). Its title bar shows the session id and build time.

import type { Scene } from "@babylonjs/core";
import { Control, StackPanel, TextBlock } from "@babylonjs/gui";

import { createPanel, guiButton, guiText, type Panel } from "../scene/ui";
import type { Zones } from "../scene/zones";
import type { Framework } from "./runtime";
import { FRAMEWORK_SETTINGS } from "./settings";
import type { SettingSpec } from "./technique";

declare const __BUILD_TIME__: string;

/** The gear button and panel. */
export interface GearPanel {
    button: Panel;
    panel: Panel;
    toggle(): void;
    /** Redraw the undo row (after a command). Cheap when the panel is hidden. */
    refreshUndo(): void;
}

type Tab = "techniques" | "framework" | "input" | `settings:${string}`;

const ROW = 32;

/**
 * Build the gear button and panel, hidden until the session starts.
 * @param scene - the scene
 * @param zones - the body-anchored zones
 * @param fw - the framework
 * @returns the gear panel
 */
export function createGearPanel(scene: Scene, zones: Zones, fw: Framework): GearPanel {
    const button = createPanel(scene, "gear-button", 0.08, 0.04, 192);
    button.mesh.parent = zones.gear;
    button.stack.addControl(
        guiButton(
            "gear-open",
            "Gear",
            () => {
                gear.toggle();
            },
            76,
        ),
    );
    button.show();

    const panel = createPanel(scene, "gear-panel", 0.46, 0.42, 768);
    panel.mesh.parent = zones.gearPanel;
    let tab: Tab = "techniques";

    const title = guiText(
        `Session ${fw.log.sessionId}  |  build ${__BUILD_TIME__.slice(5, 16).replace("T", " ")}`,
        34,
        "#9fb3d9",
    );
    panel.stack.addControl(title);

    const row = (): StackPanel => {
        const r = new StackPanel();
        r.isVertical = false;
        r.height = `${ROW + 6}px`;
        r.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        return r;
    };

    const tabs = row();
    const tabButton = (id: Tab, text: string): void => {
        tabs.addControl(
            guiButton(
                `gear-tab-${id}`,
                text,
                () => {
                    tab = id;
                    render();
                },
                ROW,
                170,
            ),
        );
    };
    tabButton("techniques", "Techniques");
    tabButton("framework", "Framework");
    tabButton("input", "Input map");
    tabs.addControl(
        guiButton(
            "gear-close",
            "Close",
            () => {
                gear.toggle();
            },
            ROW,
            130,
        ),
    );
    panel.stack.addControl(tabs);

    const undoRow = row();
    panel.stack.addControl(undoRow);
    const body = new StackPanel("gear-body");
    body.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.stack.addControl(body);

    const settingRow = (key: string, spec: SettingSpec, owner: string): StackPanel => {
        const r = row();
        const full = `${owner}.${key}`;
        const value = fw.settings.get(full);
        const label = guiText(spec.label, ROW, "#e8ecf4");
        label.width = "330px";
        r.addControl(label);
        const set = (v: boolean | number | string): void => {
            fw.settings.set(full, v);
            fw.log.log("setting", { key: full, value: v });
            fw.log.context.settingsHash = fw.settings.hash();
            render();
        };
        if (spec.kind === "bool") {
            r.addControl(
                guiButton(
                    `set-${full}`,
                    value ? "On" : "Off",
                    () => {
                        set(!value);
                    },
                    ROW,
                    120,
                ),
            );
        } else if (spec.kind === "number") {
            const step = spec.step ?? 1;
            const clamp = (v: number): number =>
                Math.round(Math.min(spec.max ?? Infinity, Math.max(spec.min ?? -Infinity, v)) * 1000) / 1000;
            r.addControl(
                guiButton(
                    `set-${full}-minus`,
                    "-",
                    () => {
                        set(clamp(Number(value) - step));
                    },
                    ROW,
                    60,
                ),
            );
            const v = guiText(String(value), ROW);
            v.width = "100px";
            r.addControl(v);
            r.addControl(
                guiButton(
                    `set-${full}-plus`,
                    "+",
                    () => {
                        set(clamp(Number(value) + step));
                    },
                    ROW,
                    60,
                ),
            );
        } else if (spec.kind === "choice") {
            const choices = spec.choices ?? [];
            r.addControl(
                guiButton(
                    `set-${full}`,
                    String(value),
                    () => {
                        set(choices[(choices.indexOf(String(value)) + 1) % choices.length]);
                    },
                    ROW,
                    220,
                ),
            );
        } else {
            r.addControl(
                guiButton(
                    `set-${full}`,
                    "Run",
                    () => {
                        fw.log.log("action", { key: full });
                        // An action reaches its technique as a change: the value counts the runs.
                        fw.settings.set(full, (Number(fw.settings.get(full)) || 0) + 1);
                    },
                    ROW,
                    120,
                ),
            );
        }
        return r;
    };

    const render = (): void => {
        body.clearControls();
        if (tab === "techniques") {
            for (const t of fw.techniques) {
                const r = row();
                const isOn = fw.isOn(t.id);
                const why = fw.reason(t.id);
                const toggle = guiButton(
                    `tech-${t.id}`,
                    isOn ? "On" : "Off",
                    () => {
                        fw.setOn(t.id, !isOn);
                        render();
                    },
                    ROW,
                    70,
                );
                toggle.isEnabled = !t.unavailable && !(t.arm === "microphone" && !fw.armed.microphone && !isOn);
                toggle.background = isOn ? "#3f6b3a" : "#34405a";
                r.addControl(toggle);
                const name = guiButton(
                    `tech-${t.id}-name`,
                    t.name,
                    () => {
                        if (t.settings.length) {
                            tab = `settings:${t.id}`;
                            render();
                        }
                    },
                    ROW,
                    280,
                );
                name.color = t.color;
                r.addControl(name);
                const note = guiText(
                    why ?? (t.settings.length ? `${t.settings.length} settings` : ""),
                    ROW,
                    why ? "#d98c8c" : "#9fb3d9",
                );
                note.width = "380px";
                r.addControl(note);
                body.addControl(r);
            }
        } else if (tab.startsWith("settings:")) {
            const t = fw.techniques.find((x) => `settings:${x.id}` === tab);
            body.addControl(
                guiButton(
                    "gear-back",
                    `Back  (${t?.name ?? ""})`,
                    () => {
                        tab = "techniques";
                        render();
                    },
                    ROW,
                    400,
                ),
            );
            for (const spec of t?.settings ?? []) {
                body.addControl(settingRow(spec.key, spec, t?.id ?? ""));
            }
        } else if (tab === "framework") {
            for (const spec of FRAMEWORK_SETTINGS) {
                body.addControl(settingRow(spec.key, spec, "framework"));
            }
            const actions: [string, keyof Framework["actions"]][] = [
                ["Recenter", "recenter"],
                ["Reset view", "resetView"],
                ["Flag", "flag"],
                ["Steps", "toggleSteps"],
                ["Save", "save"],
                ["Save as preset", "saveAsPreset"],
            ];
            for (let i = 0; i < actions.length; i += 3) {
                const r = row();
                for (const [text, key] of actions.slice(i, i + 3)) {
                    const run = (): void => {
                        fw.actions[key]();
                    };
                    r.addControl(guiButton(`gear-${text.toLowerCase().replaceAll(" ", "-")}`, text, run, ROW, 230));
                }
                body.addControl(r);
            }
        } else {
            const lines = fw.claims().map(({ owner, claim }) => {
                const name =
                    owner === "framework"
                        ? "Framework tap"
                        : (fw.techniques.find((t) => t.id === owner)?.name ?? owner);
                const ctx = claim.contexts === "any" ? "any" : claim.contexts.join(", ");
                return `${claim.priority}  ${name}: ${claim.channel}${claim.detail ? ` ${claim.detail}` : ""} on ${ctx} -- ${claim.note ?? "take at start"}`;
            });
            lines.unshift(
                "Reserved: UI first; off-hand stick click or both palms up 1 s opens this panel; both stick clicks flag",
            );
            for (const line of lines) {
                const t = new TextBlock(undefined, line);
                t.height = `${ROW}px`;
                t.color = "#e8ecf4";
                t.fontSize = 18;
                t.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
                t.paddingLeft = "10px";
                body.addControl(t);
            }
        }
    };

    const gear: GearPanel = {
        button,
        panel,
        toggle() {
            if (panel.visible) {
                panel.hide();
            } else {
                render();
                gear.refreshUndo();
                panel.show();
            }
            fw.log.log("gear", { open: panel.visible });
        },
        refreshUndo() {
            if (!panel.visible && undoRow.children.length) {
                return;
            }
            undoRow.clearControls();
            const u = fw.commands.undoLabel();
            const r = fw.commands.redoLabel();
            const undo = guiButton(
                "gear-undo",
                u ?? "Nothing to undo",
                () => fw.commands.undo({ technique: "framework" }),
                ROW,
                470,
            );
            undo.isEnabled = !!u;
            undoRow.addControl(undo);
            const redo = guiButton("gear-redo", "Redo", () => fw.commands.redo({ technique: "framework" }), ROW, 150);
            redo.isEnabled = !!r;
            undoRow.addControl(redo);
        },
    };
    return gear;
}
