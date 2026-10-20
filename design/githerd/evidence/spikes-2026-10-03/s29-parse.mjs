// S29: do the real reject comments match githerd's marker test (lib/prs.mjs), and does the
// block parse as JSON with the escaped "--" restored?
import { readFileSync, readdirSync } from "node:fs";
const marker = /<!--\s*visual-review-rejects\b/; // what prs.mjs builds from the configured marker
for (const f of readdirSync(".").filter((n) => n.startsWith("s29-comment-")).sort()) {
    const body = readFileSync(f, "utf8");
    const m = body.match(/<!--\s*visual-review-rejects\s*\n([\s\S]*?)\n-->/);
    const block = m ? JSON.parse(m[1]) : null;
    console.log(`${f}: marker ${marker.test(body)}; block ${block ? "parsed" : "MISSING"}; ` +
        (block ? `pr=${block.pr ?? "-"} items=${block.items.length} commit=${block.commit ?? "none"} ` +
        `files=${block.items.map((i) => i.file).slice(0, 2).join(" ")}` : ""));
}
