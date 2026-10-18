// usage: node perf.mjs <base> <gpu|swiftshader> <stress> <variants...> -- 3 repeats each, medians printed
// Needs a GPU Chromium can reach through ANGLE on Vulkan; EGL_LIB_DIR names the driver's libEGL
// directory when Chromium does not find it on its own.
import { chromium } from "playwright";
const [base, backend, stress, ...vs] = process.argv.slice(2);
const gpu = ["--enable-features=Vulkan", "--use-angle=vulkan", "--disable-vulkan-surface"];
const ss = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
const browser = await chromium.launch({
    args: [
        ...(backend === "gpu" ? gpu : ss),
        "--disable-gpu-vsync",
        "--disable-frame-rate-limit",
        "--ignore-gpu-blocklist",
    ],
    env: { ...process.env, LD_LIBRARY_PATH: process.env.EGL_LIB_DIR ?? process.env.LD_LIBRARY_PATH ?? "" },
});
for (const key of vs) {
    const [v, mode] = key.split("-");
    const rows = [];
    for (let rep = 0; rep < (backend === "gpu" ? 3 : 1); rep++) {
        const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        await p.goto(`${base}/proto.html?variant=${v}&mode=${mode}&dash=0&stress=${stress}`);
        await p.waitForFunction(() => document.title === "done", null, { timeout: 900000 });
        const r = await p.evaluate(() => window.__result);
        rows.push(r.perf);
        await p.close();
    }
    const med = (k) =>
        rows
            .map((r) => r[k])
            .sort((a, b) => a - b)
            [Math.floor(rows.length / 2)].toFixed(2);
    console.log(
        backend,
        stress,
        key,
        "update",
        med("updateMs"),
        "moving",
        med("renderMovingMs"),
        "still",
        med("renderStillMs"),
        "draws",
        rows[0].drawCalls,
    );
}
await browser.close();
