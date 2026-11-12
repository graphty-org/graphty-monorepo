// Renders the corner test scene with one variant and compares each bend, cell by cell, with the
// browser's own canvas stroke (miter joins, limit 4, butt caps).
// usage: node check.mjs <baseUrl> <variant> [2d|3d] [dash 0|1]
// Needs a GPU Chromium can reach through ANGLE on Vulkan; EGL_LIB_DIR names the driver's libEGL
// directory when Chromium does not find it on its own.
import { chromium } from "playwright";
import fs from "node:fs";

const [base, variant = "G", mode = "2d", dash = "0"] = process.argv.slice(2);
const args = ["--enable-features=Vulkan", "--use-angle=vulkan", "--disable-vulkan-surface", "--ignore-gpu-blocklist"];
const browser = await chromium.launch({
    args,
    env: { ...process.env, LD_LIBRARY_PATH: process.env.EGL_LIB_DIR ?? process.env.LD_LIBRARY_PATH ?? "" },
});
const page = await browser.newPage({ viewport: { width: 1280, height: 1440 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(`${base}/proto.html?variant=${variant}&mode=${mode}&dash=${dash}&stress=0&ref=1`);
await page.waitForFunction(() => document.title === "done", null, { timeout: 120000 });
const key = `${variant}-${mode}-${dash === "1" ? "dash" : "solid"}`;
await page.locator("canvas").screenshot({ path: `shots/${key}.png` });
const refUrl = await page.evaluate(() => window.__result.reference ?? null);
if (refUrl)
    fs.writeFileSync(
        `shots/ref-${mode}${dash === "1" ? "-dash" : ""}.png`,
        Buffer.from(refUrl.split(",")[1], "base64"),
    );
const out = await page.evaluate(async () => {
    const r = window.__result;
    const gl = document.getElementById("c");
    const W = gl.width,
        H = gl.height;
    const read = async (src) => {
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const g = c.getContext("2d");
        if (typeof src === "string") {
            const img = new Image();
            img.src = src;
            await img.decode();
            g.drawImage(img, 0, 0);
        } else g.drawImage(src, 0, 0);
        return g.getImageData(0, 0, W, H).data;
    };
    const mine = await read(gl);
    const ref = r.reference ? await read(r.reference) : null;
    const CR = 0.12 * 255;
    const cov = (d, i) => Math.max(0, (255 - d[i]) / (255 - CR));
    const cells = [];
    for (const f of r.foci) {
        const half = 60;
        let overlap = 0,
            hole = 0,
            spill = 0,
            drawn = 0;
        for (let y = Math.round(f.y - half); y < f.y + half; y++)
            for (let x = Math.round(f.x - half); x < f.x + half; x++) {
                if (x < 0 || y < 0 || x >= W || y >= H) continue;
                const i = (y * W + x) * 4;
                const m = cov(mine, i);
                if (m > 0.05) drawn++;
                if (f.alpha < 1 && m > f.alpha + 0.1) overlap++;
                if (ref) {
                    const q = cov(ref, i);
                    if (q / f.alpha > 0.85 && m / f.alpha < 0.25) hole++;
                    if (q / f.alpha < 0.15 && m / f.alpha > 0.75) spill++;
                }
            }
        cells.push({ row: f.row, w: f.w, alpha: f.alpha, overlap, hole, spill, drawn });
    }
    return { cells, drawCalls: r.drawCalls, renderer: r.renderer };
});
fs.writeFileSync(`shots/${key}.json`, JSON.stringify(out, null, 1));
if (out.cells.length && fs.existsSync("/dev/null")) {
    const CASES = ["179", "170", "135", "90", "45", "20", "5", "U0", "Ushort"];
    const lines = ["case  w  alpha  overlap hole spill"];
    for (const c of out.cells) {
        if (c.overlap || c.hole || c.spill)
            lines.push(
                `${CASES[c.row].padEnd(6)} ${String(c.w).padStart(2)} ${String(c.alpha).padEnd(4)} ${String(c.overlap).padStart(5)} ${String(c.hole).padStart(5)} ${String(c.spill).padStart(5)}`,
            );
    }
    console.log(key, "drawCalls", out.drawCalls, "errors", errors.slice(0, 3));
    console.log(lines.join("\n"));
}
await browser.close();
