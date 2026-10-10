// A trivial technique that proves the module contract: it builds a chip hidden at prepare, shows it
// at activate, claims the A button, issues a history command (so undo names its step), reads one
// setting, and hides at deactivate. Copy this folder to start a new technique.

import type { Technique, TechniqueContext } from "../../framework/technique";
import type { Chip } from "../../scene/ui";

let ctx: TechniqueContext;
let chip: Chip;
let shownFor: string | null | undefined;

const cycle = (): string[] => {
    const all = ["pagerank", "degree", "betweenness", "community"];
    return ctx.settings.bool("categories") ? all : all.filter((r) => r !== "community");
};

const next = (): string => {
    const list = cycle();
    const i = list.indexOf(ctx.state.colorBy ?? "");
    return list[(i + 1) % list.length];
};

const refresh = (): void => {
    shownFor = ctx.state.colorBy;
    chip.set(`A: color by ${ctx.graph.data.resultNames[next()]}`, "#5c4a1c");
};

export const technique: Technique = {
    id: "example",
    name: "Example: color cycle",
    color: "#e0b050",
    needs: ["controllers"],
    settings: [{ key: "categories", label: "Include community", kind: "bool", default: true }],
    claims: [
        { channel: "button", detail: "a", hand: "dominant", contexts: "any", priority: 10, note: "A cycles color by" },
    ],
    smoke: { input: "button:a", hand: "dominant" },
    prepare(c) {
        ctx = c;
        chip = c.ui.chip("example-chip", 0.22, 0.03, true);
        chip.mesh.parent = c.anchor("graph-top");
        c.settings.onChange(refresh);
        // Undo can change the coloring too; the chip follows it.
        c.onFrame(() => {
            if (c.state.colorBy !== shownFor) {
                refresh();
            }
        });
    },
    activate() {
        refresh();
        chip.show();
    },
    deactivate() {
        chip.hide();
    },
    onPress(_p, hand) {
        ctx.commands.run("colorBy", { result: next() }, hand);
        refresh();
        return undefined;
    },
};
