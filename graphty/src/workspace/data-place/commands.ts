import { defineRegistration } from "../commands/registry";

/**
 * The Data place package's registration. A click on an Attributes row opens the `attribute`
 * inspected kind, which the Inspector registers and draws (tier1-design.md section 2.7); its row
 * menus act on the row they were opened on, so they are not commands.
 */
export const registration = defineRegistration({
    owner: "data-place",
    commands: [],
});
