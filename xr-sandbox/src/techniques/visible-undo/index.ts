// Visible undo (design section 9.13, plan section 3.2): after each history command a toast beside
// the hand that acted ("Colored by PageRank -- Undo", 2 s), and a strip above the graph with an Undo
// button that names its step, Redo, and the last five steps, any of which undoes back to it.
//
// Builds on: the framework's command history and its one label formatter (src/core/commands.ts),
// read through ctx.commands.history(); framework chips (the toast) and panels with GUI buttons (the
// strip), so both a ray and a fingertip poke press them. Selections are never steps: the command
// layer keeps them out of the history, so they never reach the strip or the toast.
//
// Gaps (to fix or replace later):
// - Undo is linear: a strip item undoes it and every later step. Selective undo of one earlier step,
//   keeping the later ones, is a later experiment.
// - The toast's "Undo" is words, not a button: undo is on the strip, the gear panel and the wrist
//   menu. A pokeable toast near the hand is worth trying once the wrist menu has settled.
// - The toast's past tense is made from the label's first word (toast.ts), not from { code, params }.
// - The strip is world-locked above the graph; it moves when the graph is grabbed. A body-anchored
//   or wrist-anchored strip is the other option to compare.
// - A command with no hand (issued by the dry run or a panel) toasts beside the dominant hand.

import type { Hand } from "../../core/arbiter";
import type { HistoryEntry } from "../../core/commands";
import type { Technique, TechniqueContext } from "../../framework/technique";
import { createHistoryStrip, type HistoryStrip, STRIP } from "./history-strip";
import { createToast, type Toast } from "./toast";

let ctx: TechniqueContext;
let toast: Toast;
let strip: HistoryStrip;
/** Entries already toasted: a redo puts one back, and that is not a new step. */
let seen = new WeakSet<HistoryEntry>();
let lastLength = 0;
let lastTop: HistoryEntry | undefined;
/** Steps that can be redone, tracked from history changes (the context does not expose the future). */
let redoable = 0;

const handOf = (e: HistoryEntry): Hand => (e.hand === "left" || e.hand === "right" ? e.hand : ctx.dominant());

/** Follow the history: toast a new step, redraw the strip when anything changed. O(1) when idle. */
const follow = (): void => {
    const history = ctx.commands.history();
    const top = history[history.length - 1];
    if (history.length === lastLength && top === lastTop) {
        return;
    }
    if (top && !seen.has(top)) {
        seen.add(top);
        redoable = 0;
        if (ctx.settings.bool("toast")) {
            toast.show(top.label, handOf(top), performance.now());
        }
    } else {
        redoable = Math.max(0, redoable + lastLength - history.length);
    }
    lastLength = history.length;
    lastTop = top;
    const undo = ctx.commands.undoLabel();
    strip.refresh(history, undo, redoable > 0);
    ctx.log("strip.shown", { undo, steps: history.slice(-STRIP).map((e) => e.label), redoable });
};

export const technique: Technique = {
    id: "visible-undo",
    name: "Visible undo",
    color: "#addb67",
    settings: [
        { key: "toast", label: "Toast beside the hand", kind: "bool", default: true },
        { key: "toastSeconds", label: "Toast seconds", kind: "number", default: 2, min: 1, max: 5, step: 0.5 },
        { key: "strip", label: "History strip", kind: "bool", default: true },
    ],
    // Its buttons are UI: a press on them never reaches the arbiter.
    claims: [],
    prepare(c) {
        ctx = c;
        toast = createToast(c);
        strip = createHistoryStrip(c);
        c.settings.onChange((key) => {
            if (key === "strip") {
                if (c.settings.bool("strip")) {
                    strip.show();
                } else {
                    strip.hide();
                }
            } else if (key === "toast" && !c.settings.bool("toast")) {
                toast.hide();
            }
        });
        c.onFrame(() => {
            follow();
            toast.tick(performance.now());
        });
    },
    activate() {
        // Steps taken while it was off are not toasted now.
        seen = new WeakSet(ctx.commands.history());
        lastLength = -1;
        lastTop = undefined;
        follow();
        if (ctx.settings.bool("strip")) {
            strip.show();
        }
    },
    deactivate() {
        toast.hide();
        strip.hide();
    },
};
