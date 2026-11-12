// Readable run names, written from the published docs only (section 11 + docs/guide/).
// Task: run PageRank twice -- the default and a lower damping -- and show both side by side.
import type { Graphty } from "@graphty/graphty-element";
import { defineAlgorithm } from "@graphty/graphty-element/extend";

const element = document.querySelector("graphty-element") as Graphty;

const plain = await element.run("pagerank"); // docs: id "pagerank", label "Influence"
const damped = await element.run("pagerank", { dampingFactor: 0.5 }); // a separate run: "pagerank_damping_0_5"?
console.log(plain.id, plain.label, damped.id, damped.label); // guide: run.id after await
await element.session.styles.encode({ run: damped, channel: "node.size" });

// A plugin names its own runs the same way (only when the option is not its default).
defineAlgorithm({
    id: "acme-confidence-degree",
    options: { confidence: { type: "attribute", on: "edge", default: "confidence" } },
    suggestedName: ({ confidence }) =>
        confidence === "confidence"
            ? { id: "acme_confidence_degree", label: "Confidence degree" }
            : { id: `acme_confidence_degree_${confidence}`, label: `Confidence degree (${confidence})` },
    node: (node, { options }) => node.strength(options.confidence),
});

export {};
