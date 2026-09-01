/**
 * Helpers to normalize WhatsApp message content.
 *
 * WhatsApp wraps real content inside container messages (disappearing chats,
 * view once, documents with caption, edits). Anti-delete / anti-edit / anti
 * view-once must always look at the unwrapped content, otherwise the feature
 * silently ignores the message.
 */

const WRAPPER_KEYS = [
    'ephemeralMessage',
    'viewOnceMessage',
    'viewOnceMessageV2',
    'viewOnceMessageV2Extension',
    'documentWithCaptionMessage',
    'editedMessage',
    'associatedChildMessage',
    'groupStatusMessage',
    'groupStatusMessageV2'
];

function unwrapMessage(content) {
    let current = content;
    for (let i = 0; i < 5 && current; i++) {
        const key = WRAPPER_KEYS.find(k => current[k]?.message);
        if (!key) break;
        current = current[key].message;
    }
    return current;
}

function getProtocolMessage(content) {
    return unwrapMessage(content)?.protocolMessage || null;
}

function getViewOnceContent(content) {
    const inner = unwrapMessage(content);
    if (!inner) return null;
    const media = inner.imageMessage || inner.videoMessage || inner.audioMessage;
    if (!media) return null;
    const hasWrapper = !!(content?.viewOnceMessage || content?.viewOnceMessageV2 || content?.viewOnceMessageV2Extension ||
        content?.ephemeralMessage?.message?.viewOnceMessage || content?.ephemeralMessage?.message?.viewOnceMessageV2 ||
        content?.ephemeralMessage?.message?.viewOnceMessageV2Extension);
    if (!hasWrapper && !media.viewOnce) return null;
    return inner;
}

function extractText(content) {
    const inner = unwrapMessage(content);
    if (!inner) return '';
    return inner.conversation ||
        inner.extendedTextMessage?.text ||
        inner.imageMessage?.caption ||
        inner.videoMessage?.caption ||
        inner.documentMessage?.caption ||
        '';
}

module.exports = { unwrapMessage, getProtocolMessage, getViewOnceContent, extractText };
