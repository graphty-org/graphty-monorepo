// The gear panel (design section 4.3): the framework's own panel, reachable with every technique
// off -- by ray or poke on the gear button, the off-hand stick click, or both palms up for 1 s.
// Three tabs: Techniques (switch each on or off, with its settings), Framework (framework settings
// and actions) and Input map (the live claims). Its title bar shows the session id and build time.

import type { Scene } from "@babylonjs/core";
import { Control, StackPanel } from "@babylonjs/gui";

import { createPanel, type Panel } from "../scene/ui";
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

/**
 * Build the gear button and panel, hidden until the session starts.
 * @param scene - the scene
 * @param zones - the body-anchored zones
 * @param fw - the framework
 * @returns the gear panel
 */
export function createGearPanel(scene: Scene, zones: Zones, fw: Framework): GearPanel {
    const button = createPanel(scene, "gear-button", 0.08, 0.04, 192, { fit: true });
    button.mesh.parent = zones.gear;
    button.stack.addControl(
        button.button("gear-open", "Gear", () => {
            gear.toggle();
        }),
    );
    button.show();

    const panel = createPanel(scene, "gear-panel", 0.46, 0.42, 768, { fit: true });
    panel.mesh.parent = zones.gearPanel;
    let tab: Tab = "techniques";

    const title = panel.text(
        `Session ${fw.log.sessionId}  |  build ${__BUILD_TIME__.slice(5, 16).replace("T", " ")}`,
        "#9fb3d9",
    );
    panel.stack.addControl(title);

    const row = (): StackPanel => panel.line();

    const tabs = row();
    const tabButton = (id: Tab, text: string): void => {
        tabs.addControl(
            panel.button(
                `gear-tab-${id}`,
                text,
                () => {
                    tab = id;
                    render();
                },
                170,
            ),
        );
    };
    tabButton("techniques", "Techniques");
    tabButton("framework", "Framework");
    tabButton("input", "Input map");
    tabs.addControl(
        panel.button(
            "gear-close",
            "Close",
            () => {
                gear.toggle();
            },
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
        const label = panel.text(spec.label);
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
                panel.button(
                    `set-${full}`,
                    value ? "On" : "Off",
                    () => {
                        set(!value);
                    },
                    120,
                ),
            );
        } else if (spec.kind === "number") {
            const step = spec.step ?? 1;
            const clamp = (v: number): number =>
                Math.round(Math.min(spec.max ?? Infinity, Math.max(spec.min ?? -Infinity, v)) * 1000) / 1000;
            r.addControl(
                panel.button(
                    `set-${full}-minus`,
                    "-",
                    () => {
                        set(clamp(Number(value) - step));
                    },
                    60,
                ),
            );
            const v = panel.text(String(value));
            v.width = "100px";
            r.addControl(v);
            r.addControl(
                panel.button(
                    `set-${full}-plus`,
                    "+",
                    () => {
                        set(clamp(Number(value) + step));
                    },
                    60,
                ),
            );
        } else if (spec.kind === "choice") {
            const choices = spec.choices ?? [];
            r.addControl(
                panel.button(
                    `set-${full}`,
                    String(value),
                    () => {
                        set(choices[(choices.indexOf(String(value)) + 1) % choices.length]);
                    },
                    220,
                ),
            );
        } else {
            r.addControl(
                panel.button(
                    `set-${full}`,
                    "Run",
                    () => {
                        fw.log.log("action", { key: full });
                        // An action reaches its technique as a change: the value counts the runs.
                        fw.settings.set(full, (Number(fw.settings.get(full)) || 0) + 1);
                    },
                    120,
                ),
            );
        }
        return r;
    };

    /** The Techniques tab: each technique with its switch, its name (opens its settings) and a note. */
    const renderTechniques = (): void => {
        for (const t of fw.techniques) {
            const r = row();
            const isOn = fw.isOn(t.id);
            const why = fw.reason(t.id);
            const toggle = panel.button(
                `tech-${t.id}`,
                isOn ? "On" : "Off",
                () => {
                    fw.setOn(t.id, !isOn);
                    render();
                },
                80,
            );
            toggle.isEnabled = !t.unavailable && !(t.arm === "microphone" && !fw.armed.microphone && !isOn);
            toggle.background = isOn ? "#3f6b3a" : "#34405a";
            r.addControl(toggle);
            const name = panel.button(
                `tech-${t.id}-name`,
                t.name,
                () => {
                    if (t.settings.length) {
                        tab = `settings:${t.id}`;
                        render();
                    }
                },
                300,
            );
            name.color = t.color;
            r.addControl(name);
            const n = t.settings.length;
            const count = n === 1 ? "1 setting" : `${n} settings`;
            const note = panel.text(why ?? (n ? count : ""), why ? "#d98c8c" : "#9fb3d9");
            note.width = "380px";
            r.addControl(note);
            body.addControl(r);
        }
    };

    /** One technique's settings, with a Back button. */
    const renderSettings = (): void => {
        const t = fw.techniques.find((x) => `settings:${x.id}` === tab);
        body.addControl(
            panel.button(
                "gear-back",
                `Back  (${t?.name ?? ""})`,
                () => {
                    tab = "techniques";
                    render();
                },
                400,
            ),
        );
        for (const spec of t?.settings ?? []) {
            body.addControl(settingRow(spec.key, spec, t?.id ?? ""));
        }
    };

    /** The Framework tab: framework settings and actions. */
    const renderFramework = (): void => {
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
                r.addControl(panel.button(`gear-${text.toLowerCase().replaceAll(" ", "-")}`, text, run, 230));
            }
            body.addControl(r);
        }
    };

    /** The Input map tab: the live claims, highest priority first. */
    const renderInputMap = (): void => {
        const lines = fw.claims().map(({ owner, claim }) => {
            const name =
                owner === "framework" ? "Framework tap" : (fw.techniques.find((t) => t.id === owner)?.name ?? owner);
            const ctx = claim.contexts === "any" ? "any" : claim.contexts.join(", ");
            const channel = claim.detail ? `${claim.channel} ${claim.detail}` : claim.channel;
            return `${claim.priority}  ${name}: ${channel} on ${ctx} -- ${claim.note ?? "take at start"}`;
        });
        lines.unshift(
            "Reserved: UI first; off-hand stick click or both palms up 1 s opens this panel; both stick clicks flag",
        );
        for (const line of lines) {
            body.addControl(panel.text(line));
        }
    };

    const render = (): void => {
        body.clearControls();
        if (tab === "techniques") {
            renderTechniques();
        } else if (tab.startsWith("settings:")) {
            renderSettings();
        } else if (tab === "framework") {
            renderFramework();
        } else {
            renderInputMap();
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
            const undo = panel.button(
                "gear-undo",
                u ?? "Nothing to undo",
                () => fw.commands.undo({ technique: "framework" }),
                470,
            );
            undo.isEnabled = !!u;
            undoRow.addControl(undo);
            const redo = panel.button("gear-redo", "Redo", () => fw.commands.redo({ technique: "framework" }), 150);
            redo.isEnabled = !!r;
            undoRow.addControl(redo);
        },
    };
    return gear;
}
