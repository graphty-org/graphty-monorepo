/**
 * @file The "Drafts and preview" example of docs/guide/experiments.md, compiled against the
 * published declarations with no cast. Nothing here runs; `tsconfig.strict-consumer.json` checks it
 * against `dist/`. `test/session/source-steps/drafts-founding.test.ts` runs it.
 */

import { createGraphSession, type SourceDraft } from "@graphty/graphty-element/session";

/**
 * The guide's example: door entries joined to people by badge in a draft, previewed and committed.
 * @param peopleCsv - the people file
 * @param entriesCsv - the door entries file
 */
export async function sourceDrafts(
    peopleCsv: { type: string; config: { data: string } },
    entriesCsv: { type: string; config: { data: string } },
): Promise<void> {
    const session = createGraphSession({ features: ["source-steps"] });
    const people = await session.data.stage(peopleCsv, { key: "badge", type: "person" });
    await session.data.add(people);
    const entries = await session.data.stage(entriesCsv, { key: "entry", type: "entry" });

    const draft = session.data.draft();
    const byBadge = { from: { source: entries, field: "badge" }, into: { source: people } };
    draft.matchCounts(byBadge); // { matched, only1, only2, repeated1, repeated2, ... }
    draft.connect({ ...byBadge, edgeType: "entered" });

    const preview = draft.preview();
    console.log(preview.after.edges - preview.before.edges); // edges the commit adds
    await draft.commit(); // one undo step: Undo puts the entries back to staged
}

/**
 * The guide's join options: door entries read as edges, folded into the edges already there, then
 * kept as nodes between their two ends.
 * @param draft - the open draft
 * @param doorsCsv - the door entries file
 */
export async function sourceJoinOptions(
    draft: SourceDraft,
    doorsCsv: { type: string; config: { data: string } },
): Promise<void> {
    const doors = await draft.stage(doorsCsv, { edges: { from: { column: "person" }, to: { column: "bldg" } } });
    const ends = {
        from: { source: doors, field: "person" },
        into: { space: "person" },
        to: { field: "bldg", into: { space: "building" } },
    };
    draft.connect({ ...ends, existing: "merge" }); // one edge per entry, or the edge already there
    const at = draft.steps().length - 1;
    draft.replaceStep(at, { act: "connect", options: { ...ends, to: { ...ends.to, keepRow: true } } });
    console.log(draft.steps()[at]?.act?.to?.keepRow); // true: each entry is a node between a person and a building
}

/**
 * The guide's new nodes at a Connect's other end, and the whole join taken back.
 * @param draft - the open draft
 * @param doors - the staged door entries
 */
export function sourceNewEnd(draft: SourceDraft, doors: string): void {
    draft.connect({
        from: { source: doors, field: "person" },
        into: { space: "person" },
        to: { field: "bldg", into: { space: "building" }, unmatched: "add", type: "building" },
    }); // an edge from each person to a node per building, unknown people left out
    draft.removeStep(draft.steps().length - 1, { adds: "remove" }); // the whole join taken back
    console.log(draft.profile({ space: "person", field: "dept" }).distinct);
}

/**
 * The guide's shared values and columns into nodes: accounts linked by a phone or a device, and their
 * tags and branches made nodes.
 * @param draft - the open draft
 * @param accountsCsv - the accounts file
 */
export async function sourceSharedValues(
    draft: SourceDraft,
    accountsCsv: { type: string; config: { data: string } },
): Promise<void> {
    const accounts = await draft.stage(accountsCsv, { key: "account", type: "account" });
    draft.link({ source: accounts, columns: ["phone", "device"], maxShared: 5 });
    draft.extract(accounts, { column: "tags", split: ";", type: "tag" });
    draft.extract(accounts, { column: "branch_id", type: "branch", columns: ["branch_name"] });
    const step = draft.steps().find((row) => row.link !== null);
    if (step?.link) {
        draft.replaceStep(step.index, { act: "link", options: { ...step.link, minShared: 2 } });
        console.log(draft.steps()[step.index]?.buckets?.newEdges); // pairs sharing two values
    }
}

/**
 * The guide's columns a space carries: a watchlist matched on the device list an earlier merge brought.
 * @param draft - the open draft
 * @param ids - the identifiers, staged
 * @param watchlistCsv - the watchlist file
 */
export async function sourceMergedColumns(
    draft: SourceDraft,
    ids: string,
    watchlistCsv: { type: string; config: { data: string } },
): Promise<void> {
    draft.merge({ from: { source: ids, field: "account" }, into: { space: "account" }, aggregate: { "*": "list" } });
    console.log(draft.columns("account")); // [..., { name: "device", kind: "list", filled: 63 }]
    const watch = await draft.stage(watchlistCsv, { key: "value" });
    const onDevice = { from: { source: watch, field: "value" }, into: { space: "account", field: "device" } };
    console.log(draft.matchCounts(onDevice).matched); // watchlist values some account's device list holds
    draft.merge({ ...onDevice, unmatchedFrom: "drop" });
    draft.link({ source: ids, nodes: "account", columns: ["device"] }); // accounts sharing a device
}
