/**
 * @file The style fields the element declares, draws, and gives a consumer no way to ask for.
 *
 * WHAT THIS IS FOR. `UNSERVED_LAYOUT_IDS` and `UNSERVED_FORMAT_IDS` already name the layouts and
 * the file formats the element does NOT serve, each with a reason, "rather than left for a
 * consumer to discover by asking for a layout that never answers, or by never learning a
 * capability exists". Styles were the one surface where that was never written down, and it cost
 * the 2.0 major a regression nobody could see: `EdgeStyle` declared an arrow head's size, colour
 * and opacity with defaults, `Edge.ts` read all three to build the cap, and the published channel
 * set carried the cap TYPE and nothing else. The capability was built, drawn, tested and had no
 * door. Three agents noticed over three days; none of them had anywhere to put the observation.
 *
 * So this is that place, and `test/contracts/config-reachability.test.ts` is what makes writing
 * in it unavoidable. The test walks `NodeStyle` and `EdgeStyle` to their leaves, derives what
 * each channel can reach by PAINTING it through the real `StylePainter` twice with two different
 * values, and requires every remaining leaf to be named here with a reason. Adding a schema field
 * with no channel is then a red test naming the field.
 *
 * IT CHECKS BOTH WAYS, which is the half that keeps this file from rotting. A waiver naming a
 * field that no longer exists fails, and so does a waiver for a field that has since been given a
 * channel -- so an entry cannot outlive the gap it describes and go on telling a consumer that a
 * working capability is missing. When a channel is published, its waiver is deleted in the same
 * change.
 *
 * WHAT "UNREACHABLE" MEANS HERE, precisely: no style channel can make this field take a value the
 * author chose. A field the painter writes to a fixed value of its own is unreachable --
 * `texture.color.colorType` is pinned to "solid" on every node so that the per-instance colour
 * can show, which is exactly why a gradient node fill cannot survive the paint path.
 *
 * WHAT IT IS NOT. It is not a list of bugs and not a roadmap. Some entries are deliberate and
 * permanent: a label's world position is computed by the renderer and a layer has no business
 * setting it. Others are capabilities waiting for a channel. The reason says which.
 *
 * TWO KINDS OF WAIVER, AND WHY THE TYPE SPLITS THEM. A waiver that records "we chose not to
 * draw this" and a waiver that records "this is broken and we wrote it down" used to be the same
 * shape: a subject and a sentence. That is how every repaint defect in this package went quiet --
 * written down once, accepted by the gate for ever, and indistinguishable from a decision at a
 * glance. So a waiver now declares which it is. A `by-design` waiver is permanent and needs
 * nothing more. A `defect` waiver carries a person and a date, and
 * `test/contracts/waiver-expiry.test.ts` fails the day after that date, naming the subject, the
 * reason, the owner and what to do -- which is the only shape of record that makes somebody look
 * at a defect a second time.
 *
 * The register behind these entries, with the classification and the fix for each one, is
 * `design/element-api/capability-losses.md`.
 */

import type { Channel } from "./types";

/**
 * A capability the element has decided, deliberately and permanently, not to serve.
 *
 * Nothing is owed and nothing runs out. A label's world position is the renderer's to write every
 * frame, and a node icon is published as a compile error rather than as a silent no-op: a reader
 * who wants either is told once that it is not coming, and what to reach for instead.
 */
export interface ByDesignWaiver {
    /** Marks this as a decision, so nothing asks it to expire. */
    readonly kind: "by-design";
    /** Why a consumer cannot have this, and what to reach for instead. */
    readonly reason: string;
}

/**
 * Something that is broken or missing, written down so a gate can stay green while it is fixed.
 *
 * This is the entry that has to be able to run out: a defect that is green for ever is how four
 * repaint bugs stayed quiet in this package until somebody re-read the list by hand. It carries
 * a person and a date, and
 * `test/contracts/waiver-expiry.test.ts` turns red the day after `expires` -- so what a defect
 * waiver offers is "fix it, or look again and write down why it is still here", never "write it
 * down once and stop thinking about it".
 */
export interface DefectWaiver {
    /** Marks this as a defect, so it expires. */
    readonly kind: "defect";
    /** What is broken, and what a consumer meets because of it. */
    readonly reason: string;
    /** Who decides what happens to this. A person, not a team and not a package. */
    readonly owner: string;
    /** The last day this waiver is accepted, as `YYYY-MM-DD`. */
    readonly expires: string;
}

/** Either kind of waiver: a decision that stands, or a defect that expires. */
export type Waiver = ByDesignWaiver | DefectWaiver;

/**
 * The owner a defect waiver carries until a person takes it.
 *
 * Deliberately not a name. Nothing automated may assign this work to somebody, so a waiver
 * written by an agent says out loud that nobody has agreed to it yet, and the expiry is what
 * eventually forces the question.
 */
export const WAIVER_OWNER_UNASSIGNED = "unassigned -- no person has taken this yet";

/**
 * The expiry a defect waiver carries until a real one is chosen: ninety days from 2026-09-22,
 * the day the two kinds of waiver were split apart.
 *
 * A placeholder, not a judgement. None of these defects has been weighed against a release, so
 * the date says only "look at this within the quarter". The owner replaces it per waiver with a
 * date that means something, and `test/contracts/waiver-expiry.test.ts` refuses a date more than
 * {@link WAIVER_HORIZON_DAYS} away, so "2099-01-01" is not a way back to silence.
 */
export const WAIVER_EXPIRY_UNSET = "2026-12-21";

/**
 * How far ahead a defect waiver may be parked, in days.
 *
 * A year and a bit: long enough for a defect that genuinely waits on a release, short enough that
 * every defect in this file is read by a person at least once a year.
 */
export const WAIVER_HORIZON_DAYS = 400;

/**
 * A defect waiver nobody has taken yet.
 *
 * Every defect in this file is written through this helper today, which is exactly the state the
 * owner is being asked to correct: read the reason, decide who owns it, and give it a date that
 * reflects a real plan instead of a placeholder.
 * @param reason - What is broken, and what a consumer meets because of it.
 * @returns The waiver, carrying the placeholder owner and the placeholder expiry.
 */
function unownedDefect(reason: string): DefectWaiver {
    return { kind: "defect", reason, owner: WAIVER_OWNER_UNASSIGNED, expires: WAIVER_EXPIRY_UNSET };
}

/** One style field a consumer cannot reach, why, and whether that is a decision or a defect. */
export type UnreachableStyleField = Waiver & {
    /** Whether the field belongs to a node style or an edge style. */
    readonly target: "node" | "edge";
    /** The field, as a dotted path into the parsed style. */
    readonly path: string;
};

/**
 * The rich-text fields a block written through the label vocabulary still cannot reach.
 *
 * These are the residue of translating a reader's vocabulary into a canvas's: one per line,
 * because each is unreachable for its own reason and a shared sentence would hide four deliberate
 * decisions among twelve.
 *
 * FIVE BLOCKS SHARE IT, because the same translation is what reaches all five: a node's label, an
 * edge's label, a node's tooltip, and the caption at each end of an edge. Each of those has a
 * channel carrying its words and a channel carrying its appearance, both routed through
 * `StylePainter.richTextOf`, so what any of them cannot reach is the same list. "Label" below
 * means whichever of the five is being written.
 */
const LABEL_RESIDUE: Readonly<Record<string, string>> = {
    attachPosition:
        "Where a label sits in the scene is computed by the renderer from the element it is " +
        "attached to. A layer says which side it sits on and how far off, through the label " +
        "vocabulary's `location` and `attachOffset`; a layer that could also set the world " +
        "position would be able to contradict both.",
    "position.x":
        "The label's world position, written by the renderer every time the element it belongs " +
        "to moves. Anything a layer wrote here would survive until the next frame.",
    "position.y":
        "The label's world position, written by the renderer every time the element it belongs " +
        "to moves. Anything a layer wrote here would survive until the next frame.",
    "position.z":
        "The label's world position, written by the renderer every time the element it belongs " +
        "to moves. Anything a layer wrote here would survive until the next frame.",
    autoSize:
        "Whether the label's canvas is sized to its text. The renderer always sizes a label to " +
        "its words, and a label whose canvas did not fit them would clip rather than wrap.",
    resolution:
        "The pixel resolution of the canvas a label is drawn on: a quality-against-memory " +
        "decision about the renderer's own texture, not something a reader points at.",
    billboardMode:
        "Which axes the label turns on to face the camera. It is a Babylon.js constant, and " +
        "publishing it would make a renderer's internal numbering permanent public API.",
    borders:
        "Superseded by `borderWidth` and `borderColor`, which the label vocabulary does publish. " +
        "The older flag switched a border on without saying how thick it was.",
    textOutline:
        "The outline switch follows the outline COLOUR: writing `outline` in the label " +
        "vocabulary turns it on, and omitting it leaves it off. A switch of its own would let a " +
        "layer ask for an outline with no colour, which draws nothing.",
    textOutlineJoin:
        "How the corners of a letter's outline are mitred. The vocabulary publishes the outline's " +
        "colour and its width, which are what a reader can see at any size a graph is read at.",
    textPath:
        "The data column a label's words are read from. That is what binding the channel that " +
        "carries those words to a path already does -- `{by: \"data.name\"}\" -- so a second " +
        "route would be two spellings of one thing, and the two could disagree.",
    "backgroundColor.colorType":
        "The panel behind a label takes a plain colour from the vocabulary's `background`. A " +
        "gradient panel is reached through `gradient`, `gradientType`, `gradientColors` and " +
        "`gradientDirection`, which is the pair of fields the renderer actually draws a gradient " +
        "from; this object form of the colour is the older of two ways to say it.",
    "backgroundColor.value":
        "The panel behind a label takes a plain colour from the vocabulary's `background`. A " +
        "gradient panel is reached through `gradient`, `gradientType`, `gradientColors` and " +
        "`gradientDirection`, which is the pair of fields the renderer actually draws a gradient " +
        "from; this object form of the colour is the older of two ways to say it.",
    "backgroundColor.colors":
        "The panel behind a label takes a plain colour from the vocabulary's `background`. A " +
        "gradient panel is reached through `gradient`, `gradientType`, `gradientColors` and " +
        "`gradientDirection`, which is the pair of fields the renderer actually draws a gradient " +
        "from; this object form of the colour is the older of two ways to say it.",
    "backgroundColor.direction":
        "The panel behind a label takes a plain colour from the vocabulary's `background`. A " +
        "gradient panel is reached through `gradient`, `gradientType`, `gradientColors` and " +
        "`gradientDirection`, which is the pair of fields the renderer actually draws a gradient " +
        "from; this object form of the colour is the older of two ways to say it.",
    "backgroundColor.opacity":
        "The panel behind a label takes a plain colour from the vocabulary's `background`, which " +
        "carries its own alpha when it is written as `#rrggbbaa`.",
};

/**
 * Spread a block whose fields are each unreachable BY DESIGN, every one for a reason of its own.
 * @param target - Whether these are node or edge style fields.
 * @param prefix - The dotted path of the block, such as "label".
 * @param reasons - The leaf names inside it, against their reasons.
 * @returns One by-design waiver per field.
 */
function namedBlockOf(
    target: "node" | "edge",
    prefix: string,
    reasons: Readonly<Record<string, string>>,
): UnreachableStyleField[] {
    return Object.entries(reasons).map(([field, reason]) => ({
        kind: "by-design" as const,
        target,
        path: `${prefix}.${field}`,
        reason,
    }));
}

/**
 * Every declared style field no style channel can change, with the reason for each and whether
 * that reason is a decision or a defect.
 *
 * WHEN THE CLASSIFICATION IS ARGUABLE IT IS A DEFECT, deliberately. A defect waiver costs an
 * owner one reading a quarter; a decision waiver costs nothing and is silent for ever, which is
 * the failure this split exists to end. So a field whose register row is still open is a defect
 * here even where the pin that makes it unreachable looks like an architectural choice -- the
 * owner closing that row is what reclassifies it.
 */
export const UNREACHABLE_STYLE_FIELDS: readonly UnreachableStyleField[] = [
    // ------------------------------------------------------------------------------------------
    // Nodes
    // ------------------------------------------------------------------------------------------
    {
        kind: "by-design",
        target: "node",
        path: "texture.icon",
        reason:
            "The `node.marker` channel exists for this and is published `renderable: false` with " +
            "a value type of `never`, so writing it is a compile error rather than a silent " +
            "no-op. Nothing draws a node icon; the badge vocabulary that does exist belongs to a " +
            "label. This is the one case the package already handled honestly.",
    },
    {
        ...unownedDefect(
            "The source mesh's material is painted a neutral solid so that each node's own " +
                "instance colour can show -- one material per colour would be one source mesh " +
                "per colour, fifty thousand of them for a continuous ramp. So the paint path " +
                "pins this to \"solid\" on every node and no channel can choose otherwise, " +
                "which is why a gradient node fill cannot survive a repaint even though " +
                "`NodeMesh` still builds one. Register row 24, which is open: a channel " +
                "carrying an advanced colour, or the renderer branch deleted.",
        ),
        target: "node",
        path: "texture.color.colorType",
    },
    {
        ...unownedDefect(
            "Pinned to a neutral white by the paint path, for the same reason as " +
                "`texture.color.colorType`: the colour a reader sees is written into the node's " +
                "own instance, beside the style, through the `node.color` channel. Register " +
                "row 24.",
        ),
        target: "node",
        path: "texture.color.value",
    },
    {
        ...unownedDefect(
            "The colour stops of a gradient node fill. `NodeMesh.createMaterial` builds linear " +
                "and radial gradients and tests cover them, and no channel reaches any of it " +
                "because the paint path overwrites the whole colour with a neutral solid. " +
                "Register row 24: publish a channel carrying an advanced colour, or delete the " +
                "renderer branch.",
        ),
        target: "node",
        path: "texture.color.colors",
    },
    {
        ...unownedDefect(
            "Which way a gradient node fill runs. Unreachable for the same reason as " +
                "`texture.color.colors`: the paint path replaces the colour with a neutral " +
                "solid before the material is built. Register row 24.",
        ),
        target: "node",
        path: "texture.color.direction",
    },
    ...namedBlockOf("node", "label", LABEL_RESIDUE),

    // A node's tooltip, published as two channels in 2.0 -- `node.tooltip` carries the words and
    // `node.tooltipStyle` carries the appearance -- so what is left is the same sixteen leaves a
    // label leaves, for the same reasons. The whole block used to be waived here as a defect: the
    // renderer read every field of it and only the words had a door.
    ...namedBlockOf("node", "tooltip", LABEL_RESIDUE),

    // ------------------------------------------------------------------------------------------
    // Edges
    // ------------------------------------------------------------------------------------------
    ...namedBlockOf("edge", "label", LABEL_RESIDUE),

    // A caption at each end of an edge, published as four channels -- the words and the
    // appearance at each end -- so what is left is the same sixteen leaves a label leaves, for
    // the same reasons. The whole block used to be waived here as a defect: the renderer built a
    // caption and no channel could ask for one.
    ...namedBlockOf("edge", "arrowHead.text", LABEL_RESIDUE),
    ...namedBlockOf("edge", "arrowTail.text", LABEL_RESIDUE),
];

/**
 * One channel the table publishes as renderable that does not change the picture, and why.
 *
 * The reason says what was measured and what it means for a consumer. There are three shapes of
 * entry and the KIND now says which is which: a channel nothing draws under any circumstances and
 * a channel that is drawn on the first frame but ignored when a layer adds it to a graph already
 * on screen are both defects -- the second is the worse one to leave unwritten, because it works
 * in a story and fails in a settings panel -- while a channel this gate cannot OBSERVE, though
 * something else proves it draws, is by design and stays.
 */
export type UnpaintedChannel = Waiver & {
    /** The channel's name. */
    readonly channel: Channel;
};

/**
 * Every channel published as renderable that `test/browser/channel-paints.test.ts` could not see
 * change the picture.
 *
 * Measured, not assumed: that test mounts a graph, writes each channel a value far from its
 * default, and compares the scene graph and a histogram of the frame before and after. The
 * entries below are what came back unchanged, with the pixel counts that were measured while
 * writing them.
 *
 * A `defect` entry is a consumer writing a layer that silently does nothing, recorded here so
 * that they read the gap rather than discover it, and so that the gate stays able to tell the
 * next person about the NEXT one. A `by-design` entry is the other thing a frame comparison can
 * mean: the channel draws, and this reading cannot see it. Only the first kind expires.
 */
export const UNPAINTED_CHANNELS: readonly UnpaintedChannel[] = [
    {
        kind: "by-design",
        channel: "node.tooltip",
        reason:
            "A NODE TOOLTIP IS DRAWN, so this waiver is about the reading and not about the " +
            "capability -- which is why it is a decision and does not expire. `Node.showTooltip` " +
            "builds it and `NodeBehavior` puts it up when the pointer arrives and takes it down " +
            "when the pointer leaves; `test/browser/node-tooltip-on-hover.test.ts` drives that " +
            "with a real pointer and the three `Styles/Node Tooltip` stories show it. The gate " +
            "here paints a channel into a RESTING scene and compares frames, and a tooltip is " +
            "hover-only by design -- a resting scene is exactly the moment it must NOT be on " +
            "screen -- so nothing changes and nothing should. Waiving it is how this file says " +
            "\"proved somewhere this gate cannot look\", and the named test is where. What a " +
            "tooltip says is one of two things a channel carries: `node.tooltipStyle`, below, " +
            "carries how it looks, and the two together leave the same sixteen-leaf residue a " +
            "label leaves.",
    },
    {
        kind: "by-design",
        channel: "node.tooltipStyle",
        reason:
            "A NODE TOOLTIP IS DRAWN and its appearance reaches it, so this waiver is about the " +
            "reading and not about the capability, exactly as `node.tooltip` above: the two " +
            "channels are the words and the look of the same hover-only mesh, and this gate " +
            "paints into a RESTING scene, which is the one moment a tooltip must not be on " +
            "screen. `test/browser/node-tooltip-style-draws.test.ts` is where it is proved -- it " +
            "hovers a node with a real pointer, reads the tooltip mesh the element built, and " +
            "requires the typeface, the panel colour and the size a layer asked for to be the " +
            "ones drawn.",
    },
];

/**
 * One thing this package used to publish and no longer does, and what to reach for instead.
 *
 * WHY A WITHDRAWAL NEEDS A RECORD AT ALL. A style channel can be ADDED in a minor release and a
 * schema field can only be REMOVED in a major one, so a withdrawal happens rarely and lands on
 * somebody who wrote against it once and has not read the package since. Deleting the field and
 * saying nothing leaves that consumer with a parse error and no sentence anywhere that explains
 * it -- the schema is strict, so a document carrying a withdrawn key stops parsing rather than
 * being ignored, which is deliberate and is exactly the moment the reason has to be findable.
 *
 * WHERE IT IS READ. `catalog/index.ts` publishes this list, so a settings panel, a plugin or a
 * model can tell a reader why a name it remembers is gone without anybody rewriting the
 * explanation. `test/contracts/withdrawn-capabilities.test.ts` requires each entry to be really
 * withdrawn -- not a channel any more, and not a field the schema still accepts -- so an entry
 * cannot outlive the removal it describes, on the same terms as every waiver above.
 */
export interface WithdrawnCapability {
    /** What was withdrawn, spelled the way it was published: a channel name or a style path. */
    readonly subject: string;
    /** The release it went in, as `MAJOR.MINOR`. */
    readonly withdrawnIn: string;
    /** Why it went, in terms of what a consumer who used it was actually getting. */
    readonly reason: string;
    /** What to do instead, for somebody who has it in a style document or a layer today. */
    readonly instead: string;
}

/**
 * Everything 2.0 stopped publishing, with the reason and the replacement for each.
 *
 * All three entries are the same shape of defect: a name the element published, a renderer that
 * never read it, and no way for a consumer to find that out but by writing it and watching
 * nothing happen. 2.0 is the first opportunity to take any of them back.
 */
export const WITHDRAWN_CAPABILITIES: readonly WithdrawnCapability[] = [
    {
        subject: "edge.tooltip",
        withdrawnIn: "2.0",
        reason:
            "No edge tooltip was ever drawn, in any released version of this package. A tooltip " +
            "appears when the pointer arrives over something, and an edge cannot be pointed at: " +
            "`src/Edge.ts` sets `isPickable = false` in three places and `PatternedLineMesh` " +
            "declares it false as a field, which is the same fact that leaves the element with " +
            "no `edge-click` event. The channel was nonetheless published `renderable: true` and " +
            "sold in the styling guide as \"the words to show on hover\", so a consumer wrote a " +
            "layer, got nothing, and had nowhere to read why -- which is what `src/events.ts` " +
            "calls a documented lie. The whole `tooltip` block went from `EdgeStyle` with the " +
            "channel: sixty-two settings that reached no pixel.",
        instead:
            "Put the words on the edge itself with `edge.label`, which is drawn at the middle of " +
            "the line, or at one of its ends with `edge.arrowHeadText` and `edge.arrowTailText`. " +
            "A hover tooltip on an edge comes back if edge picking is ever built, on the same " +
            "terms as the `edge-click` event; a NODE tooltip is drawn today and has both a " +
            "`node.tooltip` channel and a `node.tooltipStyle` channel.",
    },
    {
        subject: "NodeStyle.enabled",
        withdrawnIn: "2.0",
        reason:
            "Accepted and ignored for as long as it existed. Whether a node is drawn is answered " +
            "by the session's visibility mask -- the filters, the time window and the context " +
            "flag -- and never by a style, so flipping this left the node exactly where it was.",
        instead:
            "Hide nodes through the session's filters, which is what decides visibility. To take " +
            "a node's WORDS away rather than the node, write `node.labelStyle` with " +
            "`enabled: false`; the label block's own flag is the one the renderer reads.",
    },
    {
        subject: "EdgeStyle.enabled",
        withdrawnIn: "2.0",
        reason:
            "The edge half of the same dead switch, on the same terms: superseded by the " +
            "session's visibility mask, and read by nothing.",
        instead:
            "Hide edges through the session's filters. `edge.labelStyle` with `enabled: false` " +
            "takes an edge's words away without touching the line.",
    },
];
