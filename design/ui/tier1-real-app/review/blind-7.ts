// Blind-author example: tell the reader how many labels the overlap rule hid, and offer "show all".
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const status = document.querySelector<HTMLElement>("#label-status")!;
const toggle = document.querySelector<HTMLButtonElement>("#show-all-labels")!;
const { labels } = element.session;

function render(r: { requested: number; drawn: number; hiddenByOverlap: number }): void {
    status.textContent = `${r.requested} labels, ${r.hiddenByOverlap} hidden to avoid overlap`;
    toggle.textContent = labels.overlap === "hide" ? "Show all labels" : "Hide overlapping labels";
}

render(labels.report());
element.session.on("labels:changed", render);
toggle.onclick = () => void labels.setOverlap(labels.overlap === "hide" ? "show" : "hide");
