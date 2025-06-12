let originalRange = null;
let originalText = '';

function createModal() {
    const existingModal = document.getElementById('ai-rewriter-modal');
    if (existingModal) existingModal.remove();
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'ai-rewriter-modal';
    modalOverlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); z-index: 999998; display: flex; align-items: center; justify-content: center;';
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background: white; padding: 20px; border-radius: 8px; width: 90%; max-width: 600px; box-shadow: 0 5px 15px rgba(0,0,0,0.3);';
    modalContent.innerHTML = `
        <h2 id="ai-modal-title" style="margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">AI Rewriter</h2>
        <div id="ai-modal-body" style="min-height: 100px; padding: 10px 0; line-height: 1.6;"></div>
        <div id="ai-modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;"></div>
    `;
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
    return { modalOverlay, modalContent };
}

function showLoadingState() {
    const { modalContent } = createModal();
    modalContent.querySelector('#ai-modal-title').innerText = 'Processing...';
    modalContent.querySelector('#ai-modal-body').innerHTML = '<p style="text-align: center;">The AI is thinking. Please wait.</p>';
}

function showResultState(rewrittenText, promptId) {
    const modal = document.getElementById('ai-rewriter-modal');
    if (!modal) return;
    modal.querySelector('#ai-modal-title').innerText = 'AI Suggestion';
    modal.querySelector('#ai-modal-body').innerHTML = `<textarea id="ai-rewritten-text" style="width: 100%; min-height: 150px; border: 1px solid #ccc; border-radius: 4px; padding: 10px; font-size: 14px;">${rewrittenText}</textarea>`;
    const footer = modal.querySelector('#ai-modal-footer');
    footer.innerHTML = `<button id="ai-cancel-btn">Cancel</button><button id="ai-retry-btn">Retry</button><button id="ai-replace-btn">Replace</button>`;
    styleFooterButtons(footer);
    document.getElementById('ai-cancel-btn').onclick = closeModal;
    document.getElementById('ai-retry-btn').onclick = () => {
        chrome.runtime.sendMessage({ type: 'RETRY_REWRITE', originalText, promptId });
        showLoadingState();
    };
    document.getElementById('ai-replace-btn').onclick = () => {
        const newText = document.getElementById('ai-rewritten-text').value;
        if (originalRange) {
            originalRange.deleteContents();
            originalRange.insertNode(document.createTextNode(newText));
        }
        closeModal();
    };
}

// **NEW** Function to show an error message in the modal
function showErrorState(errorMessage) {
    const { modalContent } = createModal();
    modalContent.querySelector('#ai-modal-title').innerText = 'Error';
    modalContent.querySelector('#ai-modal-body').innerHTML = `<p style="text-align: center; color: #c00;">${errorMessage}</p>`;
    const footer = modalContent.querySelector('#ai-modal-footer');
    footer.innerHTML = `<button id="ai-close-btn">Close</button>`;
    styleFooterButtons(footer);
    document.getElementById('ai-close-btn').onclick = closeModal;
}

function closeModal() {
    const modal = document.getElementById('ai-rewriter-modal');
    if (modal) modal.remove();
}

function styleFooterButtons(footer) {
    footer.querySelectorAll('button').forEach(btn => {
        btn.style.cssText = 'padding: 8px 16px; border-radius: 5px; border: 1px solid #ccc; cursor: pointer; background-color: #f0f0f0;';
    });
    const replaceBtn = footer.querySelector('#ai-replace-btn');
    if (replaceBtn) {
        replaceBtn.style.cssText += 'background-color: #28a745; color: white; border-color: #28a745;';
    }
}

// Listen for messages from the background script (FIXED)
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'REWRITE_LOADING') {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            originalRange = sel.getRangeAt(0).cloneRange();
            originalText = originalRange.toString();
            showLoadingState();
        }
    } else if (message.type === 'REWRITE_RESULT') {
        showResultState(message.rewrittenText, message.promptId);
    } else if (message.type === 'REWRITE_ERROR') {
        // **NEW** Handle the error message from the background script
        showErrorState(message.message);
    }
});
