// The step list (design section 7): the current step's text, Done and Skip, the elapsed time on its
// own small chip (redrawn once a second), then an optional one-poke ease rating. It never says how
// to do a step and never judges it: the commands in the log show what happened.

import type { Scene } from "@babylonjs/core";
import { Control } from "@babylonjs/gui";

import { buildSteps, type Step, type StepFacts } from "../core/steps";
import { type Chip, createChip, createPanel, type Panel } from "../scene/ui";
import type { Zones } from "../scene/zones";
import type { Logger } from "./logging";

/** The step list panel. */
interface StepsPanel {
    panel: Panel;
    /** Show a short notice in the steps zone (the Flag id), for 3 s. */
    notice(text: string): void;
    open(list: string): void;
    toggle(): void;
}

/**
 * Build the step list panel, hidden.
 * @param scene - the scene
 * @param zones - the body-anchored zones
 * @param log - the logger
 * @param facts - facts the step texts are filled from
 * @param still - no time-driven redraws (the dry run's jitter test)
 * @returns the panel
 */
export function createStepsPanel(
    scene: Scene,
    zones: Zones,
    log: Logger,
    facts: StepFacts,
    still: boolean,
): StepsPanel {
    const panel = createPanel(scene, "steps-panel", 0.36, 0.17, 576, { fit: true });
    panel.mesh.parent = zones.steps;
    // Above the panel's top edge (fixed at 0.085 m; the panel grows downward).
    const timer: Chip = createChip(scene, "steps-timer", 0.06, "reach");
    timer.mesh.parent = zones.steps;
    timer.mesh.position.set(0.13, 0.11, 0);
    const notice: Chip = createChip(scene, "steps-notice", 0.1, "reach");
    notice.mesh.parent = zones.steps;
    notice.mesh.position.set(-0.08, 0.11, 0);

    let list = "journey";
    let steps: Step[] = [];
    let index = 0;
    let seed = 0;
    let started = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    let noticeTimer: ReturnType<typeof setTimeout> | undefined;

    const heading = panel.text("", "#9fb3d9");
    heading.name = "steps-heading";
    const text = panel.text("", "#ffffff", true);
    text.name = "steps-text";
    const buttons = panel.line();
    buttons.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.stack.addControl(heading);
    panel.stack.addControl(text);
    panel.stack.addControl(buttons);

    const finish = (outcome: "done" | "skip"): void => {
        const ms = Math.round(performance.now() - started);
        const step = steps[index];
        buttons.clearControls();
        text.text = "How easy was that? (1 = very hard, 7 = very easy)";
        const rate = (rating: number | null): void => {
            log.log("step", { list, step: step.id, index, seed, outcome, ms, rating });
            index++;
            show();
        };
        for (let r = 1; r <= 7; r++) {
            buttons.addControl(
                panel.button(
                    `steps-rate-${r}`,
                    String(r),
                    () => {
                        rate(r);
                    },
                    64,
                ),
            );
        }
        buttons.addControl(
            panel.button(
                "steps-rate-none",
                "Next",
                () => {
                    rate(null);
                },
                96,
            ),
        );
    };

    const show = (): void => {
        buttons.clearControls();
        if (index >= steps.length) {
            heading.text = `${list}: finished`;
            text.text = "All steps done. Open the gear panel to pick another list.";
            buttons.addControl(
                panel.button(
                    "steps-close",
                    "Close",
                    () => {
                        api.toggle();
                    },
                    140,
                ),
            );
            clearInterval(interval);
            timer.hide();
            return;
        }
        heading.text = `${list}  ${index + 1} of ${steps.length}`;
        text.text = steps[index].text;
        buttons.addControl(
            panel.button(
                "steps-done",
                "Done",
                () => {
                    finish("done");
                },
                160,
            ),
        );
        buttons.addControl(
            panel.button(
                "steps-skip",
                "Skip",
                () => {
                    finish("skip");
                },
                160,
            ),
        );
        started = performance.now();
        timer.set("0 s");
        timer.show();
    };

    const api: StepsPanel = {
        panel,
        notice(t) {
            notice.set(t, "#7a2d2d");
            notice.show();
            clearTimeout(noticeTimer);
            noticeTimer = globalThis.setTimeout(() => {
                notice.hide();
            }, 3000);
        },
        open(l) {
            list = l;
            seed = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
            steps = buildSteps(l, seed, facts);
            index = 0;
            log.log("step", { list, event: "open", seed, steps: steps.map((s) => s.text) });
            panel.show();
            show();
            clearInterval(interval);
            if (!still) {
                interval = globalThis.setInterval(() => {
                    timer.set(`${Math.floor((performance.now() - started) / 1000)} s`);
                }, 1000);
            }
        },
        toggle() {
            if (panel.visible) {
                panel.hide();
                timer.hide();
                clearInterval(interval);
            } else {
                api.open(list);
            }
        },
    };
    return api;
}
