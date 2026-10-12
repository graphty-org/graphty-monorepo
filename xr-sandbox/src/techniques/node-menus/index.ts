// Node menus (design section 9.3, plan section 3.5): point at a node and hold still (or press B or
// Y) and a menu of its verbs opens; on empty space, the same menu with graph verbs. Two styles,
// switched in the gear panel:
// - ring: items in a ring at the hand, steered by turning the wrist; release commits (ring.ts,
//   written fresh after Open Brush's PinCushion.cs, Apache-2.0, as reference only);
// - list: a column of buttons on a framework panel beside the node, chosen by ray (list.ts).
// Note asks for text through the framework's ctx.text: the text entry technique's keyboard when it
// is on, canned chips when it is off.
//
// Gaps (fix or replace later):
// - One level of hierarchy; pangmenu's child rings (design only, no license) are not built.
// - The ring is steered by the grip pose, unfiltered; real hand-tracking noise may need a One Euro
//   filter (1eurofilter is already a dependency). Hands on Galaxy XR steer by wrist turn only.
// - Dismissal rules are first guesses: the list closes on Close, on a new menu, or when the head
//   turns more than 70 degrees away from it; the ring cancels when released in its dead zone.
// - The list is placed once and does not follow the node if the graph is moved while it is open.
// - The touch style (a direct-touch panel) and Kando-style expert strokes are deferred.

import { Ray, Vector3 } from "@babylonjs/core";

import type { Hand } from "../../core/arbiter";
import type { Technique, TechniqueContext } from "../../framework/technique";
import type { Chip } from "../../scene/ui";
import { createListMenu, type ListMenu } from "./list";
import { createRingMenu, type RingMenu } from "./ring";
import { graphVerbs, NODE_VERBS, type Verb } from "./verbs";

let ctx: TechniqueContext;
let ring: RingMenu;
let list: ListMenu;
let card: Chip;
let cardMs = 0;
/** What the open menu is about: a node index, or -1 for the graph; and the hand that opened it. */
let open: {
    target: number;
    hand: Hand;
    verbs: readonly Verb[];
    style: string;
    /** Where the list was put. */
    at: Vector3;
    /** The ring's highlighted verb, for logging changes. */
    lit: string | undefined;
} | null = null;
const LOOK_AWAY_COS = Math.cos((70 * Math.PI) / 180);
const ray = new Ray(Vector3.Zero(), Vector3.Forward(), 1);

const name = (t: number): string => (t >= 0 ? ctx.graph.data.names[t] : "the graph");

const close = (): void => {
    ring.close();
    list.close();
    open = null;
};

/**
 * Show a node's facts beside it for a few seconds (what the Probe verb gives the owner to read).
 * @param t - the node
 */
const showCard = (t: number): void => {
    const d = ctx.graph.data;
    const deg = d.neighbors(t, 1).length - 1;
    card.set(
        `${d.names[t]}  PageRank ${d.results.pagerank[t].toFixed(3)} #${d.rank.pagerank[t]}  degree ${deg}`,
        "#203a2c",
    );
    // Its bottom edge 3 cm above the node, however many lines the text took.
    card.mesh.position
        .copyFrom(ctx.graph.nodeWorld(t, new Vector3()))
        .addInPlaceFromFloats(0, 0.03 + card.heightM / 2, 0);
    card.show();
    cardMs = 6000;
};

const note = (t: number, hand: Hand): void => {
    void ctx.text.request({ label: `Note on ${name(t)}`, hand }).then((text) => {
        if (text) {
            ctx.commands.run("note", { target: t >= 0 ? t : "graph", text }, hand);
        }
    });
};

/**
 * Run a chosen verb.
 * @param verb - its id
 * @param t - the node, or -1 for the graph
 * @param hand - the hand that chose it
 */
const run = (verb: string, t: number, hand: Hand): void => {
    const c = ctx.commands;
    if (t >= 0) {
        switch (verb) {
            case "select":
                c.run("select", { ids: [t] }, hand);
                break;
            case "neighbors":
                c.run("neighbors", { id: t, hops: 1 }, hand);
                break;
            case "probe":
                c.run("probe", { id: t }, hand);
                showCard(t);
                break;
            case "note":
                note(t, hand);
                break;
            case "hide":
                c.run("hide", { ids: [t] }, hand);
                break;
            default:
                break;
        }
        return;
    }
    switch (verb) {
        case "show":
            c.run("colorBy", { result: "pagerank" }, hand);
            break;
        case "filter": {
            if (ctx.state.filter) {
                c.run("clearFilter", {}, hand);
                break;
            }
            const order = ctx.graph.data.order.pagerank;
            const median = ctx.graph.data.results.pagerank[order[Math.floor((order.length - 1) / 2)]];
            c.run("filter", { result: "pagerank", op: ">=", value: median }, hand);
            break;
        }
        case "clear":
            c.run("select", { ids: [] }, hand);
            break;
        case "note":
            note(-1, hand);
            break;
        default:
            break;
    }
};

const choose = (index: number): void => {
    if (!open) {
        return;
    }
    const { target, hand, verbs, style } = open;
    close();
    const verb = verbs[index];
    if (!verb) {
        ctx.log("dismiss", { style, target: name(target) });
        return;
    }
    ctx.log("verb", { verb: verb.id, style, target: name(target), hand });
    run(verb.id, target, hand);
};

/**
 * Where the list goes: beside the node, toward the head and to its right; or 45 cm along the ray.
 * @param t - the node, or -1
 * @param hand - the pointing hand
 * @param head - the head position
 * @returns the list's center
 */
const listSpot = (t: number, hand: Hand, head: Vector3): Vector3 => {
    if (t >= 0) {
        const at = ctx.graph.nodeWorld(t, new Vector3());
        const fwd = at.subtract(head).normalize();
        const right = Vector3.Cross(Vector3.Up(), fwd).normalize();
        // The column's bottom edge: right of the node, level with it, so the column rises above the
        // step list and the other panels below the line of sight.
        return at.addInPlace(right.scale(0.18)).subtractInPlace(fwd.scale(0.06));
    }
    const src = ctx.xr()?.input.controllers.find((c) => c.inputSource.handedness === hand);
    if (!src) {
        return head.add(new Vector3(0, -0.23, 0.45));
    }
    src.getWorldPointerRayToRef(ray, false);
    return ray.origin.add(ray.direction.scale(0.45)).addInPlaceFromFloats(0, -0.08, 0);
};

export const technique: Technique = {
    id: "node-menus",
    name: "Node menus",
    color: "#82aaff",
    settings: [
        { key: "style", label: "Menu style", kind: "choice", choices: ["list", "ring"], default: "list" },
        { key: "deadZoneDeg", label: "Ring dead zone (deg)", kind: "number", min: 6, max: 24, step: 2, default: 12 },
    ],
    claims: [
        {
            channel: "select",
            contexts: ["node", "graph", "space"],
            priority: 50,
            decide: (g) => {
                if (g.movedM > 0.015) {
                    return "pass";
                }
                return g.durationMs >= 300 ? "take" : "wait";
            },
            note: "take after 300 ms held within 1.5 cm",
        },
        { channel: "button", detail: "b", contexts: ["node", "graph", "space"], priority: 50, note: "take at start" },
        { channel: "button", detail: "y", contexts: ["node", "graph", "space"], priority: 50, note: "take at start" },
    ],
    smoke: { input: "button:b", hand: "dominant", aim: "node" },
    prepare(c) {
        ctx = c;
        ring = createRingMenu(c, NODE_VERBS.length);
        list = createListMenu(c, { node: NODE_VERBS, graph: graphVerbs(false, false) }, (kind, index) => {
            if (open && open.target >= 0 === (kind === "node")) {
                choose(index);
            }
        });
        card = c.ui.chip("card", 0.1, "graph", true);
        c.onFrame((dt) => {
            if (cardMs > 0) {
                cardMs -= dt;
                if (cardMs <= 0) {
                    card.hide();
                }
            }
            if (!open) {
                return;
            }
            if (ring.isOpen) {
                const before = open.verbs[ring.steer()]?.id;
                if (before !== open.lit) {
                    open.lit = before;
                    ctx.log("highlight", { verb: before ?? null });
                }
                return;
            }
            // The list closes when the head turns well away from it.
            const cam = c.xr()?.baseExperience.camera;
            if (cam && list.isOpen) {
                const to = open.at.subtract(cam.globalPosition).normalize();
                if (Vector3.Dot(to, cam.getDirection(Vector3.Forward())) < LOOK_AWAY_COS) {
                    ctx.log("dismiss", { style: "list", target: name(open.target), why: "looked away" });
                    close();
                }
            }
        });
    },
    activate() {
        // Nothing shows until a press opens a menu.
    },
    deactivate() {
        close();
        card.hide();
        cardMs = 0;
    },
    onPress(p, hand) {
        close();
        const t = p.press.target;
        const verbs = t >= 0 ? NODE_VERBS : graphVerbs(ctx.state.filter !== null, ctx.state.selection.size > 0);
        const head = ctx.xr()?.baseExperience.camera.globalPosition.clone() ?? new Vector3(0, 1.6, 0);
        const want = ctx.settings.str("style") === "ring" ? "ring" : "list";
        const dead = ctx.settings.num("deadZoneDeg") || 12;
        const title = t >= 0 ? name(t) : "Graph";
        const style = want === "ring" && ring.open(hand, verbs, title, dead) ? "ring" : "list";
        const at = listSpot(t, hand, head);
        open = { target: t, hand, verbs, style, at, lit: undefined };
        if (style === "list") {
            list.open(t >= 0 ? "node" : "graph", verbs, at, head);
        }
        ctx.log("open", {
            style,
            wanted: want,
            target: name(t),
            verbs: verbs.map((v) => v.id),
            channel: p.press.channel,
            detail: p.press.detail,
            hand,
        });
        if (style === "list") {
            return undefined;
        }
        return {
            end: () => {
                if (open && ring.isOpen) {
                    choose(ring.steer());
                }
            },
            cancel: (reason) => {
                ctx.log("dismiss", { style, target: name(t), why: reason });
                close();
            },
        };
    },
};
