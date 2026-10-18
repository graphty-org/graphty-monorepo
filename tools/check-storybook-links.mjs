#!/usr/bin/env node
// Every Storybook deep link in the repository (https://graphty.app/storybook/<name>/?path=/story/<id>,
// or /docs/<id>) must name an entry of that Storybook's index.json in the built site. A renamed story
// or a renamed export changes the id, and Storybook answers the old link with a 200 and a
// "Couldn't find story" page, so no HTTP check can see it. A link to a story hidden from the sidebar
// (a story without the `dev` tag: a regression or internal story) fails too: the page still draws it,
// but the reader lands on a story with no sidebar entry and nothing around it to explore
// (design/storybook/strategy.md, "Deep links").
//
// Usage: node tools/check-storybook-links.mjs <site-dir>   (run by tools/check-links.sh --site)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const site = process.argv[2];
if (!site) {
    console.error("usage: node tools/check-storybook-links.mjs <site-dir>");
    process.exit(2);
}

const pattern = String.raw`graphty\.app/storybook/[a-z-]+/\?path=/(story|docs)/[A-Za-z0-9_-]+`;
let grep = "";
try {
    grep = execFileSync("git", ["grep", "-noE", pattern, "--", ".", ":!design", ":!*CHANGELOG.md"], {
        encoding: "utf8",
    });
} catch (e) {
    if (e.status !== 1) throw e; // 1 = no matches
}

const indexes = new Map();
function entriesOf(name) {
    if (!indexes.has(name)) {
        const file = join(site, "storybook", name, "index.json");
        indexes.set(
            name,
            existsSync(file) ? new Map(Object.entries(JSON.parse(readFileSync(file, "utf8")).entries)) : null,
        );
    }
    return indexes.get(name);
}

let dead = 0;
let checked = 0;
for (const line of grep.split("\n").filter(Boolean)) {
    const [file, lineNo, match] = line.split(/:(\d+):/);
    const [, name, id] = match.match(/storybook\/([a-z-]+)\/\?path=\/(?:story|docs)\/(.+)$/);
    const entries = entriesOf(name);
    checked++;
    if (!entries) {
        console.log(`${file}:${lineNo}: no Storybook is published at /storybook/${name}/`);
        dead++;
    } else if (!entries.has(id)) {
        console.log(`${file}:${lineNo}: /storybook/${name}/ has no story "${id}"`);
        dead++;
    } else if (entries.get(id).type === "story" && !(entries.get(id).tags ?? []).includes("dev")) {
        console.log(`${file}:${lineNo}: /storybook/${name}/ "${id}" links to a hidden story; link a visible one`);
        dead++;
    }
}
console.log(`Storybook deep links: ${checked} checked, ${dead} dead`);
process.exit(dead ? 1 : 0);
