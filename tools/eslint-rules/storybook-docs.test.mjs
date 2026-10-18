// Tests of the storybook-docs lint rule.
//
//   node tools/eslint-rules/storybook-docs.test.mjs
import { describe, it } from "node:test";

import { RuleTester } from "eslint";

import rule from "./storybook-docs.mjs";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2024, sourceType: "module" } });

const META = `export default { title: "Data/Formats", tags: ["autodocs"], parameters: { docs: { description: { component: "Every format." } } } };`;
const SOURCE = `parameters: { docs: { source: { code: "<graphty-element></graphty-element>" } } }`;
const err = (messageId) => ({ messageId });

tester.run("storybook-docs", rule, {
    valid: [
        `${META}\nexport const GraphML = { ${SOURCE} };`,
        // The meta's source covers every story.
        `export default { tags: ["autodocs"], parameters: { docs: { description: { component: "x" }, source: { code: "y" } } } };\nexport const A = {};`,
        // A hidden story needs no source and may assert.
        `${META}\nexport const AInteractions = { tags: ["regression", "!dev", "!autodocs"], play: async () => { expect(1).toBe(1); } };`,
        // A play that drives the demo without checking it.
        `${META}\nexport const Drag = { ${SOURCE}, play: async ({ canvasElement }) => { await userEvent.click(canvasElement); } };`,
        // "!autodocs" on a file that shares its title.
        `export default { tags: ["!autodocs"], parameters: { docs: { description: { component: "x" }, source: { code: "y" } } } };`,
        // What the file cannot show passes: a spread meta, tags from another module, a story from a call.
        `export default { ...base };\nexport const A = {};`,
        `import { HIDDEN } from "./tags";\n${META}\nexport const A = { tags: HIDDEN, play: async () => expect(1).toBe(1) };`,
        `${META}\nexport const A = Template.bind({});\nA.parameters = { docs: { source: { code: "x" } } };`,
        // A meta held in a const, with TypeScript's satisfies stripped by the parser is plain JS here.
        `const meta = { tags: ["autodocs"], parameters: { docs: { description: { component: "x" }, source: { code: "y" } } } };\nexport default meta;`,
        // Not a story.
        `${META}\nexport const __namedExportsOrder = ["A"];`,
    ],
    invalid: [
        {
            code: `export default { tags: ["autodocs"], parameters: { docs: { source: { code: "y" } } } };`,
            errors: [err("description")],
        },
        {
            code: `export default { parameters: { docs: { description: { component: "x" }, source: { code: "y" } } } };`,
            errors: [err("autodocs")],
        },
        {
            code: `export default { tags: ["autodocs"], parameters: { docs: { description: { component: "Fixed in #123, see design/x.md, unlike 1.x." }, source: { code: "y" } } } };`,
            errors: [err("description-content"), err("description-content"), err("description-content")],
        },
        { code: `${META}\nexport const A = {};`, errors: [err("source")] },
        { code: `${META}\nexport const A = () => "<div></div>";`, errors: [err("source")] },
        {
            code: `${META}\nexport const A = { ${SOURCE}, play: async () => { await expect(canvas.getByRole("button")).toBeVisible(); } };`,
            errors: [err("play")],
        },
        {
            code: `${META}\nexport const A = { ${SOURCE}, async play() { await waitFor(() => count() === 1 || fail().toBe(1)); } };`,
            errors: [err("play")],
        },
        {
            code: `${META}\nexport const A = { ${SOURCE}, play: async () => { expect.soft(1).toBe(1); } };`,
            errors: [err("play")],
        },
        {
            code: `${META}\nexport const A = { parameters: { docs: { description: { story: "Pins #42." } } } };`,
            errors: [err("source"), err("description-content")],
        },
    ],
});
