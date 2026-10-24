import { c as i, B as m } from "./index-B5Ke6Umr.js";
import "./index-hDuyXkBS.js";
import "./preload-helper-BXl3LOEh.js";
import "./label-style-DGSNp8RO.js";
import "./babylon-EA5yuCz0.js";
async function l(o, e) {
    let t;
    try {
        t = i(o, e);
    } catch (a) {
        return { supported: !1, reason: a instanceof Error ? a.message : "Invalid dimensions", estimatedMemoryMB: 0 };
    }
    const n = t.width * t.height,
        r = (n * 4) / (1024 * 1024),
        s = [];
    return e.format === "webp" && !(await c())
        ? { supported: !1, reason: "WebP format not supported in this browser", estimatedMemoryMB: r }
        : (n >= m.WARN_PIXELS && s.push(`Large screenshot (${(n / 1e6).toFixed(1)}MP) may fail on some devices`),
          r > 100 && s.push(`High memory usage (~${r.toFixed(0)}MB) - may cause performance issues`),
          { supported: !0, warnings: s.length > 0 ? s : void 0, estimatedMemoryMB: r });
}
async function c() {
    return new Promise((o) => {
        const e = document.createElement("canvas");
        ((e.width = 1),
            (e.height = 1),
            e.toBlob((t) => {
                o(t !== null && t.type === "image/webp");
            }, "image/webp"));
    });
}
export { l as canCaptureScreenshot };
//# sourceMappingURL=capability-check-CjcFPIOk.js.map
