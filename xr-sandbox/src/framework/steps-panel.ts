// The step list (design section 7): the current step's text, Done and Skip, the elapsed time on its
// own small chip (redrawn once a second), then an optional one-poke ease rating. It never says how
// to do a step and never judges it: the commands in the log show what happened.

import type { Scene } from "@babylonjs/core";
import { Control, StackPanel, TextBlock } from "@babylonjs/gui";

import { buildSteps, type Step, type StepFacts } from "../core/steps";
import { type Chip, createChip, createPanel, guiButton, type Panel } from "../scene/ui";
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
    const panel = createPanel(scene, "steps-panel", 0.32, 0.17, 512);
    panel.mesh.parent = zones.steps;
    const timer: Chip = createChip(scene, "steps-timer", 0.08, 0.02);
    timer.mesh.parent = zones.steps;
    timer.mesh.position.set(0.12, 0.1, 0);
    const notice: Chip = createChip(scene, "steps-notice", 0.1, 0.03);
    notice.mesh.parent = zones.steps;
    notice.mesh.position.set(-0.1, 0.11, 0);

    let list = "journey";
    let steps: Step[] = [];
    let index = 0;
    let seed = 0;
    let started = 0;
    let interval = 0;
    let noticeTimer = 0;

    const heading = new TextBlock("steps-heading", "");
    heading.height = "34px";
    heading.color = "#9fb3d9";
    heading.fontSize = 20;
    const text = new TextBlock("steps-text", "");
    text.height = "120px";
    text.color = "#ffffff";
    text.fontSize = 26;
    text.textWrapping = true;
    text.paddingLeft = "12px";
    text.paddingRight = "12px";
    const buttons = new StackPanel();
    buttons.isVertical = false;
    buttons.height = "60px";
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
                guiButton(
                    `steps-rate-${r}`,
                    String(r),
                    () => {
                        rate(r);
                    },
                    52,
                    58,
                ),
            );
        }
        buttons.addControl(
            guiButton(
                "steps-rate-none",
                "Next",
                () => {
                    rate(null);
                },
                52,
                80,
            ),
        );
    };

    const show = (): void => {
        buttons.clearControls();
        if (index >= steps.length) {
            heading.text = `${list}: finished`;
            text.text = "All steps done. Open the gear panel to pick another list.";
            buttons.addControl(
                guiButton(
                    "steps-close",
                    "Close",
                    () => {
                        api.toggle();
                    },
                    52,
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
            guiButton(
                "steps-done",
                "Done",
                () => {
                    finish("done");
                },
                52,
                160,
            ),
        );
        buttons.addControl(
            guiButton(
                "steps-skip",
                "Skip",
                () => {
                    finish("skip");
                },
                52,
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
            noticeTimer = window.setTimeout(() => {
                notice.hide();
            }, 3000);
        },
        open(l) {
            list = l;
            seed = Math.floor(Math.random() * 1_000_000);
            steps = buildSteps(l, seed, facts);
            index = 0;
            log.log("step", { list, event: "open", seed, steps: steps.map((s) => s.text) });
            panel.show();
            show();
            clearInterval(interval);
            if (!still) {
                interval = window.setInterval(() => {
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
