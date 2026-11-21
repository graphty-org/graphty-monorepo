/**
 * The video's look: title, chapter, placeholder and end cards, the stage a clip is framed on, and
 * captions in a band above it (a player's scrubber and buttons cover the bottom 10% of the frame,
 * so nothing that must be read sits there: tmp/demo-video/rework/research-craft.md, rules 10-11), written as HTML in one visual language (graphty's Outfit and Inter, ink
 * background, lime accent) and rendered to 1920x1080 PNGs by Chromium for good typography. The
 * in-page cursor, click ring and key badge (lib/overlay.mjs) use the same ink and lime.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { DIST, H, mkdirp, OUT, REPO, W } from "./env.mjs";

const font = (re) => {
    const dir = join(DIST, "assets");
    const f = readdirSync(dir).find((n) => re.test(n));
    return f ? pathToFileURL(join(dir, f)).href : null;
};
const LOGO = readFileSync(join(REPO, "graphty/src/workspace/start/brand/graphty-lockup-color-on-dark.svg"), "utf8");
const BIG_LOGO = LOGO.replace("<svg", '<svg style="height:230px;width:auto"');

export const INK = "#12171f";
export const LIME = "#a3d91b";
/**
 * Where a recorded clip sits in the 1920x1080 frame: scaled to 80%, the caption band above it
 * (y 24-120), the bottom 84 px left empty for the player's controls.
 */
export const STAGE = { x: 192, y: 132, w: 1536, h: 864, r: 14 };
/** Title-safe: all card text stays inside it (the inner 80%, x 192-1728, y 108-972). */
const SAFE = { x: 192, y: 108 };

const ENTITIES = { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" };
const esc = (s) => String(s ?? "").replaceAll(/[<>&"]/g, (c) => ENTITIES[c]);
const div = (cls, inner, style = "") =>
    '<div class="' + cls + '"' + (style ? ' style="' + style + '"' : "") + ">" + inner + "</div>";

const CSS = `
@font-face { font-family: Outfit; src: url(${font(/^Outfit.*\.ttf$/)}); font-weight: 100 900; }
@font-face { font-family: Inter; src: url(${font(/^inter-latin-wght-normal.*\.woff2$/)}); font-weight: 100 900; }
html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
body { color: #fff; font-family: Inter, sans-serif; background: ${INK}; }
body.clear { background: transparent; }
.card { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; padding: ${SAFE.y}px ${SAFE.x}px;
  box-sizing: border-box;
  background: radial-gradient(1200px 700px at 78% 30%, rgba(163,217,27,0.13), transparent 70%), ${INK}; }
.card.over { background: transparent; }
.kicker { font: 600 34px/1 Inter; letter-spacing: 0.14em; text-transform: uppercase; color: ${LIME}; margin-bottom: 34px; }
.title { font: 600 104px/1.08 Outfit; letter-spacing: -0.01em; max-width: 1500px; }
.sub { font: 400 42px/1.35 Inter; color: #c9d1d9; margin-top: 34px; max-width: 1400px; }
.fine { font: 400 28px/1.4 Inter; color: #8b95a3; margin-top: 14px; }
.sub + .fine { margin-top: 44px; }
.rule { width: 120px; height: 8px; border-radius: 4px; background: ${LIME}; margin-bottom: 40px; }
.logo svg { height: 150px; width: auto; }
.center { align-items: center; text-align: center; }
.ph { position: absolute; inset: 70px; border: 4px dashed rgba(201,209,217,0.45); border-radius: 36px; }
.tag { display: inline-block; font: 700 28px/1 Inter; letter-spacing: 0.12em; color: ${INK}; background: ${LIME};
  padding: 12px 18px; border-radius: 10px; margin-bottom: 40px; }
.cap { position: absolute; left: ${STAGE.x}px; width: ${STAGE.w}px; top: 24px; height: 96px; display: flex;
  align-items: center; justify-content: space-between; gap: 40px; }
.cap .main { font: 600 46px/1.1 Inter; color: #fff; white-space: nowrap; }
.cap .tag { font: 500 26px/1 Inter; color: #8b95a3; letter-spacing: 0; background: none; padding: 0; margin: 0;
  text-transform: none; white-space: nowrap; }
.label { position: absolute; left: 72px; top: 60px; display: flex; flex-direction: column; gap: 16px; }
.label .bar { width: 72px; height: 7px; border-radius: 4px; background: ${LIME}; }
.label .text { font: 600 50px/1.1 Inter; color: #fff; white-space: nowrap;
  text-shadow: 0 2px 18px rgba(0,0,0,0.85), 0 0 3px rgba(0,0,0,0.6); }
.card .later { opacity: 0; }
.card.reveal .later { opacity: 1; }
.frame { position: absolute; inset: 0; background: rgba(18,23,31,0.86); }
.stage { position: absolute; inset: 0; background: ${INK}; }
.shadow { position: absolute; left: ${STAGE.x}px; top: ${STAGE.y}px; width: ${STAGE.w}px; height: ${STAGE.h}px;
  border-radius: ${STAGE.r}px; box-shadow: 0 18px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08); }
.hole { position: absolute; left: ${STAGE.x}px; top: ${STAGE.y}px; width: ${STAGE.w}px; height: ${STAGE.h}px;
  border-radius: ${STAGE.r}px; box-shadow: 0 0 0 40px ${INK}; }
`;

const page = (body, transparent = false) =>
    `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body class="${transparent ? "clear" : ""}">${body}</body></html>`;

/** Each kind of picture, as a function of its fields to a page of HTML. */
export const html = {
    /**
     * The opening title: the logo, lines under it, and lines that appear a moment later.
     * @param data - the fields
     * @param data.lines - lines of text under the logo
     * @param data.laterLines - smaller lines under those, shown only with `reveal` (laid out either way)
     * @param data.reveal - true to show `laterLines`
     * @param data.over - true to lay it over a frame (transparent PNG)
     * @param data.smash - true for a pure black card (a smash cut to the title on a hit)
     * @param [data.veil] - how dark the frame under it is made, 0-1 (default 0.62)
     * @param [data.strong] - the first line larger, bolder and white, with a shadow (over bright footage)
     * @returns the page
     */
    title: ({
        lines = [],
        laterLines = [],
        reveal = false,
        over = false,
        veil = 0.62,
        strong = false,
        smash = false,
    }) =>
        page(
            (over ? div("frame", "", `background:rgba(18,23,31,${veil})`) : "") +
                div(
                    (over ? "card center over" : "card center") + (reveal ? " reveal" : ""),
                    div("logo", BIG_LOGO) +
                        lines
                            .map((l, i) =>
                                div(
                                    "sub",
                                    esc(l),
                                    i
                                        ? "font-size:40px;margin-top:16px"
                                        : "font-size:54px;margin-top:44px" +
                                              (strong
                                                  ? ";font-size:70px;font-weight:600;color:#fff;text-shadow:0 2px 24px rgba(0,0,0,0.9)"
                                                  : ""),
                                ),
                            )
                            .join("") +
                        laterLines
                            .map((l) =>
                                div("sub later", esc(l), "font-size:40px;font-weight:500;margin-top:28px;color:#fff"),
                            )
                            .join(""),
                    smash ? "background:#000" : "",
                ),
            over,
        ),
    /**
     * A chapter's opening card; `over` makes it translucent, to sit on the chapter's first frame.
     * @param data - the fields
     * @param data.number - the chapter's number
     * @param data.title - its title
     * @param data.sub - a smaller line under the title (a data credit), or none
     * @param data.over - true to lay it over a frame (transparent PNG)
     * @returns the page
     */
    chapter: ({ number, title, sub, over = false }) =>
        page(
            (over ? div("frame", "") : "") +
                div(
                    over ? "card over" : "card",
                    (number === undefined || number === null ? "" : div("kicker", "Chapter " + esc(number))) +
                        div("rule", "") +
                        div("title", esc(title)) +
                        (sub ? div("sub", esc(sub)) : ""),
                ),
            over,
        ),
    /**
     * What will go here, said plainly, for anything not recorded yet.
     * @param data - the fields
     * @param data.text - what will go here
     * @param data.caption - the clip's caption, quoted under it
     * @param data.tag - the label at the top
     * @returns the page
     */
    placeholder: ({ text, caption, tag = "PLACEHOLDER" }) =>
        page(
            div(
                "card center",
                div("ph", "") +
                    div("tag", esc(tag)) +
                    div("title", esc(text), "font-size:84px") +
                    (caption ? div("sub", "&quot;" + esc(caption) + "&quot;") : ""),
            ),
        ),
    /**
     * The end card.
     * @param data - the fields
     * @param data.big - the big line
     * @param data.lines - lines under it
     * @param data.smallLines - small print under those (a developer line, a data credit), not counted in the hold
     * @returns the page
     */
    end: ({ big = "graphty.app", lines = [], smallLines = [] }) =>
        page(
            div(
                "card center",
                div("logo", LOGO, "margin-bottom:30px") +
                    div("title", esc(big), "font-size:120px;color:" + LIME) +
                    lines.map((l) => div("sub", esc(l))).join("") +
                    smallLines.map((l) => div("fine", esc(l))).join(""),
            ),
        ),
    /**
     * The ink background a clip is framed on (the clip goes in STAGE).
     * @returns the page
     */
    stage: () => page(div("stage", "") + div("shadow", "")),
    /**
     * Ink corners laid over the framed clip, rounding it (transparent PNG).
     * @returns the page
     */
    corners: () => page(div("hole", ""), true),
    /**
     * A caption in the band above the framed clip (transparent PNG): one line of 3-7 words, left-aligned
     * with the stage, and an optional small label at the band's right ("Synthetic data").
     * @param data - the fields
     * @param data.text - the caption
     * @param data.tag - the small right-hand label, or none
     * @returns the page
     */
    caption: ({ text, tag }) => page(div("cap", div("main", esc(text)) + (tag ? div("tag", esc(tag)) : "")), true),
    /**
     * A feature's name over full-bleed footage (transparent PNG), at the top left under a lime bar.
     * @param data - the fields
     * @param data.text - the name, 1-3 words
     * @returns the page
     */
    label: ({ text }) => page(div("label", div("bar", "") + div("text", esc(text))), true),
};

const TRANSPARENT = new Set(["caption", "corners", "label"]);

// runs in the page: the fonts are in and two frames are drawn with them
function fontsThenTwoFrames() {
    const twoFrames = (ok) => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(ok));
    return globalThis.document.fonts.ready.then(() => new Promise(twoFrames));
}
let browser = null;

/**
 * Render a card, the stage or a caption to a PNG.
 * @param kind - a key of `html`
 * @param data - its fields
 * @param out - the PNG path
 * @returns the PNG path
 */
export async function png(kind, data, out) {
    if (!browser) {
        const { chromium } = await import("playwright");
        browser = await chromium.launch({ headless: true });
    }
    const tab = await browser.newPage({ viewport: { width: W, height: H } });
    const file = join(mkdirp(join(OUT, "look")), `${kind}.html`);
    writeFileSync(file, html[kind](data));
    await tab.goto(pathToFileURL(file).href);
    // Our own wait on the fonts, then a CDP capture: Playwright's screenshot waits on the fonts
    // again, and once in about six renders never returned from that wait on these file:// pages.
    await tab.evaluate(fontsThenTwoFrames);
    const cdp = await tab.context().newCDPSession(tab);
    if (TRANSPARENT.has(kind) || data.over === true)
        await cdp.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    const { data: b64 } = await cdp.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(out, Buffer.from(b64, "base64"));
    await tab.close();
    return out;
}

/** Close the browser the cards were drawn in. */
export async function closeLook() {
    await browser?.close();
    browser = null;
}
