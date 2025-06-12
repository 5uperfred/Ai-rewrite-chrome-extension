// --- Default Prompts (Unchanged) ---
const defaultPrompts = [
    { id: 'improve', title: 'Improve Writing', prompt: 'Improve the following text, making it more clear, concise, and professional.' },
    { id: 'fix', title: 'Fix Spelling & Grammar', prompt: 'Correct any spelling mistakes and grammatical errors in the following text.' },
    { id: 'shorter', title: 'Make Shorter', prompt: 'Rewrite the following text to be more concise and to the point.' },
    { id: 'longer', title: 'Make Longer', prompt: 'Expand on the following text, adding more detail and explanation while maintaining the original meaning.' },
    { id: 'casual', title: 'Change Tone: Casual', prompt: 'Rewrite the following text in a more casual and friendly tone.' },
    { id: 'professional', title: 'Change Tone: Professional', prompt: 'Rewrite the following text in a more formal and professional tone.' }
];

// --- Context Menu Management (Unchanged) ---
function updateContextMenu() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({ id: 'rewrite-parent', title: 'AI Rewriter', contexts: ['selection'] });
        defaultPrompts.forEach(p => chrome.contextMenus.create({ id: p.id, parentId: 'rewrite-parent', title: p.title, contexts: ['selection'] }));
        chrome.contextMenus.create({ id: 'separator-1', parentId: 'rewrite-parent', type: 'separator', contexts: ['selection'] });
        chrome.storage.sync.get({ customPrompts: [] }, (data) => {
            if (data.customPrompts.length > 0) {
                data.customPrompts.forEach(p => chrome.contextMenus.create({ id: p.id, parentId: 'rewrite-parent', title: p.title, contexts: ['selection'] }));
            } else {
                chrome.contextMenus.create({ id: 'no-custom-prompts', parentId: 'rewrite-parent', title: 'Add custom prompts in options...', contexts: ['selection'], enabled: false });
            }
        });
    });
}

// --- API Call (Unchanged) ---
async function callGeminiAPI(text, systemPrompt, apiKey, model) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model.replace('models/', '')}:generateContent?key=${apiKey}`;
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\n\n---\n\n${text}` }] }] })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts.length > 0) {
            return data.candidates[0].content.parts[0].text;
        }
        return "The model did not return a valid response. This might be due to the safety filter.";
    } catch (error) {
        console.error('Gemini API Error:', error);
        return `Error: ${error.message}`;
    }
}

// --- Main Handler Function ---
async function handleRewriteRequest(text, promptId, tabId) {
    chrome.storage.sync.get(['apiKey', 'selectedModel', 'customPrompts'], async (data) => {
        if (!data.apiKey || !data.selectedModel) {
            chrome.runtime.openOptionsPage();
            return;
        }

        const allPrompts = [...defaultPrompts, ...(data.customPrompts || [])];
        const clickedPrompt = allPrompts.find(p => p.id === promptId);
        if (!clickedPrompt) return;

        // Let the content script know we're working on it
        chrome.tabs.sendMessage(tabId, { type: 'REWRITE_LOADING' });

        const rewrittenText = await callGeminiAPI(text, clickedPrompt.prompt, data.apiKey, data.selectedModel);
        
        // Send the final result to the content script
        chrome.tabs.sendMessage(tabId, {
            type: 'REWRITE_RESULT',
            rewrittenText: rewrittenText,
            originalText: text,
            promptId: promptId
        });
    });
}

// --- Event Listeners ---
chrome.runtime.onInstalled.addListener(updateContextMenu);
chrome.runtime.onStartup.addListener(updateContextMenu);
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && (changes.customPrompts || changes.apiKey || changes.selectedModel)) {
        updateContextMenu();
    }
});

// Listener for context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.selectionText) {
        handleRewriteRequest(info.selectionText, info.menuItemId, tab.id);
    }
});

// Listener for messages from the content script (for retries)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'RETRY_REWRITE') {
        handleRewriteRequest(message.originalText, message.promptId, sender.tab.id);
    }
    return true; // Indicates we will send a response asynchronously
});
