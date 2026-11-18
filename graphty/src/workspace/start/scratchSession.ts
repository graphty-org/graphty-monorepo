/**
 * graphty-element's session constructor, reached only by a dynamic import (`openNetworkSample` in
 * open.ts) so that GraphSession and what it imports stay out of the start page's first load.
 */
export { createGraphSession } from "@graphty/graphty-element/session";
