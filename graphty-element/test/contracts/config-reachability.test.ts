/**
 * @file Every field a node or edge style declares is either reachable from a style channel, or
 * named in `src/catalog/unreachable.ts` with the reason it is not.
 *
 * WHY THIS EXISTS. `EdgeStyle` has declared `arrowHead.size`, `arrowHead.color` and
 * `arrowHead.opacity` since 1.x, with defaults, and the renderer honours all three --
 * `Edge.ts` reads `style.arrowHead?.size ?? 1.0` to size the cap. The 2.0 channel set publishes
 * `edge.arrowHead` as the cap TYPE and nothing else, so a consumer cannot set any of them. The
 * capability is built, drawn, tested, and has no door. Three separate agents noticed across three
 * days; none of them could turn the observation into anything a gate would read, so 2.0 was very
 * nearly cut with the regression in it.
 *
 * That is a mechanically checkable defect and this is the check: a field with no channel, or a
 * channel whose field stopped existing, is a red test naming the field.
 *
 * THE REACHABLE SET IS DERIVED BY PAINTING, NOT RESTATED. A list of "channels and the fields
 * they write" copied into this file would be a second source of truth, and the first thing it
 * would do is drift from the painter -- which is the exact failure the channel table's own header
 * warns about for the node shape enum. So each renderable channel is painted through the REAL
 * `StylePainter` twice, with two different values, and the style leaves that differ between the
 * two runs are the leaves that channel reaches. A channel that cannot change a field does not
 * reach it, whatever any table says.
 *
 * Two consequences of deriving it that way, both deliberate:
 *
 * - `texture.color.colorType` and `texture.color.value` come out UNREACHABLE even though the
 *   painter writes both. It pins them to a neutral solid so a node's per-instance colour can
 *   show, so no channel can change them -- which is precisely why a gradient node fill cannot
 *   survive the paint path, and precisely the kind of thing a restated list would have hidden.
 * - `node.color` writes nothing into the style at all; its value is diverted into
 *   `NodePaint.color`, beside the style, so that one material is not minted per colour. The run
 *   below sees that divergence in the paint and credits the channel's declared `stylePath` with
 *   it, rather than this file knowing the name "node.color".
 *
 * THE WAIVER LIST IS PUBLISHED, in the shape this package already uses twice: `UNSERVED_LAYOUT_IDS`
 * and `UNSERVED_FORMAT_IDS` name the capabilities the element does NOT serve, each with a reason,
 * "rather than left for a consumer to discover by asking for a layout that never answers, or by
 * never learning a capability exists". A style field with no channel is the same thing and was the
 * one surface where it was never written down.
 *
 * BOTH DIRECTIONS. A waiver that names a field which no longer exists, or a field that has since
 * been given a channel, fails too -- so a waiver cannot outlive the gap it describes and quietly
 * tell the next reader that a working capability is missing.
 *
 * NO BROWSER AND NO RENDERER. Zod schemas, one channel table and the painter, all of which are
 * Babylon-free by the package's own entry-point rule. It runs in the `default` project, which is
 * the pre-push gate and the `graphty-element-default` CI shard.
 */

import { assert, describe, it } from "vitest";
import { z } from "zod/v4";

import { LABEL_STYLE_FIELDS } from "../../src/catalog/label-style";
import type { Channel } from "../../src/catalog/types";
import { UNREACHABLE_STYLE_FIELDS } from "../../src/catalog/unreachable";
import { EdgeStyle } from "../../src/config/EdgeStyle";
import { NodeStyle } from "../../src/config/NodeStyle";
import { StylePainter } from "../../src/managers/StylePainter";
import { CHANNEL_DESCRIPTORS, type ChannelDescriptor, toColorValue } from "../../src/session/styles/channels";
import type { ElementPaint, ResolvedStyle } from "../../src/session/styles/repaint";

/** One node of the JSON Schema Zod emits, in the shape this walk reads it. */
interface SchemaNode {
    properties?: Record<string, SchemaNode>;
    anyOf?: SchemaNode[];
    oneOf?: SchemaNode[];
}

/**
 * The alternative shapes one schema node can take, with nested unions flattened away.
 *
 * A union arm that is an object contributes its own fields; an arm that is a scalar makes the
 * union itself a settable leaf. `NodeStyle.texture.color` is both -- a colour string, or an
 * advanced colour object -- and both halves are real surfaces a consumer could be given.
 * @param node - The schema node.
 * @returns Its arms, or the node itself when it is not a union.
 */
function shapesOf(node: SchemaNode): SchemaNode[] {
    const arms = node.anyOf ?? node.oneOf;

    return Array.isArray(arms) ? arms.flatMap(shapesOf) : [node];
}

/**
 * Walk a schema to its settable leaves, as dotted paths.
 * @param node - The schema node to walk.
 * @param prefix - The path so far.
 * @param found - Where to collect the leaves.
 */
function schemaLeaves(node: SchemaNode, prefix: string, found: Set<string>): void {
    for (const shape of shapesOf(node)) {
        if (shape.properties !== undefined) {
            for (const [name, child] of Object.entries(shape.properties)) {
                schemaLeaves(child, prefix === "" ? name : `${prefix}.${name}`, found);
            }
        } else if (prefix !== "") {
            found.add(prefix);
        }
    }
}

/**
 * Walk a painted style to its leaves, as dotted paths against their values.
 * @param value - The value at this path.
 * @param prefix - The path so far.
 * @param found - Where to collect path against serialised value.
 */
function paintedLeaves(value: unknown, prefix: string, found: Map<string, string>): void {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        for (const [name, child] of Object.entries(value)) {
            paintedLeaves(child, prefix === "" ? name : `${prefix}.${name}`, found);
        }

        return;
    }

    if (prefix !== "") {
        found.set(prefix, JSON.stringify(value));
    }
}

/**
 * A painter bound to a stack that painted exactly one channel.
 *
 * The stub is the whole of `ElementPaint` the painter touches: the resolved style and the mesh
 * key that `StylePainter.nodePaint` and `edgePaint` read, plus the announcement it subscribes to
 * when it binds -- a pass tells the renderer what it painted while its dirty set is still its
 * own, and a stub that could not be subscribed to would be a paint surface no renderer can bind
 * to. Nothing here reaches a renderer, which is what lets the real painter run in Node.
 * @param style - The channels the imaginary pass resolved.
 * @returns A painter bound to it.
 */
function painterOf(style: ResolvedStyle): StylePainter {
    const painter = new StylePainter();
    const stub: Pick<
        ElementPaint,
        "styleOf" | "meshKeyOf" | "meshCount" | "lastPainted" | "onPainted" | "problems"
    > = {
        styleOf: () => style,
        meshKeyOf: () => 1,
        meshCount: () => 1,
        lastPainted: () => [],
        onPainted: () => () => undefined,
        problems: () => [],
    };

    painter.bind(stub as ElementPaint);

    return painter;
}

/**
 * A label style with every field the vocabulary publishes set to a value of this run's own.
 *
 * DRIVEN BY `LABEL_STYLE_FIELDS`, which is `Object.keys` over an object literal declared
 * `satisfies Record<keyof LabelStyle, 0>` -- so a field added to the published vocabulary is in
 * this probe with no edit here, and a field removed from it cannot be probed for. That is what
 * makes the reachable set below derived rather than restated: the only list of label fields in
 * the package is the one the interface itself keeps.
 *
 * THE VALUES ARE NONSENSE ON PURPOSE. Nothing between here and the paint parses them -- the
 * painter translates names and `defaultsDeep` fills the gaps -- and what is being measured is
 * only whether a field FOLLOWED the channel. A well-typed value would measure the same thing and
 * hide, behind a plausible-looking literal, a field whose probe happened to equal its default.
 * @param run - Which of the two probe runs this is.
 * @returns The probe.
 */
function labelProbe(run: 0 | 1): Record<string, string> {
    const probe: Record<string, string> = {};

    for (const field of LABEL_STYLE_FIELDS) {
        probe[field] = `probe-${String(run)}-${field}`;
    }

    return probe;
}

/**
 * Two different values a channel accepts, so that what changes between them can be measured.
 * @param descriptor - The channel.
 * @param run - Which of the two probe runs this is.
 * @returns A value inside whatever bounds the channel declares.
 */
function probeValue(descriptor: ChannelDescriptor, run: 0 | 1): unknown {
    switch (descriptor.accepts) {
        case "color":
            return toColorValue(run === 0 ? "#123456" : "#abcdef");
        case "number": {
            const low = descriptor.min ?? 0;
            const high = descriptor.max ?? low + 10;

            return run === 0 ? low + (high - low) * 0.25 : low + (high - low) * 0.75;
        }
        case "text":
            return run === 0 ? "probe-one" : "probe-two";
        case "boolean":
            return run === 0;
        case "enum": {
            const values = descriptor.values ?? [];

            return values[run === 0 ? 0 : values.length - 1];
        }
        case "labelStyle":
            return labelProbe(run);
        default:
            return undefined;
    }
}

/**
 * Which style leaves one channel can change.
 * @param descriptor - The channel to paint.
 * @returns The dotted paths whose value followed the channel's.
 */
function reachedBy(descriptor: ChannelDescriptor): Set<string> {
    const reached = new Set<string>();

    if (!descriptor.renderable) {
        return reached;
    }

    const runs = ([0, 1] as const).map((run) => {
        const painter = painterOf({ [descriptor.channel]: probeValue(descriptor, run) } as ResolvedStyle);
        const paint = descriptor.target === "node" ? painter.nodePaint(0) : painter.edgePaint(0);

        assert.isNotNull(paint, `the painter returned no paint for ${descriptor.channel}`);

        const leaves = new Map<string, string>();
        paintedLeaves(paint.style, "", leaves);

        return { leaves, beside: JSON.stringify("color" in paint ? paint.color : null) };
    });

    for (const [path, value] of runs[0].leaves) {
        if (runs[1].leaves.get(path) !== value) {
            reached.add(path);
        }
    }

    for (const [path, value] of runs[1].leaves) {
        if (runs[0].leaves.get(path) !== value) {
            reached.add(path);
        }
    }

    // The value went beside the style rather than into it, which is what the node colour does so
    // that one material is not minted per colour. Credit the field the channel declares.
    if (runs[0].beside !== runs[1].beside) {
        reached.add(descriptor.stylePath);
    }

    // `writeChannel` switches a label, a tooltip or an arrow caption on whenever a layer writes
    // its words, so the flag follows the text channel and cannot be seen by comparing two
    // different texts. It is the flag beside the WORDS -- `arrowHead.text.enabled` for a caption
    // whose words land in `arrowHead.text.text` -- which is what the painter writes.
    if (descriptor.accepts === "text") {
        reached.add(`${descriptor.stylePath.split(".").slice(0, -1).join(".")}.enabled`);
    }

    return reached;
}

/** One schema, and the channels that paint the thing it describes. */
const SCHEMAS = [
    { target: "node" as const, name: "NodeStyle", schema: NodeStyle },
    { target: "edge" as const, name: "EdgeStyle", schema: EdgeStyle },
];

describe("what a style channel can reach", () => {
    const measured = SCHEMAS.map(({ target, name, schema }) => {
        const leaves = new Set<string>();
        schemaLeaves(z.toJSONSchema(schema, { io: "input" }) as SchemaNode, "", leaves);

        const reachable = new Set<string>();

        for (const channel of Object.keys(CHANNEL_DESCRIPTORS) as Channel[]) {
            const descriptor = CHANNEL_DESCRIPTORS[channel];

            if (descriptor.target !== target) {
                continue;
            }

            for (const path of reachedBy(descriptor)) {
                reachable.add(path);
            }
        }

        const waived = new Map(
            UNREACHABLE_STYLE_FIELDS.filter((field) => field.target === target).map((field) => [field.path, field]),
        );

        return { target, name, leaves, reachable, waived };
    });

    it("drives the painter's own label translation, so the label fields are derived and not restated", () => {
        const labelChannels = Object.values(CHANNEL_DESCRIPTORS).filter(
            (descriptor) => descriptor.accepts === "labelStyle" && descriptor.renderable,
        );

        assert.isAbove(
            LABEL_STYLE_FIELDS.length,
            0,
            `The published label vocabulary is empty, so every label field would be reported ` +
                `unreachable whether it is or not.`,
        );

        for (const descriptor of labelChannels) {
            assert.isAbove(
                reachedBy(descriptor).size,
                1,
                `${descriptor.channel} paints nothing the probe can see. The painter's ` +
                    `translation from the published label vocabulary to the renderer's rich-text ` +
                    `fields has changed shape -- teach the probe in this file to drive the new ` +
                    `shape rather than accepting the waivers it would otherwise produce, which ` +
                    `would silently declare the whole label block unreachable.`,
            );
        }
    });

    for (const { name, leaves, reachable, waived } of measured) {
        describe(name, () => {
            it("reaches every field, or says in src/catalog/unreachable.ts why it cannot", () => {
                const unexplained = [...leaves].filter((leaf) => !reachable.has(leaf) && !waived.has(leaf)).sort();

                assert.deepEqual(
                    unexplained,
                    [],
                    `${name} declares these fields and no style channel can change any of them. ` +
                        `Either publish a channel that writes the field -- a member of the Channel ` +
                        `union, a row in CHANNEL_DESCRIPTORS carrying its stylePath, and a role in ` +
                        `CHANNEL_ROLES -- or add it to UNREACHABLE_STYLE_FIELDS in ` +
                        `src/catalog/unreachable.ts with the reason a consumer cannot have it. A ` +
                        `field that is declared, drawn and unreachable is the defect this test ` +
                        `exists to catch: the arrow head carried a size, a colour and an opacity ` +
                        `like that for the whole of the 2.0 development.`,
                );
            });

            it("waives only fields that still exist", () => {
                const gone = [...waived.keys()].filter((path) => !leaves.has(path)).sort();

                assert.deepEqual(
                    gone,
                    [],
                    `These waivers in src/catalog/unreachable.ts name ${name} fields that no ` +
                        `longer exist. Delete the waiver: a list of missing capabilities that ` +
                        `outlives the schema is a list that tells the next reader the wrong thing.`,
                );
            });

            it("waives only fields that are still out of reach", () => {
                const served = [...waived.keys()].filter((path) => reachable.has(path)).sort();

                assert.deepEqual(
                    served,
                    [],
                    `These ${name} fields have a channel now and are still waived in ` +
                        `src/catalog/unreachable.ts. Delete the waiver -- while it is there, the ` +
                        `catalogue tells a consumer the capability is missing when it has arrived.`,
                );
            });

            it("gives every waiver a reason", () => {
                const silent = [...waived.values()]
                    .filter((field) => field.reason.trim().length === 0)
                    .map((field) => field.path)
                    .sort();

                assert.deepEqual(
                    silent,
                    [],
                    `These waivers have an empty reason. The reason is the whole entry: without ` +
                        `it the list records that something is missing and not what.`,
                );
            });
        });
    }

    it("waives nothing for a target that has no schema here", () => {
        const known = new Set(SCHEMAS.map((entry) => entry.target as string));
        const stray = UNREACHABLE_STYLE_FIELDS.filter((field) => !known.has(field.target))
            .map((field) => `${field.target}:${field.path}`)
            .sort();

        assert.deepEqual(stray, [], `These waivers name a target this test does not walk.`);
    });

    it("waives each field once", () => {
        const seen = new Set<string>();
        const repeated: string[] = [];

        for (const field of UNREACHABLE_STYLE_FIELDS) {
            const key = `${field.target}:${field.path}`;

            if (seen.has(key)) {
                repeated.push(key);
            }

            seen.add(key);
        }

        assert.deepEqual(repeated.sort(), [], `These fields are waived more than once, with more than one reason.`);
    });
});
