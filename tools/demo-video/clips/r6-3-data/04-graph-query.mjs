// Chapter 8, Data management: Open network data > SPARQL endpoint, Wikidata's public endpoint set in
// setup; the hand pastes a query (Europe's countries and the countries they border, with their
// English names), clicks Load, and the network is drawn. Needs the internet (query.wikidata.org).
import { counted, networkForm, REST } from "./data.js";

const ENDPOINT = "https://query.wikidata.org/sparql";
const QUERY =
    "CONSTRUCT { ?a wdt:P47 ?b . ?a rdfs:label ?l } WHERE { ?a wdt:P30 wd:Q46; wdt:P31 wd:Q3624078; " +
    'wdt:P47 ?b; rdfs:label ?l . ?b wdt:P31 wd:Q3624078 . FILTER(lang(?l) = "en") }';

export default {
    id: "data-graph-query",
    chapter: 8,
    caption: "Query a graph database",
    async setup(h) {
        const form = await networkForm(h, "SPARQL");
        await form.getByRole("textbox", { name: "Endpoint" }).fill(ENDPOINT);
        await form.getByRole("textbox", { name: "Query" }).fill("");
        await h.park({ x: 1180, y: 900 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        const form = page.getByRole("dialog", { name: "Network data" });
        const query = form.getByRole("textbox", { name: "Query" });
        await h.click(query);
        await h.paste(QUERY, { near: query });
        await h.click(form.getByRole("button", { name: "Load" }));
        h.mark("load");
        await h.move(REST);
        await counted(h);
        await h.app.settled();
        h.mark("drawn");
    },
    holdMs: 2000,
};
