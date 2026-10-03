// Blind-author canonical example for session.data.neighbors (element-api-decisions.md section 4).
// Task: click a node, list its 10 strongest neighbors with tie strength in a side panel.
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const list = document.querySelector("#neighbors")!;

element.addEventListener("graphty-node-click", (e) => {
    const { nodeId } = e.detail; // events.md: detail carries nodeId and data
    const page = element.session.data.neighbors(nodeId, { limit: 10 });
    list.replaceChildren(
        ...page.records.map((n) => Object.assign(document.createElement("li"), {
            textContent: `${String(n.node.label ?? n.node.id)}: ${n.tie}`,
        })),
    );
    list.setAttribute("aria-label", `${page.total} connections`);
});
