// Screenshots one mock screen at 1440 x 960 (900 frame + 60 caption).
// Usage: node design/ui/object-first-ux/gen/shoot-screen.mjs <n>
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const n = process.argv[2] || "1";
const dir = fileURLToPath(new URL("../mocks", import.meta.url));
const browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("pageerror:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.error("console:", m.text()); });
await page.goto(`file://${dir}/screen-${n}.html`);
await page.waitForTimeout(300);
await page.screenshot({ path: `${dir}/screen-${n}.png` });
const m = await page.evaluate(() => {
  const box = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
  return {
    app: box(".k-app"), left: box(".k-panel-left"), right: box(".k-panel-right"), canvas: box(".k-canvas"),
    toolbar: box(".k-toolbar"), welcome: box(".k-welcome"), dropzone: box(".k-dropzone"), statusbar: box(".k-statusbar"),
    fileHeader: box(".k-panel-file"), listRow: box(".k-list-row"), mode: box(".k-mode"),
    overflowX: document.documentElement.scrollWidth, overflowY: document.documentElement.scrollHeight,
  };
});
console.log(JSON.stringify(m));
await browser.close();
