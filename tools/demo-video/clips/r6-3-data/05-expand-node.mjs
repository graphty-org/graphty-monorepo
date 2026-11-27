// Chapter 8, Data management: Tom Hanks and his 12 films, read from Neo4j's public movies demo
// database with a Cypher query in setup; the hand right-clicks The Green Mile, Expand..., Expand, and
// its cast and director stream in from the server (13 nodes to 21). Needs the internet
// (demo.neo4jlabs.com). The demo's read-only login is Neo4j's published one (movies / movies), typed
// in setup into the masked Password field; no secret from .env.
//
// Not Wikidata: a SPARQL Expand asks for every triple of the node, ordered, which Wikidata does not
// answer for a country in under 20 s, and the Expand dialog's Edge types are not used in that query
// (reported as app defects).
//
// After the expand the hand clicks empty canvas: the inspector's overview counts the 21 nodes, and the
// click clears the dark focus outline the closing dialog leaves on the canvas. The left panel shows the
// Graph place, not Data: the Data place's source still counts 13 nodes after an expand (an app
// defect). The expand frames the grown graph to the whole canvas, under the toolbar, so the hand
// zooms out one notch.
import { inspector } from "../r2-5b-and-more/more.js";
import { counted, networkForm, nodeWhere } from "./data.js";

/** Empty canvas at the lower right, off the grown graph, in page coordinates. */
const EMPTY = { x: 1480, y: 860, width: 80, height: 50 };

const DEMO = "movies"; // Neo4j's public demo: database, user and password are all "movies"

export default {
    id: "data-expand-node",
    chapter: 8,
    caption: "Expand a node from the server",
    async setup(h) {
        const { page } = h;
        const form = await networkForm(h, "Neo4j");
        await form.getByRole("textbox", { name: "Endpoint" }).fill("https://demo.neo4jlabs.com:7473/");
        await form.getByRole("textbox", { name: "User" }).fill(DEMO);
        await form.getByRole("textbox", { name: "Password" }).fill(DEMO);
        await form.getByRole("textbox", { name: "Database" }).fill(DEMO);
        await form
            .getByRole("textbox", { name: "Query" })
            .fill("MATCH (p:Person {name: 'Tom Hanks'})-[r]->(m) RETURN p, r, m LIMIT 25");
        await form.getByRole("button", { name: "Load" }).click();
        await counted(h);
        await h.app.closeToast();
        await h.app.ready2D();
        await page.getByRole("button", { name: "Graph", exact: true }).click();
        await h.park({ x: 1180, y: 900 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await h.rightClick(await nodeWhere(h, "title", "The Green Mile"));
        await h.click(page.getByRole("menuitem", { name: "Expand..." }));
        const dialog = page.getByRole("dialog", { name: "Expand" });
        await h.click(dialog.getByRole("button", { name: "Expand", exact: true }));
        h.mark("expand");
        await h.waitFor(page.getByText(/\b21 nodes, \d+ edges\b/).first());
        await dialog.waitFor({ state: "hidden" }); // it closes itself once the nodes are in
        await h.app.settled();
        await h.click(EMPTY);
        await h.waitFor(inspector(page).getByText("Overview", { exact: true }));
        await h.scroll(EMPTY, 100, { ms: 500 });
        await h.app.settled();
        h.mark("expanded");
    },
    holdMs: 2000,
};
