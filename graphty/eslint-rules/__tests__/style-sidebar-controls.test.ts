/**
 * The style-sidebar-controls rule: a component from a UI library that src/workspace/style/approved-controls.json
 * does not list is refused in the Style sidebar, unless it sits in a pop-over, a menu's list, a dialog or a
 * tooltip's label.
 */

import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

import rule from "../style-sidebar-controls.js";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
});

const MANTINE = 'import { Badge, Button, Menu, Text, Tooltip } from "@mantine/core";\n';
const COMPACT = 'import { Popout, VariablePill, InfoCircle } from "@graphty/compact-mantine";\n';
const unapproved = [{ messageId: "unapproved" }];

tester.run("style-sidebar-controls", rule, {
    valid: [
        // Approved controls, and their parts.
        `${MANTINE}<Button>Add</Button>;`,
        `${MANTINE}<Menu><Menu.Target><Button>More</Button></Menu.Target></Menu>;`,
        `${COMPACT}<VariablePill name="degree" />;`,
        // The app's own components, and plain elements: the files that define them are checked.
        'import { ControlLabel } from "./ControlLabel";\n<ControlLabel>Color</ControlLabel>;',
        "<div><span>x</span></div>;",
        // Information beside the sidebar: a pop-over's panel, a menu's list, a tooltip's label.
        `${MANTINE}${COMPACT}<Popout><Popout.Panel><Text>3 of 7 nodes</Text></Popout.Panel></Popout>;`,
        `${MANTINE}<Menu><Menu.Dropdown><Text>Hint</Text></Menu.Dropdown></Menu>;`,
        `${MANTINE}<Tooltip label={<Text>Not loaded</Text>}><Button>Parts</Button></Tooltip>;`,
        // A type import is no component.
        'import type { BadgeProps } from "@mantine/core";\nconst p: BadgeProps = {};',
    ],
    invalid: [
        { code: `${MANTINE}<Badge>Without 1</Badge>;`, errors: unapproved },
        { code: `${MANTINE}<Text size="xs">Covered by Layer 1</Text>;`, errors: unapproved },
        { code: `${COMPACT}<InfoCircle />;`, errors: unapproved },
        { code: 'import { Pill as P } from "@mantine/core";\n<P>x</P>;', errors: unapproved },
        { code: 'import { Alert } from "@mantine/core";\n<Alert.Title>x</Alert.Title>;', errors: unapproved },
        // A tooltip's children are in the sidebar; only its label is not.
        { code: `${MANTINE}<Tooltip label="x"><Badge>0</Badge></Tooltip>;`, errors: unapproved },
        // A pop-over's trigger is in the sidebar.
        {
            code: `${MANTINE}${COMPACT}<Popout><Popout.Trigger><Badge>2 missing</Badge></Popout.Trigger></Popout>;`,
            errors: unapproved,
        },
    ],
});
