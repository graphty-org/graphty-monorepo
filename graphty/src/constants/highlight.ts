/**
 * The colour the app paints routes and chosen sets in: a shortest path's nodes and edges, and
 * every highlight a finished run paints by itself. Handed to graphty-element once per session
 * with `session.styles.setHighlightColor`; the element's own default stays its neutral indigo.
 *
 * Black, measured on the app's own screenshots as lit nodes: a route's nodes sit Delta E 50 and
 * 3.0:1 from the default nodes on an unranked drawing (the element's indigo: 19.5 and 2.1:1,
 * which study participants took for ordinary nodes), and Delta E 44 to 50 over PageRank's
 * colours. The cost: black is also the seventh colour of the default group palette, so on a
 * drawing of seven or more groups the thick route edges are what tell the route apart.
 */
export const APP_HIGHLIGHT_COLOR = "#000000";
