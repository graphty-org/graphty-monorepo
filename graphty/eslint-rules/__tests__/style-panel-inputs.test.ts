/**
 * The style-panel-inputs rule: an input control imported from anywhere but compact-mantine, or a native input drawn
 * by hand, is refused in the Style panel; a Mantine component compact-mantine's theme styles, and a gap the config
 * names, are let through from Mantine only.
 */

import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

import rule from "../style-panel-inputs.js";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
});

const gaps = [{ gaps: { Checkbox: "no compact-mantine check box" } }];
const themed = [{ themed: ["Button", "ActionIcon"] }];

tester.run("style-panel-inputs", rule, {
    valid: [
        'import { AnglePicker, FontPicker, ImagePicker, PanelField } from "@graphty/compact-mantine";',
        // Layout takes no input.
        'import { Group, Stack, Tooltip, VisuallyHidden } from "@mantine/core";',
        // An app component wrapping compact-mantine is checked in its own file.
        'import { ImageField } from "../ImageField";',
        'import type { TextInputProps } from "@mantine/core";',
        { code: 'import { Checkbox } from "@mantine/core";', options: gaps },
        "<div><span>x</span></div>;",
        // A namespace's layout, and compact-mantine's inputs read through a namespace.
        'import * as MC from "@mantine/core"; <MC.Group />;',
        'import * as CM from "@graphty/compact-mantine"; <CM.SegmentedControl />;',
        { code: 'import * as MC from "@mantine/core"; <MC.Checkbox />;', options: gaps },
        // A Mantine component compact-mantine's theme styles counts as compact-mantine's (owner, 2026-11-24).
        { code: 'import { ActionIcon, Button } from "@mantine/core";', options: themed },
        { code: 'import * as MC from "@mantine/core"; <MC.Button />;', options: themed },
    ],
    invalid: [
        { code: 'import { TextInput } from "@mantine/core";', errors: [{ messageId: "imported" }] },
        { code: 'import { Checkbox } from "@mantine/core";', errors: [{ messageId: "imported" }] },
        // A gap is Mantine's only: the same name from elsewhere is still refused.
        { code: 'import { Checkbox } from "./MyCheckbox";', options: gaps, errors: [{ messageId: "imported" }] },
        { code: 'import { Select } from "../parts/Select";', errors: [{ messageId: "imported" }] },
        { code: '<input type="range" />;', errors: [{ messageId: "native" }] },
        // An input read through a namespace import, in JSX or as a value.
        { code: 'import * as MC from "@mantine/core"; <MC.Select data={[]} />;', errors: [{ messageId: "imported" }] },
        { code: 'import * as MC from "@mantine/core"; const S = MC.TextInput;', errors: [{ messageId: "imported" }] },
        { code: "<button>Go</button>;", errors: [{ messageId: "native" }] },
        // An unthemed Mantine input is still refused beside themed ones, and a themed name from elsewhere is too.
        {
            code: 'import { Button, UnstyledButton } from "@mantine/core";',
            options: themed,
            errors: [{ messageId: "imported" }],
        },
        { code: 'import { Button } from "./MyButton";', options: themed, errors: [{ messageId: "imported" }] },
    ],
});
