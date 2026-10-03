import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { session } = element;
const path = "data.department"; // my file stores departments as codes 1..14

// A department code is a group, not an amount: say so, or it is drawn as a ramp.
await session.data.declare(path, { level: "category" });
const d = session.styles.defaultBinding(path, "node.color");
if (!d.suitable) throw new Error(d.reason);

await session.styles.add({
    name: "Color by department",
    target: "node",
    selector: { match: "has", path },
    encode: { "node.color": { by: path } }, // no scale: the element picks one per category
});

for (const block of session.styles.legend({ maxCategories: 8 })) {
    console.log(block.swatches.map((s) => s.label), block.other?.label, block.other?.count);
}
