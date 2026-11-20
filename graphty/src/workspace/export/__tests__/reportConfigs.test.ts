import { assert, describe, it } from "vitest";

import { DEFAULT_REPORT } from "../choices";
import { choicesWithConfig, configFromChoices, parseReportConfigFile, reportConfigFile } from "../reportConfigs";

describe("report configuration files", () => {
    it("round-trips a report's shape and leaves out its prose", () => {
        const choices = {
            ...DEFAULT_REPORT,
            title: "Study",
            rowCap: 5,
            sections: ["image", "notes"] as const,
            summary: "x",
        };
        const config = configFromChoices("Study", choices);
        const back = parseReportConfigFile(reportConfigFile(config));
        assert.deepEqual(back, { name: "Study", title: "Study", rowCap: 5, sections: ["image", "notes"] });
        assert.notInclude(reportConfigFile(config), '"summary"');
        const loaded = choicesWithConfig({ ...DEFAULT_REPORT, summary: "mine" }, config);
        assert.equal(loaded.summary, "mine");
        assert.deepEqual(loaded.sections, ["image", "notes"]);
    });

    it("refuses a file that is not a report, and drops sections it does not know", () => {
        assert.isUndefined(parseReportConfigFile("not json"));
        assert.isUndefined(parseReportConfigFile(JSON.stringify({ name: "a", sections: [] })));
        const odd = parseReportConfigFile(
            JSON.stringify({
                kind: "graphty-report",
                version: 1,
                name: " A ",
                rowCap: -1,
                sections: ["notes", "maps"],
            }),
        );
        assert.deepEqual(odd, { name: "A", title: "", rowCap: 20, sections: ["notes"] });
    });
});
