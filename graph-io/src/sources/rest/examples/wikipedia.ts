/**
 * An example mapping: the articles one English Wikipedia article links to, from the MediaWiki
 * Action API (https://www.mediawiki.org/wiki/API:Links). `origin=*` makes the API answer a
 * browser's anonymous cross-origin request. Catalog data for the `rest` source's examples.
 */

import { type RestMapping } from "../params.js";

/** The Wikipedia links mapping: `title`, the article's title ("Eulerian path"); a redirect is followed. */
export const WIKIPEDIA_MAPPING: RestMapping = Object.freeze<RestMapping>({
    version: 1,
    endpoint: "https://en.wikipedia.org",
    load: "links",
    directed: true,
    requests: {
        // ponytail: one page of up to 500 links; MediaWiki's continuation needs a cursor the first page leaves out
        links: {
            path: "/w/api.php",
            query: {
                action: "query",
                format: "json",
                formatversion: "2",
                origin: "*",
                prop: "links",
                plnamespace: "0",
                pllimit: "max",
                redirects: "1",
                titles: "{title}",
            },
            records: "query.pages",
            entity: "page",
        },
    },
    entities: {
        page: {
            id: "title",
            fields: { pageid: "pageid" },
            edges: [{ each: "links[]", to: "title", type: "links_to", entity: "page" }],
        },
    },
});
