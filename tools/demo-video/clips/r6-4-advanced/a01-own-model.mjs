// Chapter 9, advanced styling: your own 3D model. Shape > Model... > Add custom model..., the duck
// chosen through the drawn Open dialog, Add model: every node of Les Miserables becomes a duck.
import { DUCK, everything, inspector, ready3D, REST } from "./adv.js";

export default {
    id: "advanced-own-model",
    chapter: 9,
    caption: "Your own 3D model as the node shape",
    dataset: "Les Miserables",
    async setup(h) {
        await ready3D(h);
        await everything(h, "Node");
        await h.park({ x: 1250, y: 700 });
    },
    async run(h) {
        const { page } = h;
        await h.click(inspector(page).getByRole("button", { name: /^Node shape, / }));
        // the list holds dozens of shapes; Model... is last: scroll it into the list's view
        const list = page.getByRole("listbox", { name: /^Node shape/ });
        const model = list.getByRole("option", { name: "Model..." });
        await h.waitFor(list);
        const [lb, ob] = [await list.boundingBox(), await model.boundingBox()];
        await h.scroll(list, Math.round(ob.y + ob.height - (lb.y + lb.height) + 40), { ms: 600 });
        await h.app.frames(20); // the list's smooth scroll has ended
        await h.click(model);
        await h.click(page.getByRole("button", { name: "Add custom model..." }));
        const dialog = page.getByRole("dialog", { name: "Load custom model" });
        await h.openFile(dialog.getByRole("button", { name: "Choose file" }), DUCK, {
            folder: "3D models",
            files: ["Duck.glb", "Lantern.glb", "Rocket.gltf", "Teapot.obj", "Tree.glb"],
        });
        await h.waitFor(dialog.getByRole("img", { name: /^Duck preview/ }));
        await h.click(dialog.getByRole("button", { name: "Add model" }));
        await h.waitFor(inspector(page).getByRole("combobox", { name: "Node shape, Duck" }));
        await h.move(REST);
        await h.app.settled();
        h.mark("ducks");
    },
    holdMs: 2500,
};
