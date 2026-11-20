/**
 * The video's look: title, chapter, placeholder and end cards, the stage a clip is framed on, and
 * lower-third captions, written as HTML in one visual language (graphty's Outfit and Inter, ink
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
/** Where a recorded clip sits in the 1920x1080 frame: scaled to 85%, with the caption band under it. */
export const STAGE = { x: 144, y: 22, w: 1632, h: 918, r: 14 };

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
.card { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; padding: 0 180px;
  background: radial-gradient(1200px 700px at 78% 30%, rgba(163,217,27,0.13), transparent 70%), ${INK}; }
.card.over { background: transparent; }
.kicker { font: 600 34px/1 Inter; letter-spacing: 0.14em; text-transform: uppercase; color: ${LIME}; margin-bottom: 34px; }
.title { font: 600 104px/1.08 Outfit; letter-spacing: -0.01em; max-width: 1500px; }
.sub { font: 400 42px/1.35 Inter; color: #c9d1d9; margin-top: 34px; max-width: 1400px; }
.rule { width: 120px; height: 8px; border-radius: 4px; background: ${LIME}; margin-bottom: 40px; }
.logo svg { height: 150px; width: auto; }
.center { align-items: center; text-align: center; padding: 0 120px; }
.ph { position: absolute; inset: 70px; border: 4px dashed rgba(201,209,217,0.45); border-radius: 36px; }
.tag { display: inline-block; font: 700 28px/1 Inter; letter-spacing: 0.12em; color: ${INK}; background: ${LIME};
  padding: 12px 18px; border-radius: 10px; margin-bottom: 40px; }
.cap { position: absolute; left: 0; right: 0; top: ${STAGE.y + STAGE.h}px; bottom: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center; padding-bottom: 6px; }
.cap .main { font: 600 50px/1.15 Inter; color: #fff; }
.cap .small { font: 500 29px/1.15 Inter; color: ${LIME}; margin-top: 8px; }
.frame { position: absolute; inset: 0; background: rgba(18,23,31,0.86); }
.stage { position: absolute; inset: 0; background: radial-gradient(1400px 600px at 50% 100%, rgba(163,217,27,0.10), transparent 70%), ${INK}; }
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
     * The opening title: the logo, lines under it.
     * @param data - the fields
     * @param data.lines - lines of text under the logo
     * @param data.over - true to lay it over a frame (transparent PNG)
     * @returns the page
     */
    title: ({ lines = [], over = false }) =>
        page(
            (over ? div("frame", "", "background:rgba(18,23,31,0.62)") : "") +
                div(
                    over ? "card center over" : "card center",
                    div("logo", BIG_LOGO) +
                        lines
                            .map((l, i) =>
                                div(
                                    "sub",
                                    esc(l),
                                    i ? "font-size:40px;margin-top:16px" : "font-size:54px;margin-top:44px",
                                ),
                            )
                            .join(""),
                ),
            over,
        ),
    /**
     * A chapter's opening card; `over` makes it translucent, to sit on the chapter's first frame.
     * @param data - the fields
     * @param data.number - the chapter's number
     * @param data.title - its title
     * @param data.over - true to lay it over a frame (transparent PNG)
     * @returns the page
     */
    chapter: ({ number, title, over = false }) =>
        page(
            (over ? div("frame", "") : "") +
                div(
                    over ? "card over" : "card",
                    div("kicker", "Chapter " + esc(number)) + div("rule", "") + div("title", esc(title)),
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
     * @returns the page
     */
    end: ({ big = "graphty.app", lines = [] }) =>
        page(
            div(
                "card center",
                div("logo", LOGO, "margin-bottom:30px") +
                    div("title", esc(big), "font-size:120px;color:" + LIME) +
                    lines.map((l) => div("sub", esc(l))).join(""),
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
     * A caption in the band under the framed clip (transparent PNG): about ten words, an optional smaller line.
     * @param data - the fields
     * @param data.text - the caption
     * @param data.small - the smaller second line
     * @returns the page
     */
    caption: ({ text, small }) =>
        page(div("cap", div("main", esc(text)) + (small ? div("small", esc(small)) : "")), true),
};

const TRANSPARENT = new Set(["caption", "corners"]);

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
