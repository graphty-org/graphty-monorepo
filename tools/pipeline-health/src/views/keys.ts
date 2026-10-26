// The table keys of the precomputed page items (design section 10.3): one gzipped JSON item per view and range.
// writeViews() writes them and the read handler reads them, both through viewKey(), so the format lives here only.
//
//   PAGE#status#now                          GET /v1/status
//   PAGE#<page>#<range>                      GET /v1/page/<page>?range=<range>            (overview too)
//   PAGE#<page>/<section>#<range>[#<kind>]   GET /v1/page/<page>/<section>?range=<range>[&kind=<kind>]

import type { PageId, Range, SlowRange } from "../../web/src/contract.js";
import type { Key } from "../model/store.js";

export type ViewRoute =
    | { kind: "status" }
    | { kind: "page"; page: PageId; range: Range | SlowRange }
    | { kind: "section"; page: Exclude<PageId, "overview">; section: string; range: SlowRange; runKind?: string };

/**
 * The item key of one view, the same route union apiPath() takes (without the drill-downs, which read raw items).
 * @param r
 */
export function viewKey(r: ViewRoute): Key {
    switch (r.kind) {
        case "status":
            return { pk: "PAGE#status#now", sk: "-" };
        case "page":
            return { pk: `PAGE#${r.page}#${r.range}`, sk: "-" };
        case "section":
            return { pk: `PAGE#${r.page}/${r.section}#${r.range}${r.runKind ? `#${r.runKind}` : ""}`, sk: "-" };
    }
}
