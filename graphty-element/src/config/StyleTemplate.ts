import { z } from "zod/v4";

import { DataConfig } from "./DataConfig";
import { EdgeStyle } from "./EdgeStyle";
import { GraphBehaviorOpts } from "./GraphBehavior";
import { GraphStyle } from "./GraphStyle";
import { NodeStyle } from "./NodeStyle";

const AppliedNodeStyle = z.looseObject({
    selector: z.string(),
    style: NodeStyle,
});

const AppliedEdgeStyle = z.looseObject({
    selector: z.string(),
    style: EdgeStyle,
});

const StyleLayerMetadata = z
    .object({
        name: z.string(),
    })
    .loose();

/**
 * A 1.x style layer, which parses and is then ignored.
 *
 * ACCEPTED SO A SAVED DOCUMENT STILL LOADS. The stack these layers described is gone: layers are
 * `session.styles`, addressed by a stable id, compiled once into a predicate, and able to say
 * what they painted. A document carrying this array loads, and the rest of it -- the id paths,
 * the view mode, the background, the layout, the run-on-load algorithms -- still applies. Nothing
 * reads the layers. Loose rather than strict, so a layer written against an older shape (a
 * `calculatedStyle` beside its style, for instance) does not take the whole document down.
 */
const StyleLayer = z
    .looseObject({
        node: AppliedNodeStyle,
        edge: AppliedEdgeStyle,
        metadata: StyleLayerMetadata.optional(),
    })
    .partial();

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
    /** Accepted and ignored. See {@link StyleLayer}; style layers are `session.styles`. */
    layers: z.array(StyleLayer).prefault([]),
    data: DataConfig.prefault({}),
    behavior: GraphBehaviorOpts.prefault({}),
});

export const StyleTemplate = z.discriminatedUnion("majorVersion", [StyleTemplateV1]);

export type StyleSchemaV1 = z.infer<typeof StyleTemplateV1>;
