/**
 * Every shader idea in the lab as a card, from manifest.json. A card links to its story when one
 * exists (found by the manifest's story id, or by a story titled with the idea's name).
 */
import manifest from "./manifest.json";

export default { title: "Shader Lab/Overview", tags: ["!autodocs"], parameters: { layout: "fullscreen" } };

interface Idea {
    slug: string;
    name: string;
    category: string;
    purpose: string;
    wow: number;
    what: string;
    status: string;
    story: string | null;
}

interface IndexEntry {
    id: string;
    title: string;
    type: string;
}

const CATEGORY_COLORS: Record<string, string> = {
    node: "#4e79a7",
    "node-effect": "#76b7b2",
    edge: "#f28e2b",
    "edge-effect": "#edc948",
    "whole-graph": "#b07aa1",
};

const STYLE = `
.lab-ov { font: 14px/1.45 system-ui, sans-serif; color: #e8e8ee; background: #0b0d14; min-height: 100vh; padding: 24px 32px; box-sizing: border-box; }
.lab-ov h1 { font-size: 24px; margin: 0 0 4px; }
.lab-ov .sub { color: #9aa0b4; margin: 0 0 16px; }
.lab-ov .filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.lab-ov .filters button { background: #1b1f2c; color: #ccd; border: 1px solid #2c3246; border-radius: 14px; padding: 3px 12px; cursor: pointer; font: inherit; font-size: 13px; }
.lab-ov .filters button.on { background: #3b4766; color: #fff; border-color: #5a6a94; }
.lab-ov h2 { font-size: 17px; margin: 28px 0 10px; color: #cfd6ee; }
.lab-ov .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.lab-ov .card { display: block; text-decoration: none; color: inherit; background: #151926; border: 1px solid #262c3e; border-radius: 8px; padding: 12px 14px; }
.lab-ov a.card:hover { border-color: #6b7cff; background: #1a2033; }
.lab-ov .card.planned { opacity: 0.6; }
.lab-ov .name { font-weight: 600; font-size: 15px; margin-bottom: 6px; }
.lab-ov .tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; font-size: 11px; }
.lab-ov .tag { padding: 1px 7px; border-radius: 9px; background: #262c3e; color: #dde; }
.lab-ov .what { color: #aab1c6; font-size: 13px; }
.lab-ov .wow { color: #ffd166; letter-spacing: 1px; }
`;

function render(): HTMLElement {
    const root = document.createElement("div");
    root.className = "lab-ov";
    const style = document.createElement("style");
    style.textContent = STYLE;
    root.appendChild(style);

    const batches = manifest.batches as { id: string; title: string; ideas: Idea[] }[];
    const total = batches.reduce((s, b) => s + b.ideas.length, 0);
    const head = document.createElement("div");
    head.innerHTML = `<h1>Shader Lab</h1><p class="sub">${total} shader ideas for drawing nodes and edges and adding effects. Hover a node in any story to highlight it, click to select it. Cards with a story are links; faded cards are not built yet.</p>`;
    root.appendChild(head);

    const filters = document.createElement("div");
    filters.className = "filters";
    root.appendChild(filters);
    const body = document.createElement("div");
    root.appendChild(body);

    let filter = "all";
    let stories: IndexEntry[] = [];
    const storyFor = (idea: Idea): string | undefined => {
        if (idea.story && stories.some((s) => s.id === idea.story)) {
            return idea.story;
        }
        const name = idea.name.toLowerCase();
        return stories.find((s) => s.title.toLowerCase().endsWith(`/${name}`))?.id;
    };

    const draw = (): void => {
        filters.replaceChildren();
        for (const f of [
            "all",
            "built",
            "node",
            "node-effect",
            "edge",
            "edge-effect",
            "whole-graph",
            "practical",
            "aesthetic",
            "wow 5",
        ]) {
            const b = document.createElement("button");
            b.textContent = f;
            b.className = f === filter ? "on" : "";
            b.onclick = () => {
                filter = f;
                draw();
            };
            filters.appendChild(b);
        }
        body.replaceChildren();
        for (const batch of batches) {
            const ideas = batch.ideas.filter((idea) => {
                if (filter === "all") {
                    return true;
                }
                if (filter === "built") {
                    return storyFor(idea) !== undefined;
                }
                if (filter === "wow 5") {
                    return idea.wow >= 5;
                }
                if (filter === "practical" || filter === "aesthetic") {
                    return idea.purpose === filter || idea.purpose === "both";
                }
                return idea.category === filter;
            });
            if (ideas.length === 0) {
                continue;
            }
            const h = document.createElement("h2");
            h.textContent = `${batch.title} (${ideas.length})`;
            body.appendChild(h);
            const grid = document.createElement("div");
            grid.className = "grid";
            for (const idea of ideas) {
                const id = storyFor(idea);
                const card = document.createElement(id ? "a" : "div");
                card.className = `card${id ? "" : " planned"}`;
                if (id && card instanceof HTMLAnchorElement) {
                    card.href = `/?path=/story/${id}`;
                    card.target = "_top";
                }
                const name = document.createElement("div");
                name.className = "name";
                name.textContent = idea.name;
                const tags = document.createElement("div");
                tags.className = "tags";
                const cat = document.createElement("span");
                cat.className = "tag";
                cat.style.background = CATEGORY_COLORS[idea.category] ?? "#262c3e";
                cat.style.color = "#fff";
                cat.textContent = idea.category;
                const purpose = document.createElement("span");
                purpose.className = "tag";
                purpose.textContent = idea.purpose;
                const wow = document.createElement("span");
                wow.className = "tag wow";
                wow.textContent = `wow ${"*".repeat(idea.wow)}`;
                const status = document.createElement("span");
                status.className = "tag";
                status.textContent = id ? "built" : idea.status;
                tags.append(cat, purpose, wow, status);
                const what = document.createElement("div");
                what.className = "what";
                what.textContent = idea.what;
                card.append(name, tags, what);
                grid.appendChild(card);
            }
            body.appendChild(grid);
        }
    };
    draw();
    // the live story list, so a card links to a story as soon as it exists
    fetch("/index.json")
        .then(async (r) => r.json())
        .then((index: { entries: Record<string, IndexEntry> }) => {
            stories = Object.values(index.entries).filter((e) => e.type === "story" && e.id.startsWith("shader-lab-"));
            draw();
        })
        .catch(() => undefined);
    return root;
}

export const Overview = { render };
