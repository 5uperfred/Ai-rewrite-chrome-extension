// Function to replace the selected text. It now returns the range object for later use.
function replaceSelectedText(replacementText) {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        let range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(replacementText));
        return range; // Return the range object itself
    }
    return null;
}

// Function to create and show the Undo/Retry UI. It now accepts the range object.
function showActionUI(range, originalText, promptId) {
    const existingUI = document.getElementById('ai-rewriter-action-ui');
    if (existingUI) existingUI.remove();

    const position = range.getBoundingClientRect();
    const ui = document.createElement('div');
    ui.id = 'ai-rewriter-action-ui';
    // ... (all the styling from before remains the same) ...
    ui.style.position = 'absolute';
    ui.style.top = `${window.scrollY + position.bottom + 5}px`;
    ui.style.left = `${window.scrollX + position.left}px`;
    ui.style.zIndex = '999999';
    ui.style.display = 'flex';
    ui.style.gap = '4px';
    ui.style.padding = '4px';
    ui.style.backgroundColor = 'white';
    ui.style.border = '1px solid #ccc';
    ui.style.borderRadius = '6px';
    ui.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';

    const undoButton = document.createElement('button');
    undoButton.innerText = 'Undo';
    styleButton(undoButton);
    undoButton.onclick = () => {
        // FIX: The 'range' is now directly available from the function's closure.
        range.deleteContents();
        range.insertNode(document.createTextNode(originalText));
        ui.remove();
    };

    const retryButton = document.createElement('button');
    retryButton.innerText = 'Retry';
    styleButton(retryButton);
    retryButton.onclick = () => {
        // Put the original text back before retrying
        range.deleteContents();
        range.insertNode(document.createTextNode(originalText));
        chrome.runtime.sendMessage({ type: 'RETRY_REWRITE', originalText, promptId });
        ui.remove();
    };

    ui.appendChild(undoButton);
    ui.appendChild(retryButton);
    document.body.appendChild(ui);

    setTimeout(() => { if (ui) ui.remove(); }, 7000);
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
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'REWRITE_RESULT') {
        const range = replaceSelectedText(message.rewrittenText);
        if (range) {
            showActionUI(range, message.originalText, message.promptId);
        }
    }
});
