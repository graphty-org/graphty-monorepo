// Pull to grow a neighborhood (design section 9.6): pinch a node and pull; a 6 cm dead zone, then
// one hop per 8 cm, with a live readout beside the hand ("1 hop: 6", "2 hops: +5"). The graph
// previews the neighborhood (the rest dims); release commits `neighbors`, release back inside the
// dead zone cancels. What it reuses and what it lacks: README.md beside this file.

import { breadthFirstSearch } from "@graphty/algorithms";
import { OneEuroFilter } from "1eurofilter";

import type { Hand } from "../../core/arbiter";
import type { Preview } from "../../core/commands";
import type { Technique, TechniqueContext } from "../../framework/technique";
import { click } from "../../scene/audio";
import { hopsFor, type HopSteps, levelCounts, readoutText } from "./hops";
import { createReadout, type Readout } from "./readout";

/** BFS depth computed at the pinch; the same cap as the framework's `neighbors`. */
const MAX_DEPTH = 8;

let ctx: TechniqueContext;
let readout: Readout;

const steps = (): HopSteps => ({
    deadM: ctx.settings.num("deadCm") / 100,
    stepM: ctx.settings.num("stepCm") / 100,
    hystM: ctx.settings.num("hysteresisCm") / 100,
});

/**
 * A short tick per hop: a click (hands have no haptics) and a pulse on a controller.
 * @param hand - the pulling hand
 * @param freq - click pitch in Hz
 */
const tick = (hand: Hand, freq: number): void => {
    if (ctx.settings.bool("clicks")) {
        click(freq);
    }
    if (ctx.settings.bool("haptics")) {
        const c = ctx.xr()?.input.controllers.find((x) => x.inputSource.handedness === hand && !x.inputSource.hand);
        // pulse() resolves false on a controller without an actuator; it never throws for that.
        c?.motionController?.pulse(0.3, 20).catch(() => false);
    }
};

export const technique: Technique = {
    id: "pull-to-grow",
    name: "Pull to grow",
    color: "#ffcb6b",
    settings: [
        { key: "deadCm", label: "Dead zone (cm)", kind: "number", min: 2, max: 15, step: 1, default: 6 },
        { key: "stepCm", label: "Per hop (cm)", kind: "number", min: 3, max: 20, step: 1, default: 8 },
        { key: "hysteresisCm", label: "Hysteresis band (cm)", kind: "number", min: 0, max: 4, step: 0.5, default: 2 },
        {
            key: "minCutoff",
            label: "Filter min cutoff (Hz)",
            kind: "number",
            min: 0.2,
            max: 5,
            step: 0.1,
            default: 1.5,
        },
        { key: "beta", label: "Filter beta", kind: "number", min: 0, max: 20, step: 0.5, default: 5 },
        { key: "clicks", label: "Click per hop", kind: "bool", default: true },
        { key: "haptics", label: "Pulse per hop (controllers)", kind: "bool", default: true },
    ],
    claims: [
        {
            channel: "select",
            contexts: ["node"],
            priority: 60,
            decide: (g) => (g.movedM >= 0.03 ? "take" : "wait"),
            note: "take after 3 cm of movement",
        },
    ],
    prepare(c) {
        ctx = c;
        readout = createReadout(c);
        if (/[?&]emulate=/.test(location.search)) {
            // Read-only, for the dry run (dryrun/checks/pull-to-grow.mjs).
            const api = { readout: () => ({ visible: readout.visible, text: readout.text, redraws: readout.redraws }) };
            (globalThis as unknown as { __pullToGrow: typeof api }).__pullToGrow = api;
        }
    },
    activate() {
        // Nothing shows until a pull: the readout appears at the first hop.
    },
    deactivate() {
        readout.reset();
    },
    onPress(p, hand) {
        const id = p.press.target;
        if (id < 0) {
            return undefined;
        }
        const node = ctx.graph.data.names[id];
        const { depth } = breadthFirstSearch(ctx.graph.data.snapshot, id, { maxDepth: MAX_DEPTH });
        const levels = levelCounts(depth, MAX_DEPTH);
        const maxHops = levels.length - 1;
        const s = steps();
        const filter = new OneEuroFilter(72, ctx.settings.num("minCutoff"), ctx.settings.num("beta"));
        let hops = 0;
        let changes = 0;
        let preview: Preview | null = null;
        readout.reset();

        const finish = (): Record<string, unknown> => ({ node, hops, hopChanges: changes, redraws: readout.redraws });
        return {
            move(g) {
                const dist = filter.filter(g.movedM, performance.now() / 1000);
                const h = hopsFor(dist, hops, maxHops, s);
                if (h === hops) {
                    return;
                }
                hops = h;
                changes++;
                if (h > 0 && preview) {
                    preview.update({ id, hops: h });
                } else if (h > 0) {
                    preview = ctx.commands.preview("neighbors", { id, hops: h }, hand);
                } else {
                    // Back in the dead zone: the graph shows that a release now does nothing.
                    preview?.cancel();
                    preview = null;
                }
                const text = readoutText(h, levels);
                readout.show(hand, text);
                ctx.log("hop", { node, hops: h, text, distCm: Math.round(dist * 1000) / 10 });
                tick(hand, h > 0 ? 700 + 120 * h : 500);
            },
            end() {
                if (preview && hops > 0) {
                    preview.commit();
                    ctx.log("commit", { ...finish(), selected: ctx.state.selection.size });
                    tick(hand, 1400);
                } else {
                    preview?.cancel();
                    ctx.log("cancel", { ...finish(), reason: "released in the dead zone" });
                }
                preview = null;
                readout.reset();
            },
            cancel(reason) {
                preview?.cancel();
                preview = null;
                ctx.log("cancel", { ...finish(), reason });
                readout.reset();
            },
        };
    },
};
