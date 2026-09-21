import { z } from "zod/v4";

import { DataConfig } from "./DataConfig";
import { EdgeStyle } from "./EdgeStyle";
import { GraphBehaviorOpts } from "./GraphBehavior";
import { GraphStyle } from "./GraphStyle";
import { NodeStyle } from "./NodeStyle";

/**
 * A 1.x calculated style, which is accepted and then ignored.
 *
 * `expr` was a string of JavaScript compiled with the `Function` constructor and run once per
 * element per repaint, with no try/catch anywhere on the path -- so one throw aborted the repaint
 * part way through and every element after it silently kept its old style, and under a Content
 * Security Policy without `unsafe-eval` the whole mechanism died and took every algorithm's
 * colouring with it, in silence. It is deleted rather than sandboxed: a declarative encoding
 * (`session.styles.encode()`) has no evaluator, can be validated, diffed, legended and retargeted
 * at another dataset, and a string of JavaScript can do none of those.
 *
 * THE SHAPE STILL PARSES so that a template saved by 1.x loads instead of being refused at the
 * door; {@link Styles} warns once for every layer carrying one, naming the layer. Nothing reads
 * the value. Bind a value to a channel with `session.styles.encode()` instead.
 */
export const CalculatedStyle = z.looseObject({
    inputs: z.array(z.string()).optional(),
    output: z.string().optional(),
    expr: z.string().optional(),
});

/** A 1.x calculated style as it parses. Accepted, never applied -- see {@link CalculatedStyle}. */
export type CalculatedStyleConfig = z.infer<typeof CalculatedStyle>;

const AppliedNodeStyle = z.strictObject({
    selector: z.string(),
    style: NodeStyle,
    /** Removed in 2.0: accepted so a 1.x template loads, never applied. */
    calculatedStyle: CalculatedStyle.optional(),
});

const AppliedEdgeStyle = z.strictObject({
    selector: z.string(),
    style: EdgeStyle,
    /** Removed in 2.0: accepted so a 1.x template loads, never applied. */
    calculatedStyle: CalculatedStyle.optional(),
});

export type AppliedNodeStyleConfig = z.infer<typeof AppliedNodeStyle>;
export type AppliedEdgeStyleConfig = z.infer<typeof AppliedEdgeStyle>;

const StyleLayerMetadata = z
    .object({
        name: z.string(),
    })
    .loose();

const StyleLayer = z
    .strictObject({
        node: AppliedNodeStyle,
        edge: AppliedEdgeStyle,
        metadata: StyleLayerMetadata.optional(),
    })
    .partial()
    .refine((data) => !!data.node || !!data.edge, "StyleLayer requires either 'node' or 'edge'.");

const TemplateMetadata = z.strictObject({
    templateName: z.string().optional(),
    templateCreator: z.string().optional(),
    templateCreationTimestamp: z.iso.datetime().optional(),
    templateModificationTimestamp: z.iso.datetime().optional(),
});

const StyleTemplateV1 = z.strictObject({
    graphtyTemplate: z.literal(true),
    majorVersion: z.literal("1"),
    metadata: TemplateMetadata.optional(),
    graph: GraphStyle.prefault({}),
    layers: z.array(StyleLayer).prefault([]),
    data: DataConfig.prefault({}),
    behavior: GraphBehaviorOpts.prefault({}),
});

export const StyleTemplate = z.discriminatedUnion("majorVersion", [StyleTemplateV1]);

export type StyleSchema = z.infer<typeof StyleTemplate>;
export type StyleSchemaV1 = z.infer<typeof StyleTemplateV1>;
export type StyleLayerType = z.infer<typeof StyleLayer>;
