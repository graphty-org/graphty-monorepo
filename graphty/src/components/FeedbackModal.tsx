import {Button, FileInput, Group, Modal, Stack, Textarea, TextInput} from "@mantine/core";
import {Paperclip, Send} from "lucide-react";
import {useState} from "react";

import {type AttachmentData, captureUserFeedback} from "../lib/sentry";

interface FeedbackModalProps {
    opened: boolean;
    onClose: () => void;
}

/**
 * Convert a File to AttachmentData for Sentry.
 */
async function fileToAttachment(file: File): Promise<AttachmentData> {
    const arrayBuffer = await file.arrayBuffer();
    return {
        filename: file.name,
        data: new Uint8Array(arrayBuffer),
        contentType: file.type || "application/octet-stream",
    };
}

export function FeedbackModal({opened, onClose}: FeedbackModalProps): React.JSX.Element {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = (): void => {
        setLoading(true);

        // Convert files to attachments and submit
        void Promise.all(files.map(fileToAttachment))
            .then((attachments) => {
                captureUserFeedback({
                    name: name || undefined,
                    email: email || undefined,
                    message,
                    attachments: attachments.length > 0 ? attachments : undefined,
                });
            })
            .then(() => {
                // Reset form and close modal
                setName("");
                setEmail("");
                setMessage("");
                setFiles([]);
                onClose();
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const handleClose = (): void => {
        // Reset form on close
        setName("");
        setEmail("");
        setMessage("");
        setFiles([]);
        onClose();
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
                    <TextInput
                        label="Name (optional)"
                        placeholder="Your name"
                        name="feedback-search-sender"
                        value={name}
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        onChange={(e) => {
                            setName(e.currentTarget.value);
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
                            setEmail(e.currentTarget.value);
                        }}
                    />
                    <Textarea
                        label="What happened? *"
                        placeholder="Describe the issue or feedback..."
                        required
                        minRows={4}
                        value={message}
                        onChange={(e) => {
                            setMessage(e.currentTarget.value);
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
                    <Group justify="flex-end">
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
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}
