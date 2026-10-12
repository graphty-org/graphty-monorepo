/**
 * GEXF styles: the viz module read into the neutral vocabulary with Gephi's defaults, the GEXF 1.0 files Gephi 0.6
 * wrote, and styles written back into the viz module with the `graphty.styles` block in `<meta>`.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { GEXF_ISSUE } from "../../../src/formats/gexf/index.js";
import { createRegistry } from "../../../src/registry.js";
import {
    type ExtractedStyles,
    featuresOf,
    planStyles,
    resolveStyles,
    styleFingerprint,
    type StyleRule,
} from "../../../src/styles/index.js";
import { editGexfNodeColor, replaceGexfBlock } from "../../styles/formats/gexf.js";

const registry = createRegistry();
const CORPUS = resolve(import.meta.dirname, "../../corpus/styles/gexf/generated");
const DISEASOME = resolve(import.meta.dirname, "../../conformance/fixtures/gexf/gephi-datasets/diseasome.gexf");
/** Gephi's CPAN datasets: GEXF 1.0 with `type="dir"` edges listed before their nodes; not redistributable. */
const CPAN = ["cpan-distributions", "cpan-authors"].map((name) =>
    resolve(
        import.meta.dirname,
        `../../../../../../tmp/style-import/wild/gexf/files/x/gephi-${name}.gexf/${name}.gexf`,
    ),
);

/**
 * Imports a GEXF document with its styles.
 * @param doc - the document
 * @param toolDefaults - whether Gephi's defaults are added
 * @returns the import result, with styles
 */
async function load(doc: string | Uint8Array, toolDefaults = true) {
    const result = await registry.importGraph(doc, { format: "gexf", styles: { toolDefaults }, errorLimit: Infinity });
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles");
    }
    return { ...result, styles: result.styles };
}

/**
 * The rules of a target that write a property.
 * @param ex - the styles
 * @param target - nodes or edges
 * @param property - the property
 * @returns the rules
 */
function writers(ex: ExtractedStyles, target: "node" | "edge", property: string): StyleRule[] {
    return ex.styles.rules.filter(
        (r) => r.target === target && (Object.hasOwn(r.set ?? {}, property) || Object.hasOwn(r.map ?? {}, property)),
    );
}

const plain = (ex: ExtractedStyles): StyleRule[] => JSON.parse(JSON.stringify(ex.styles.rules)) as StyleRule[];

describe("GEXF styles: reading", () => {
    it("recovers Gephi's diseasome disease-class colors as one discrete mapping", async () => {
        const { snapshot, styles } = await load(new Uint8Array(readFileSync(DISEASOME)));
        const fills = writers(styles, "node", "fill").filter((r) => r.origin !== "tool");
        expect(fills).toHaveLength(1);
        expect(fills[0].map?.fill).toMatchObject({ kind: "discrete", by: { data: "disclass" } });
        const colors = resolveStyles(styles, "node", "fill", snapshot);
        const i = snapshot.ids.indexOf(30);
        expect(colors[i]).toBe("#ee4444");
        expect(snapshot.nodes.value("disclass", i)).toBe("Neurological");
    });

    it("gives a GEXF without colors Gephi's defaults: black size-10 discs, no label rule, arrows on directed edges", async () => {
        const { snapshot, styles } = await load(
            `<gexf version="1.3"><graph defaultedgetype="directed"><nodes><node id="a" label="A"/><node id="b"/></nodes>
            <edges><edge source="a" target="b"/></edges></graph></gexf>`,
        );
        expect(styles.styles.source).toEqual({ format: "gexf", dialect: "gexf", tool: "gephi" });
        expect(resolveStyles(styles, "node", "fill", snapshot)).toEqual(["#000000", "#000000"]);
        expect(resolveStyles(styles, "node", "width", snapshot)).toEqual([10, 10]);
        expect(resolveStyles(styles, "node", "shape", snapshot)).toEqual(["ellipse", "ellipse"]);
        expect(writers(styles, "node", "label")).toEqual([]);
        expect(resolveStyles(styles, "edge", "targetArrow", snapshot)).toEqual(["triangle"]);
        expect(resolveStyles(styles, "edge", "color", snapshot)).toEqual(["#000000"]);
    });

    it("draws an uncolored edge in its source node's color, and a colored edge in its own", async () => {
        const { snapshot, styles } = await load(
            `<gexf version="1.3" xmlns:viz="http://gexf.net/1.3/viz"><graph><nodes>
            <node id="a"><viz:color r="255" g="0" b="0"/></node><node id="b"/></nodes><edges>
            <edge source="a" target="b"/><edge source="b" target="a"><viz:color r="0" g="0" b="255"/></edge>
            </edges></graph></gexf>`,
        );
        expect(resolveStyles(styles, "edge", "color", snapshot)).toEqual(["#ff0000", "#0000ff"]);
        const source = styles.styles.rules.find((r) => r.facts?.reason === "SOURCE_NODE_COLOR");
        expect(source).toMatchObject({ origin: "tool", map: { color: { kind: "passthrough" } } });
        // undirected: Gephi draws no arrows
        expect(resolveStyles(styles, "edge", "targetArrow", snapshot)).toEqual(["none", "none"]);
    });

    it("draws an edge with no thickness as thick as its weight, as Gephi does, and one with a thickness with it", async () => {
        const { snapshot, styles } = await load(
            `<gexf version="1.3" xmlns:viz="http://gexf.net/1.3/viz"><graph><nodes><node id="a"/><node id="b"/></nodes>
            <edges><edge source="a" target="b" weight="3"/><edge source="b" target="a"/>
            <edge source="a" target="a" weight="5"><viz:thickness value="2"/></edge></edges></graph></gexf>`,
        );
        expect(resolveStyles(styles, "edge", "width", snapshot)).toEqual([3, 1, 2]);
        expect(styles.styles.rules.find((r) => r.facts?.reason === "EDGE_WEIGHT")).toMatchObject({ origin: "tool" });
    });

    it("leaves out every Gephi default, the derived ones too, with toolDefaults: false", async () => {
        const { styles } = await load(
            `<gexf version="1.3"><graph defaultedgetype="directed"><nodes><node id="a"/><node id="b"/></nodes>
            <edges><edge source="a" target="b"/></edges></graph></gexf>`,
            false,
        );
        expect(styles.styles.rules.filter((r) => r.origin === "tool")).toEqual([]);
    });

    it("reads alpha, #rgb, #rrggbbaa, sizes, thickness and edge shapes, and clamps an alpha above 1 with a note", async () => {
        const { snapshot, styles, report } = await load(
            `<gexf version="1.3" xmlns:viz="http://gexf.net/1.3/viz"><graph><nodes>
            <node id="a"><viz:color r="255" g="0" b="0" a="0.5"/><viz:size value="4"/><viz:shape value="square"/></node>
            <node id="b"><viz:color hex="#0f0"/></node>
            <node id="c"><viz:color hex="#0000ff80"/></node>
            <node id="d"><viz:color r="1" g="2" b="3" a="1.5"/></node>
            </nodes><edges><edge source="a" target="b"><viz:thickness value="3"/><viz:shape value="dashed"/></edge>
            </edges></graph></gexf>`,
        );
        expect(resolveStyles(styles, "node", "fill", snapshot)).toEqual(["#ff0000", "#00ff00", "#0000ff", "#010203"]);
        expect(resolveStyles(styles, "node", "fillOpacity", snapshot)).toEqual([0.5, null, 0.501961, null]);
        expect(resolveStyles(styles, "node", "width", snapshot)[0]).toBe(4);
        expect(resolveStyles(styles, "node", "shape", snapshot)[0]).toBe("rectangle");
        expect(resolveStyles(styles, "edge", "width", snapshot)).toEqual([3]);
        expect(resolveStyles(styles, "edge", "lineStyle", snapshot)).toEqual(["dashed"]);
        expect(report.issues.filter((i) => i.code === GEXF_ISSUE.VIZ_VALUE).map((i) => i.element)).toEqual(["d"]);
    });
});

describe("GEXF node pictures", () => {
    it("reads a uri as a picture only on an image shape, the one shape GEXF gives a uri", async () => {
        const { snapshot, styles } = await load(
            `<gexf version="1.3" xmlns:viz="http://gexf.net/1.3/viz"><graph><nodes>
            <node id="a"><viz:shape value="diamond" uri="pic.png"/></node>
            <node id="b"><viz:shape value="image" uri="pic.png"/></node>
            </nodes></graph></gexf>`,
        );
        expect(resolveStyles(styles, "node", "shape", snapshot)).toEqual(["diamond", "other:image"]);
        expect(resolveStyles(styles, "node", "image", snapshot)).toEqual([null, "pic.png"]);
    });

    it("reports a shape it replaces with the image shape a picture needs", () => {
        const b = new GraphBuilder({ directed: false });
        b.addNode("a");
        const snapshot = b.freeze();
        const styles = planStyles(
            {
                format: "test",
                node: { values: { shape: ["diamond"], image: ["pic.png"] } },
                fingerprint: styleFingerprint(snapshot),
            },
            { node: featuresOf(snapshot, "node"), edge: [] },
        );
        const losses = registry.checkExport(snapshot, "gexf", { styles });
        expect(
            losses.filter((l) => l.code === "W_STYLE_APPROXIMATED").map((l) => [l.style?.property, l.count]),
        ).toEqual([["shape", 1]]);
    });
});

describe("GEXF 1.0 files", () => {
    it("imports edges of type dir listed before their nodes, attvalue id values, and pid naming no node", async () => {
        const { snapshot, report, styles } = await load(
            new Uint8Array(readFileSync(join(CORPUS, "gexf10-edges-first.gexf"))),
        );
        expect(snapshot.nodeCount).toBe(24);
        expect(snapshot.edgeCount).toBe(30);
        expect(snapshot.directed).toBe(true);
        expect(report.errorCount).toBe(0);
        expect(report.issues.map((i) => i.code)).toEqual([GEXF_ISSUE.UNKNOWN_PID]);
        expect(snapshot.nodes.value("disclass", snapshot.ids.indexOf(100))).toBe("Neurological");
        expect(writers(styles, "node", "fill").find((r) => r.origin !== "tool")?.map?.fill).toMatchObject({
            kind: "discrete",
            by: { data: "disclass" },
        });
    });

    it.skipIf(!CPAN.every((f) => existsSync(f)))("imports the edges of Gephi's CPAN datasets", async () => {
        for (const file of CPAN) {
            const { snapshot, report } = await load(new Uint8Array(readFileSync(file)));
            const listed = (readFileSync(file, "utf-8").match(/<edge\s/g) ?? []).length;
            expect(snapshot.edgeCount).toBe(listed);
            expect(report.errorCount).toBe(0);
        }
    });

    it("still reports a GEXF 1.3 pid naming no node as an error", async () => {
        const pid = await registry
            .importGraph(`<gexf version="1.3"><graph><nodes><node id="a" pid="z"/></nodes></graph></gexf>`, {
                format: "gexf",
            })
            .then((r) => r.report.issues.map((i) => i.code));
        expect(pid).toEqual([GEXF_ISSUE.UNKNOWN_PARENT]);
    });
});

describe("GEXF styles: writing", () => {
    it("writes the styles into the viz module and reads back the same rules and values", async () => {
        const { snapshot, styles } = await load(new Uint8Array(readFileSync(DISEASOME)));
        const text = await registry.exportGraphToString(snapshot, "gexf", { styles });
        expect(text).toContain('<graphty:styles xmlns:graphty="https://graphty.app/ns/gexf"');
        const back = await load(text);
        expect(back.report.issues.map((i) => i.code)).not.toContain("W_UNKNOWN_ELEMENT");
        expect(back.styles.styles.source.tool).toBe("graphty");
        expect(plain(back.styles)).toEqual(plain(styles));
        for (const [target, property] of [
            ["node", "fill"],
            ["node", "width"],
            ["edge", "color"],
            ["edge", "targetArrow"],
        ] as const) {
            expect(resolveStyles(back.styles, target, property, back.snapshot)).toEqual(
                resolveStyles(styles, target, property, snapshot),
            );
        }
    });

    it("writes a CSS color from the styles as viz:color, and reports shapes and sizes GEXF can only approximate", async () => {
        const b = new GraphBuilder({ directed: false });
        b.addNode("a");
        b.addNode("b");
        const snapshot = b.freeze();
        const styles = planStyles(
            {
                format: "test",
                node: {
                    values: {
                        fill: ["#123456", "#123456"],
                        shape: ["hexagon", "ellipse"],
                        width: [10, 10],
                        height: [10, 20],
                    },
                },
                fingerprint: styleFingerprint(snapshot),
            },
            { node: featuresOf(snapshot, "node"), edge: [] },
        );
        const losses = registry.checkExport(snapshot, "gexf", { styles });
        expect(
            losses.filter((l) => l.code === "W_STYLE_APPROXIMATED").map((l) => [l.style?.property, l.count]),
        ).toEqual([
            ["shape", 1],
            ["width", 1],
        ]);
        const text = await registry.exportGraphToString(snapshot, "gexf", { styles });
        expect(text).toContain('<viz:color r="18" g="52" b="86"/>');
        expect(text).toContain('<viz:size value="20"/>');
        const back = await load(text);
        // the block keeps the exact values the viz module approximates
        expect(resolveStyles(back.styles, "node", "shape", back.snapshot)).toEqual(["hexagon", "ellipse"]);
        expect(resolveStyles(back.styles, "node", "height", back.snapshot)).toEqual([10, 20]);
    });
});

/** The block-tamper fixtures: a file graphty wrote, then edited outside as design 10.7 items 4 and 5 describe. */
async function tamperFixtures(): Promise<Record<string, Uint8Array>> {
    const base = await load(new Uint8Array(readFileSync(join(CORPUS, "random-all-60.gexf"))));
    const written = await registry.exportGraphToBytes(base.snapshot, "gexf", { styles: base.styles });
    const text = new TextDecoder().decode(written);
    const added = text.replace(
        /<nodes count="(\d+)">\n/,
        (_m, n: string) => `<nodes count="${String(Number(n) + 1)}">\n      <node id="added"/>\n`,
    );
    return {
        "graphty-written.gexf": written,
        "tamper-native-edited.gexf": editGexfNodeColor(written) ?? new Uint8Array(),
        "tamper-block-truncated.gexf": replaceGexfBlock(written, (block) =>
            block.slice(0, Math.floor(block.length / 2)),
        ),
        "tamper-node-added.gexf": new TextEncoder().encode(added),
    };
}

describe("GEXF block tamper fixtures", () => {
    it("are the edits they say they are (UPDATE_GEXF_TAMPER=1 writes them again)", async () => {
        for (const [name, bytes] of Object.entries(await tamperFixtures())) {
            const path = join(CORPUS, name);
            if (process.env.UPDATE_GEXF_TAMPER === "1") {
                writeFileSync(path, bytes);
            }
            expect(new TextDecoder().decode(readFileSync(path))).toBe(new TextDecoder().decode(bytes));
        }
    });

    it("bring an outside edit back as one exception over the same rules", async () => {
        const unedited = await load(new Uint8Array(readFileSync(join(CORPUS, "graphty-written.gexf"))));
        const edited = await load(new Uint8Array(readFileSync(join(CORPUS, "tamper-native-edited.gexf"))));
        const below = (ex: ExtractedStyles): unknown => plain(ex).filter((r) => r.role !== "exceptions");
        expect(below(edited.styles)).toEqual(below(unedited.styles));
        const excepted = edited.styles.columns.node.get("exceptions.fill") ?? [];
        expect(excepted.filter((v) => v !== null)).toEqual(["#123456"]);
    });

    it("ignore a truncated block and a block for another graph with a note, and read the file as Gephi's", async () => {
        for (const [file, reason] of [
            ["tamper-block-truncated.gexf", "NOT_JSON"],
            ["tamper-node-added.gexf", "FINGERPRINT"],
        ] as const) {
            const { styles } = await load(new Uint8Array(readFileSync(join(CORPUS, file))));
            const note = styles.styles.notes.find((n) => n.code === "W_STYLE_BLOCK_IGNORED");
            expect(note?.params.samples).toEqual([reason]);
            expect(styles.styles.source.tool).toBe("gephi");
        }
    });
});
