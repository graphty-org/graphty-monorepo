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
