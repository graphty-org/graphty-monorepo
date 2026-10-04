import { defineRegistration } from "../commands/registry";

/**
 * The Data place package's registration: the attribute inspected kind (tier1-design.md section
 * 2.7, "Attribute (from Data)": one body, no tabs), which a click on an Attributes row opens. Its
 * row menus act on the row they were opened on, so they are not commands.
 */
export const registration = defineRegistration({
    owner: "data-place",
    commands: [],
    inspectedKinds: [{ kind: "attribute", tabs: [] }],
});
