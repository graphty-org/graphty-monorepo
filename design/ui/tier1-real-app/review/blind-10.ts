// Blind-author example: save the whole graph to a file, and open it again.
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { project } = element.session;

document.querySelector("#save")!.addEventListener("click", async () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(await project.save());
    link.download = `${project.name ?? "untitled"}.graphty`;
    link.click();
});

document.querySelector<HTMLInputElement>("#open")!.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const report = await project.open(file);
    for (const m of report.missing) console.warn(`${m.part} not restored: ${m.reason}`);
});

element.session.on("project:changed", () => {
    document.title = `${project.dirty ? "* " : ""}${project.name ?? "Untitled"}`;
});
