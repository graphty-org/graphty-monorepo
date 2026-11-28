import { ModalFooter } from "@graphty/compact-mantine";
import { Alert, Button, FileInput, Modal, Stack, Textarea, TextInput } from "@mantine/core";
import { AlertTriangle, CheckCircle, Paperclip, Send } from "lucide-react";
import { useState } from "react";

import { type AttachmentData, captureUserFeedback, type FeedbackResult } from "../lib/sentry";

/** What the reader typed: Name, Email and the message. */
export interface FeedbackDraft {
    readonly name: string;
    readonly email: string;
    readonly message: string;
}

/** Nothing typed yet. */
const EMPTY_DRAFT: FeedbackDraft = { name: "", email: "", message: "" };

interface FeedbackModalProps {
    opened: boolean;
    onClose: () => void;
    /** Sends the feedback; Sentry's by default. Tests pass one that records it. */
    send?: typeof captureUserFeedback;
    /**
     * What is typed, when the caller keeps it (the workspace keeps it across a reload); without
     * it, the modal holds it itself.
     */
    draft?: FeedbackDraft;
    /** Takes what is typed, with `draft`. */
    onDraftChange?: (draft: FeedbackDraft) => void;
}

/**
 * Convert a File to AttachmentData for Sentry.
 * @param file - The file to convert
 * @returns The attachment data for Sentry
 */
async function fileToAttachment(file: File): Promise<AttachmentData> {
    const arrayBuffer = await file.arrayBuffer();
    return {
        filename: file.name,
        data: new Uint8Array(arrayBuffer),
        contentType: file.type || "application/octet-stream",
    };
}

/**
 * Modal for submitting user feedback with optional attachments.
 * @param root0 - Component props
 * @param root0.opened - Whether the modal is open
 * @param root0.onClose - Close the modal
 * @param root0.send - Sends the feedback; Sentry's by default
 * @param root0.draft - What is typed, when the caller keeps it
 * @param root0.onDraftChange - Takes what is typed, with `draft`
 * @returns The feedback modal component
 */
export function FeedbackModal({
    opened,
    onClose,
    send = captureUserFeedback,
    draft,
    onDraftChange,
}: Readonly<FeedbackModalProps>): React.JSX.Element {
    // on reload: fresh: derived: used only without `draft`; the workspace passes its kept feedbackDraft
    const [own, setOwn] = useState(EMPTY_DRAFT);
    const typed = draft ?? own;
    const { name, email, message } = typed;
    const setTyped = (next: FeedbackDraft): void => {
        (onDraftChange ?? setOwn)(next);
    };
    // on reload: fresh: in flight: files picked to attach, which a browser gives back to no page after a reload
    const [files, setFiles] = useState<File[]>([]);
    // on reload: fresh: in flight: a send under way
    const [loading, setLoading] = useState(false);
    // on reload: fresh: notice: why the last send failed
    const [result, setResult] = useState<FeedbackResult | null>(null);

    const handleClose = (): void => {
        // Reset form on close
        setTyped(EMPTY_DRAFT);
        setFiles([]);
        setResult(null);
        onClose();
    };

    const handleSubmit = (): void => {
        setLoading(true);
        setResult(null);

        // Convert files to attachments and submit
        void Promise.all(files.map(fileToAttachment))
            .then((attachments) => {
                const feedbackResult = send({
                    name: name || undefined,
                    email: email || undefined,
                    message,
                    attachments: attachments.length > 0 ? attachments : undefined,
                });
                if (feedbackResult.success) {
                    // Reset everything, the result included: the modal stays mounted, so a
                    // kept result would greet the next open with a stale alert.
                    handleClose();
                } else {
                    // Keep the modal open so the user sees the error
                    setResult(feedbackResult);
                }
            })
            .catch((error: unknown) => {
                console.error("[FeedbackModal] Error during submission:", error);
                setResult({
                    success: false,
                    message: "An unexpected error occurred. Please try again.",
                });
            })
            .finally(() => {
                setLoading(false);
            });
    };

    return (
        <Modal opened={opened} onClose={handleClose} title="Send Feedback">
            {/* Form wrapper with password manager ignore attributes.
                Using "search" in form ID prevents LastPass from treating this as a login form. */}
            <form
                id="feedback-search-form"
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore
                autoComplete="off"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                }}
            >
                <Stack gap="md">
                    {result && !result.success && (
                        <Alert color="red" icon={<AlertTriangle size={16} />} title="Error">
                            {result.message}
                        </Alert>
                    )}
                    {result?.success && (
                        <Alert color="green" icon={<CheckCircle size={16} />} title="Success">
                            {result.message}
                        </Alert>
                    )}
                    <TextInput
                        label="Name (optional)"
                        placeholder="Your name"
                        name="feedback-search-sender"
                        value={name}
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        onChange={(e) => {
                            setTyped({ ...typed, name: e.currentTarget.value });
                        }}
                    />
                    <TextInput
                        label="Email (optional)"
                        placeholder="your.email@example.com"
                        name="feedback-search-contact"
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        value={email}
                        onChange={(e) => {
                            setTyped({ ...typed, email: e.currentTarget.value });
                        }}
                    />
                    <Textarea
                        label="What happened? *"
                        placeholder="Describe the issue or feedback..."
                        required
                        minRows={4}
                        value={message}
                        onChange={(e) => {
                            setTyped({ ...typed, message: e.currentTarget.value });
                        }}
                    />
                    <FileInput
                        label="Attachments (optional)"
                        placeholder="Click to attach files"
                        leftSection={<Paperclip size={16} />}
                        multiple
                        value={files}
                        onChange={setFiles}
                        clearable
                    />
                    <ModalFooter>
                        <Button variant="subtle" onClick={handleClose} type="button">
                            Cancel
                        </Button>
                        <Button
                            leftSection={<Send size={16} />}
                            type="submit"
                            disabled={!message.trim()}
                            loading={loading}
                        >
                            Send Feedback
                        </Button>
                    </ModalFooter>
                </Stack>
            </form>
        </Modal>
    );
}
