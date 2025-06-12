// --- UI Element References ---
const apiKeyInput = document.getElementById('api-key');
const modelSelect = document.getElementById('model-select');
const loadModelsBtn = document.getElementById('load-models');
const saveSettingsBtn = document.getElementById('save-settings');
const statusDiv = document.getElementById('status');
const tempSlider = document.getElementById('temperature');
const tempValueSpan = document.getElementById('temperature-value');
const topPSlider = document.getElementById('top-p');
const topPValueSpan = document.getElementById('top-p-value');
const addPromptBtn = document.getElementById('add-prompt');
const promptTitleInput = document.getElementById('prompt-title');
const promptSystemInput = document.getElementById('prompt-system');
const customPromptsListDiv = document.getElementById('custom-prompts-list');

// --- Tab Management ---
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(button.dataset.tab).classList.add('active');
    });
});

// --- Functions (Settings Tab) ---
function updateSliderValues() {
    tempValueSpan.textContent = parseFloat(tempSlider.value).toFixed(1);
    topPValueSpan.textContent = parseFloat(topPSlider.value).toFixed(2);
}

async function populateModels() {
    // ... (This function is unchanged from the previous version)
}

function saveAllSettings() {
    // ... (This function is unchanged from the previous version)
}

function restoreSettings() {
    // ... (This function is unchanged from the previous version)
}

// --- Functions (Custom Prompts Tab) ---
function renderCustomPrompts(prompts = []) {
    customPromptsListDiv.innerHTML = '';
    if (prompts.length === 0) {
        customPromptsListDiv.innerHTML = '<p>No custom prompts yet.</p>';
        return;
    }
    const ul = document.createElement('ul');
    ul.className = 'prompt-list';
    prompts.forEach(prompt => {
        const li = document.createElement('li');
        li.className = 'prompt-item';
        li.innerHTML = `<span>${prompt.title}</span><button class="delete-btn" data-id="${prompt.id}">Delete</button>`;
        ul.appendChild(li);
    });
    customPromptsListDiv.appendChild(ul);
}

function addCustomPrompt() {
    const title = promptTitleInput.value.trim();
    const prompt = promptSystemInput.value.trim();
    if (!title || !prompt) return;

    chrome.storage.sync.get({ customPrompts: [] }, (data) => {
        const newPrompts = data.customPrompts;
        newPrompts.push({ id: `prompt_${Date.now()}`, title, prompt });
        chrome.storage.sync.set({ customPrompts: newPrompts }, () => {
            renderCustomPrompts(newPrompts);
            promptTitleInput.value = '';
            promptSystemInput.value = '';
        });
    });
}

function deleteCustomPrompt(promptId) {
    chrome.storage.sync.get({ customPrompts: [] }, (data) => {
        const filtered = data.customPrompts.filter(p => p.id !== promptId);
        chrome.storage.sync.set({ customPrompts: filtered }, () => renderCustomPrompts(filtered));
    });
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    restoreSettings();
    chrome.storage.sync.get({ customPrompts: [] }, data => renderCustomPrompts(data.customPrompts));
});
loadModelsBtn.addEventListener('click', populateModels);
saveSettingsBtn.addEventListener('click', saveAllSettings);
tempSlider.addEventListener('input', updateSliderValues);
topPSlider.addEventListener('input', updateSliderValues);
addPromptBtn.addEventListener('click', addCustomPrompt);
customPromptsListDiv.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
        deleteCustomPrompt(e.target.dataset.id);
    }
});

// --- PASTE UNCHANGED FUNCTIONS HERE ---
// (Copy the populateModels, saveAllSettings, and restoreSettings functions from the previous step and paste them here)
async function populateModels() {
    const apiKey = apiKeyInput.value;
    if (!apiKey) { statusDiv.textContent = 'Please enter an API key first.'; return; }
    modelSelect.innerHTML = '<option>Loading...</option>'; modelSelect.disabled = true; statusDiv.textContent = 'Fetching models...';
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) throw new Error('Invalid API Key or Network Error.');
        const data = await response.json();
        modelSelect.innerHTML = '';
        data.models.filter(m => m.supportedGenerationMethods.includes('generateContent')).forEach(m => {
            const option = document.createElement('option');
            option.value = m.name; option.textContent = m.displayName; modelSelect.appendChild(option);
        });
        modelSelect.disabled = false; statusDiv.textContent = 'Models loaded. Remember to save!';
    } catch (error) {
        modelSelect.innerHTML = '<option>Could not load</option>'; statusDiv.textContent = error.message;
    }
}
function saveAllSettings() {
    const settings = { apiKey: apiKeyInput.value, selectedModel: modelSelect.value, temperature: parseFloat(tempSlider.value), topP: parseFloat(topPSlider.value) };
    chrome.storage.sync.set(settings, () => {
        statusDiv.textContent = 'Settings Saved!';
        setTimeout(() => { statusDiv.textContent = ''; }, 2000);
    });
}
function restoreSettings() {
    chrome.storage.sync.get(['apiKey', 'selectedModel', 'temperature', 'topP'], (data) => {
        if (data.apiKey) {
            apiKeyInput.value = data.apiKey;
            populateModels().then(() => { if (data.selectedModel) modelSelect.value = data.selectedModel; });
        }
        if (data.temperature) tempSlider.value = data.temperature;
        if (data.topP) topPSlider.value = data.topP;
        updateSliderValues();
    });
}
