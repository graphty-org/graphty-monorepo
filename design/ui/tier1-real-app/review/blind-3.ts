// A find box: list matches as the reader types, select and frame the one they click.
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const box = document.querySelector<HTMLInputElement>("#find")!;
const list = document.querySelector<HTMLUListElement>("#hits")!;

box.addEventListener("input", () => {
    const hits = element.session.data.find(box.value, { limit: 10 });
    list.replaceChildren(
        ...hits.elements.map((hit) => {
            const li = document.createElement("li");
            li.textContent = `${hit.label} -- ${hit.matched.path}: ${String(hit.matched.value)}`;
            li.onclick = async () => {
                await element.session.selection.apply({ ids: [hit.id] });
                await element.graph?.zoomToSelection();
            };
            return li;
        }),
    );
    if (hits.total > hits.elements.length) list.append(`and ${hits.total - hits.elements.length} more`);
});
