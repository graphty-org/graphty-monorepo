/**
 * @file The "Drafts and preview" example of docs/guide/experiments.md, compiled against the
 * published declarations with no cast. Nothing here runs; `tsconfig.strict-consumer.json` checks it
 * against `dist/`. `test/session/source-steps/drafts-founding.test.ts` runs it.
 */

import { createGraphSession } from "@graphty/graphty-element/session";

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
