/**
 * The two PostHog API surveys the app looks for (usage-analytics.md section 4.4), as the stand-in
 * client returns them, for the survey card's tests and stories.
 */
import type { Survey } from "posthog-js";

import { SURVEY_NAMES } from "../../../lib/analytics";

/** The use-case question's choices, the last being PostHog's open "Other" choice. */
export const USE_CASE_CHOICES = [
    "Explore my own network data",
    "Analyze a network for research or work",
    "Make a figure for a paper or talk",
    "Teach or learn about graphs",
    "Journalism or investigation",
    "Just looking around",
    "Other",
];

/** "What are you trying to do?" */
export const USE_CASE_SURVEY = {
    id: "survey-use-case",
    name: SURVEY_NAMES.useCase,
    type: "api",
    questions: [
        {
            id: "q-use",
            type: "single_choice",
            question: "What are you trying to do?",
            choices: USE_CASE_CHOICES,
            hasOpenChoice: true,
        },
    ],
} as unknown as Survey;

/** "How easy was it to get this export?" */
export const EXPORT_EASE_SURVEY = {
    id: "survey-export-ease",
    name: SURVEY_NAMES.exportEase,
    type: "api",
    questions: [
        {
            id: "q-ease",
            type: "rating",
            display: "number",
            scale: 5,
            question: "How easy was it to get this export?",
            lowerBoundLabel: "Very hard",
            upperBoundLabel: "Very easy",
        },
    ],
} as unknown as Survey;
