let lastRewriteData = null;
let activeSelection = null;

// Function to replace the selected text
function replaceSelectedText(replacementText) {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        let range = sel.getRangeAt(0);
        
        // This is the element we are editing
        activeSelection = {
            element: range.commonAncestorContainer,
            range: range
        };

        range.deleteContents();
        range.insertNode(document.createTextNode(replacementText));
        return range.getBoundingClientRect(); // Return position for the UI
    }
    return null;
}

// Function to create and show the Undo/Retry UI
function showActionUI(position, originalText, promptId) {
    // Remove any existing UI first
    const existingUI = document.getElementById('ai-rewriter-action-ui');
    if (existingUI) existingUI.remove();

    const ui = document.createElement('div');
    ui.id = 'ai-rewriter-action-ui';
    ui.style.position = 'absolute';
    ui.style.top = `${window.scrollY + position.bottom + 5}px`;
    ui.style.left = `${window.scrollX + position.left}px`;
    ui.style.backgroundColor = 'white';
    ui.style.border = '1px solid #ccc';
    ui.style.borderRadius = '6px';
    ui.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    ui.style.padding = '4px';
    ui.style.zIndex = '999999';
    ui.style.display = 'flex';
    ui.style.gap = '4px';

    const undoButton = document.createElement('button');
    undoButton.innerText = 'Undo';
    styleButton(undoButton);
    undoButton.onclick = () => {
        const range = activeSelection.range;
        range.deleteContents();
        range.insertNode(document.createTextNode(originalText));
        ui.remove();
    };

    const retryButton = document.createElement('button');
    retryButton.innerText = 'Retry';
    styleButton(retryButton);
    retryButton.onclick = () => {
        chrome.runtime.sendMessage({ type: 'RETRY_REWRITE', originalText, promptId });
        ui.remove();
    };

    ui.appendChild(undoButton);
    ui.appendChild(retryButton);
    document.body.appendChild(ui);

    // Auto-hide the UI after 7 seconds
    setTimeout(() => ui.remove(), 7000);
}

function styleButton(button) {
    button.style.border = '1px solid #ccc';
    button.style.backgroundColor = '#f0f0f0';
    button.style.color = '#333';
    button.style.padding = '5px 10px';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'REWRITE_LOADING') {
        // Optional: could show a temporary loading indicator
        console.log('AI Rewriter is thinking...');
    } else if (message.type === 'REWRITE_RESULT') {
        const position = replaceSelectedText(message.rewrittenText);
        if (position) {
            showActionUI(position, message.originalText, message.promptId);
        }
    }
});
