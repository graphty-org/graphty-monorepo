// Hint tags (design section 9.9): two-letter tags over the nodes in a cone around the dominant ray,
// or over the dots on the slab when that ray is on the plate. Tags latch once the node nearest the
// ray has held for a short dwell, so the ray can leave the graph for the keyboard without the tags
// changing under it. Every tag is a sprite from one atlas texture drawn once at prepare (one draw
// call, no per-tag texture), sized every frame to a constant angular size, and drawn over the graph.

import { Color4, DynamicTexture, type Scene, Sprite, SpriteManager, Vector3 } from "@babylonjs/core";

import { textSurfaces } from "../../scene/ui";
import { hintStrings, nextLetters } from "./hint-strings";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const CELL_W = 64;
const CELL_H = 40;
/** At most this many tags: every two-letter pair of a 20-letter alphabet. */
const MAX_TAGS = 400;

const LIT = new Color4(1, 1, 1, 1);
const FADED = new Color4(1, 1, 1, 0.2);

/** What a latch shows. */
interface Latched {
    mode: "cone" | "slab";
    /** Node index per tag, in tag order. */
    nodes: number[];
    tags: string[];
}

/** The hint tags. */
export interface Hints {
    readonly latched: Latched | null;
    readonly typed: string;
    /** Latch tags on these nodes (nearest the ray first), at most MAX_TAGS. */
    latch(mode: Latched["mode"], nodes: readonly number[], alphabet: string): Latched;
    clear(): void;
    /** A letter, "back" or "clear"; returns the node when a whole tag was typed, else -1. */
    type(key: string): number;
    /** Letters that may come next. */
    next(): string[];
    /** Per frame: put each tag at its node, its letters `deg` degrees tall from the head. */
    place(at: (i: number, out: Vector3) => Vector3 | null, head: Vector3, deg: number): void;
}

/**
 * Build the tag sprites and their atlas, hidden.
 * @param scene - the scene
 * @returns the hints
 */
export function createHints(scene: Scene): Hints {
    const atlas = new DynamicTexture("dense-picking-atlas", { width: CELL_W * 26, height: CELL_H * 26 }, scene, false);
    atlas.hasAlpha = true;
    const g = atlas.getContext();
    g.font = `bold ${Math.round(CELL_H * 0.72)}px sans-serif`;
    (g as CanvasRenderingContext2D).textAlign = "center";
    (g as CanvasRenderingContext2D).textBaseline = "middle";
    for (let a = 0; a < 26; a++) {
        for (let b = 0; b < 26; b++) {
            const x = b * CELL_W;
            const y = a * CELL_H;
            g.fillStyle = "rgba(14, 18, 28, 0.88)";
            g.fillRect(x + 2, y + 2, CELL_W - 4, CELL_H - 4);
            g.fillStyle = "#ffe066";
            g.fillText(`${LETTERS[a]}${LETTERS[b]}`.toUpperCase(), x + CELL_W / 2, y + CELL_H / 2 + 1);
        }
    }
    atlas.update(false);
    // How much of a cell's height a capital letter takes, to size tags by their letters.
    const capOfCell = (g as CanvasRenderingContext2D).measureText("H").actualBoundingBoxAscent / CELL_H;
    const manager = new SpriteManager("dense-picking-tags", "", MAX_TAGS, { width: CELL_W, height: CELL_H }, scene);
    manager.texture = atlas;
    manager.renderingGroupId = 1;
    manager.isPickable = false;
    const sprites: Sprite[] = [];
    for (let k = 0; k < MAX_TAGS; k++) {
        const s = new Sprite(`dense-picking-tag-${k}`, manager);
        s.isVisible = false;
        sprites.push(s);
    }

    let latched: Latched | null = null;
    let typed = "";
    const tmp = new Vector3();
    // For the dry run's fit audit: the first few tags shown (every tag has the same angular size).
    textSurfaces.push({
        name: "dense-picking-tags",
        mesh: null,
        canvas: () => atlas.getContext().canvas,
        items: () =>
            (latched?.tags ?? [])
                .slice(0, 3)
                .map((t, k) => ({ t, s: sprites[k] }))
                .filter(({ s }) => s.isVisible)
                .map(({ t, s }) => ({
                    control: "tag",
                    lines: [t.toUpperCase()],
                    font: g.font,
                    boxW: CELL_W - 4,
                    boxH: CELL_H - 4,
                    metersPerPx: s.height / CELL_H,
                    at: s.position,
                })),
    });

    const tint = (): void => {
        if (!latched) {
            return;
        }
        latched.tags.forEach((t, k) => {
            sprites[k].color = t.startsWith(typed) ? LIT : FADED;
        });
    };

    const clear = (): void => {
        for (let k = 0; k < (latched?.tags.length ?? 0); k++) {
            sprites[k].isVisible = false;
        }
        latched = null;
        typed = "";
    };

    return {
        get latched() {
            return latched;
        },
        get typed() {
            return typed;
        },
        latch(mode, nodes, alphabet) {
            clear();
            const kept = nodes.slice(0, MAX_TAGS);
            const tags = hintStrings(kept.length, alphabet);
            latched = { mode, nodes: kept, tags };
            tags.forEach((t, k) => {
                sprites[k].cellIndex = ((t.codePointAt(0) ?? 97) - 97) * 26 + ((t.codePointAt(1) ?? 97) - 97);
                sprites[k].isVisible = true;
            });
            tint();
            return latched;
        },
        clear,
        type(key) {
            if (!latched) {
                return -1;
            }
            if (key === "clear") {
                clear();
                return -1;
            }
            typed = key === "back" ? typed.slice(0, -1) : typed + key;
            const k = latched.tags.indexOf(typed);
            if (k >= 0) {
                const node = latched.nodes[k];
                clear();
                return node;
            }
            if (!latched.tags.some((t) => t.startsWith(typed))) {
                typed = typed.slice(0, -1);
            }
            tint();
            return -1;
        },
        next: () => (latched ? nextLetters(latched.tags, typed) : []),
        place(at, head, deg) {
            if (!latched) {
                return;
            }
            const k2 = (2 * Math.tan((deg * Math.PI) / 360)) / capOfCell;
            latched.nodes.forEach((i, k) => {
                const s = sprites[k];
                const p = at(i, tmp);
                if (!p) {
                    s.isVisible = false;
                    return;
                }
                const h = Vector3.Distance(p, head) * k2;
                s.height = h;
                s.width = (h * CELL_W) / CELL_H;
                // Just above the node, so the tag never hides the node it names.
                p.y += h * 0.75;
                if (!s.position.equals(p)) {
                    s.position.copyFrom(p);
                }
                s.isVisible = true;
            });
        },
    };
}
