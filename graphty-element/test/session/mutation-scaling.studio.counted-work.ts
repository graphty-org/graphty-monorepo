/** The style-row, value-label and hover methods whose work `mutation-scaling.test.ts` counts (see `test/cost-coverage/counted-work.ts`). */
import type { CountedWork } from "../cost-coverage/counted-work";

export default {
    file: "test/session/mutation-scaling.test.ts",
    methods: [
        "SelectionApi.previewHover",
        "SessionDataApi.setValueLabel",
        "StylesApi.addFolder",
        "StylesApi.addRow",
        "StylesApi.deleteRow",
        "StylesApi.hideRow",
        "StylesApi.lockRow",
        "StylesApi.moveRow",
        "StylesApi.pinRow",
        "StylesApi.renameRow",
        "StylesApi.replaceColor",
        "StylesApi.restoreStartingRows",
        "StylesApi.setFoldBelow",
        "StylesApi.setValueEntries",
        "StylesApi.setValueEntry",
        "StylesApi.updateMany",
        "StylesApi.writeRow",
    ],
} satisfies CountedWork;
