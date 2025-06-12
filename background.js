// --- NEW & IMPROVED Default Prompts ---
const defaultPrompts = [
    {
        id: 'improve',
        title: 'Improve Writing',
        prompt: 'You are a communication expert. Rewrite the following text, which may be from an email or SMS message, to be more clear, professional, and effective. Retain the core message and original intent.'
    },
    {
        id: 'fix',
        title: 'Fix Spelling & Grammar',
        prompt: 'You are a meticulous editor. Correct any spelling mistakes and grammatical errors in the following text. Do not change the meaning or tone unless it is grammatically necessary.'
    },
    {
        id: 'shorter',
        title: 'Make Shorter',
        prompt: 'You are an editor skilled in brevity. Condense the following text for an email or SMS message. Make it as concise as possible without losing the essential meaning or a polite, professional tone.'
    },
    {
        id: 'longer',
        title: 'Add Detail',
        prompt: 'You are a helpful assistant. Expand on the following text for an email, adding relevant details, clarification, or a more thorough explanation. Ensure the tone remains professional and appropriate for the context.'
    },
    {
        id: 'casual',
        title: 'Change Tone: Casual',
        prompt: 'Rewrite the following text in a more casual, friendly, and conversational tone, as if speaking to a colleague you know well.'
    },
    {
        id: 'professional',
        title: 'Change Tone: Professional',
        prompt: 'Rewrite the following text in a more formal, polished, and professional tone suitable for communicating with clients or senior management.'
    }
];

// --- Context Menu Management (Unchanged from last version) ---
function updateContextMenu() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({ id: 'rewrite-parent', title: 'AI Rewriter', contexts: ['selection'] });
        defaultPrompts.forEach(p => chrome.contextMenus.create({ id: p.id, parentId: 'rewrite-parent', title: p.title, contexts: ['selection'] }));
        chrome.storage.sync.get({ customPrompts: [] }, (data) => {
            if (data.customPrompts && data.customPrompts.length > 0) {
                chrome.contextMenus.create({ id: 'separator-1', parentId: 'rewrite-parent', type: 'separator', contexts: ['selection'] });
                data.customPrompts.forEach(p => chrome.contextMenus.create({ id: p.id, parentId: 'rewrite-parent', title: p.title, contexts: ['selection'] }));
            }
        });
    });
}

// --- API Call (Unchanged from last version) ---
async function callGeminiAPI(text, systemPrompt, apiKey, model, generationConfig) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model.replace('models/', '')}:generateContent?key=${apiKey}`;
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\n---\n\n${text}` }] }],
                generationConfig: generationConfig
            })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts.length > 0) {
            return data.candidates[0].content.parts[0].text;
        }
        return "Model response was empty. This might be due to safety filters.";
    } catch (error) {
        return `Error: ${error.message}`;
    }
}

// --- Main Handler Function (Unchanged from last version) ---
async function handleRewriteRequest(text, promptId, tabId) {
    chrome.storage.sync.get(['apiKey', 'selectedModel', 'customPrompts', 'temperature', 'topP'], async (data) => {
        if (!data.apiKey || !data.selectedModel) {
            chrome.runtime.openOptionsPage();
            return;
        }
        const allPrompts = [...defaultPrompts, ...(data.customPrompts || [])];
        const clickedPrompt = allPrompts.find(p => p.id === promptId);
        if (!clickedPrompt) return;

        chrome.tabs.sendMessage(tabId, { type: 'REWRITE_LOADING' });

        const generationConfig = {
            temperature: data.temperature || 1.0,
            topP: data.topP || 0.95,
        };

        const rewrittenText = await callGeminiAPI(text, clickedPrompt.prompt, data.apiKey, data.selectedModel, generationConfig);
        
        chrome.tabs.sendMessage(tabId, { type: 'REWRITE_RESULT', rewrittenText, promptId });
    });
}

// --- Event Listeners (Unchanged from last version) ---
chrome.runtime.onInstalled.addListener(updateContextMenu);
chrome.storage.onChanged.addListener(updateContextMenu);

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (tab && tab.id && info.selectionText) {
        handleRewriteRequest(info.selectionText, info.menuItemId, tab.id);
    }
});

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'RETRY_REWRITE' && sender.tab && sender.tab.id) {
        handleRewriteRequest(message.originalText, message.promptId, sender.tab.id);
    }
});
