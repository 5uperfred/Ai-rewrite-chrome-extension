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

// --- Functions ---

// Updates the text display for sliders
function updateSliderValues() {
    tempValueSpan.textContent = parseFloat(tempSlider.value).toFixed(1);
    topPValueSpan.textContent = parseFloat(topPSlider.value).toFixed(2);
}

// Fetches models from Google API
async function populateModels() {
    const apiKey = apiKeyInput.value;
    if (!apiKey) {
        statusDiv.textContent = 'Please enter an API key first.';
        return;
    }
    modelSelect.innerHTML = '<option>Loading...</option>';
    modelSelect.disabled = true;
    statusDiv.textContent = 'Fetching models...';

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) throw new Error('Invalid API Key or Network Error.');
        const data = await response.json();
        modelSelect.innerHTML = '';
        data.models
            .filter(m => m.supportedGenerationMethods.includes('generateContent'))
            .forEach(m => {
                const option = document.createElement('option');
                option.value = m.name;
                option.textContent = m.displayName;
                modelSelect.appendChild(option);
            });
        modelSelect.disabled = false;
        statusDiv.textContent = 'Models loaded. Remember to save!';
    } catch (error) {
        modelSelect.innerHTML = '<option>Could not load</option>';
        statusDiv.textContent = error.message;
    }
}

// Saves all settings to chrome.storage
function saveAllSettings() {
    const settings = {
        apiKey: apiKeyInput.value,
        selectedModel: modelSelect.value,
        temperature: parseFloat(tempSlider.value),
        topP: parseFloat(topPSlider.value)
    };

    chrome.storage.sync.set(settings, () => {
        statusDiv.textContent = 'Settings Saved!';
        setTimeout(() => { statusDiv.textContent = ''; }, 2000);
    });
}

// Restores settings from chrome.storage when popup opens
function restoreSettings() {
    chrome.storage.sync.get(['apiKey', 'selectedModel', 'temperature', 'topP'], (data) => {
        if (data.apiKey) {
            apiKeyInput.value = data.apiKey;
            populateModels().then(() => {
                if (data.selectedModel) {
                    modelSelect.value = data.selectedModel;
                }
            });
        }
        if (data.temperature) tempSlider.value = data.temperature;
        if (data.topP) topPSlider.value = data.topP;
        updateSliderValues();
    });
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', restoreSettings);
loadModelsBtn.addEventListener('click', populateModels);
saveSettingsBtn.addEventListener('click', saveAllSettings);
tempSlider.addEventListener('input', updateSliderValues);
topPSlider.addEventListener('input', updateSliderValues);
