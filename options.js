// Function to save the API key and selected model
function saveSettings() {
    const apiKey = document.getElementById('api-key').value;
    const modelSelect = document.getElementById('model-select');
    const selectedModel = modelSelect.value;

    chrome.storage.sync.set({
        apiKey: apiKey,
        selectedModel: selectedModel
    }, () => {
        const status = document.getElementById('status');
        status.textContent = 'Settings saved.';
        setTimeout(() => {
            status.textContent = '';
        }, 2000);
    });
}

// Function to fetch available models from Google's API and populate the dropdown
async function populateModels() {
    const apiKey = document.getElementById('api-key').value;
    const modelSelect = document.getElementById('model-select');
    const status = document.getElementById('status');

    if (!apiKey) {
        status.textContent = 'Please enter an API key first.';
        return;
    }

    // Clear current options and show a loading message
    modelSelect.innerHTML = '<option>Loading models...</option>';
    modelSelect.disabled = true;
    status.textContent = 'Fetching models...';

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || 'Failed to fetch models. Is your API key correct?');
        }
        const data = await response.json();

        modelSelect.innerHTML = ''; // Clear the "Loading..." message

        // Filter for text-generation models and populate the dropdown
        data.models.forEach(model => {
            if (model.supportedGenerationMethods.includes('generateContent')) {
                const option = document.createElement('option');
                option.value = model.name; // e.g., "models/gemini-1.5-pro"
                option.textContent = model.displayName; // e.g., "Gemini 1.5 Pro"
                modelSelect.appendChild(option);
            }
        });

        modelSelect.disabled = false;
        status.textContent = 'Models loaded successfully!';
        // Restore the previously selected model if it exists
        chrome.storage.sync.get('selectedModel', (data) => {
            if (data.selectedModel) {
                modelSelect.value = data.selectedModel;
            }
        });
        // Save the currently selected (first) model as the default
        saveSettings();

    } catch (error) {
        modelSelect.innerHTML = '<option>Could not load models</option>';
        status.textContent = `Error: ${error.message}`;
        console.error(error);
    }
}

// Function to render the list of custom prompts
function renderCustomPrompts(prompts = []) {
    const listElement = document.getElementById('custom-prompts-list');
    listElement.innerHTML = ''; // Clear existing list

    if (prompts.length === 0) {
        listElement.innerHTML = '<p>You haven\'t added any custom prompts yet.</p>';
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'prompt-list';

    prompts.forEach(prompt => {
        const li = document.createElement('li');
        li.className = 'prompt-item';
        li.innerHTML = `
            <div>
                <div class="title">${prompt.title}</div>
                <small>${prompt.prompt.substring(0, 80)}...</small>
            </div>
            <button class="delete-btn" data-id="${prompt.id}">Delete</button>
        `;
        ul.appendChild(li);
    });

    listElement.appendChild(ul);
}

// Function to add a new custom prompt
function addCustomPrompt() {
    const titleInput = document.getElementById('prompt-title');
    const promptInput = document.getElementById('prompt-system');

    const title = titleInput.value.trim();
    const prompt = promptInput.value.trim();

    if (!title || !prompt) {
        alert('Please fill in both the Menu Title and the System Prompt.');
        return;
    }

    chrome.storage.sync.get({ customPrompts: [] }, (data) => {
        const newPrompts = data.customPrompts;
        newPrompts.push({
            id: `prompt_${Date.now()}`, // Simple unique ID
            title: title,
            prompt: prompt
        });

        chrome.storage.sync.set({ customPrompts: newPrompts }, () => {
            renderCustomPrompts(newPrompts);
            titleInput.value = '';
            promptInput.value = '';
        });
    });
}

// Function to delete a custom prompt
function deleteCustomPrompt(promptId) {
    chrome.storage.sync.get({ customPrompts: [] }, (data) => {
        const filteredPrompts = data.customPrompts.filter(p => p.id !== promptId);
        chrome.storage.sync.set({ customPrompts: filteredPrompts }, () => {
            renderCustomPrompts(filteredPrompts);
        });
    });
}

// Function to restore saved settings when the page loads
function restoreOptions() {
    chrome.storage.sync.get(['apiKey', 'customPrompts'], (data) => {
        if (data.apiKey) {
            document.getElementById('api-key').value = data.apiKey;
            populateModels(); // Automatically load models if a key exists
        }
        renderCustomPrompts(data.customPrompts);
    });
}

// --- Event Listeners ---

// Run restoreOptions when the page is loaded
document.addEventListener('DOMContentLoaded', restoreOptions);

// Save button for API key
document.getElementById('save-key').addEventListener('click', populateModels);

// Save the selected model whenever the user changes it
document.getElementById('model-select').addEventListener('change', saveSettings);

// Add prompt button
document.getElementById('add-prompt').addEventListener('click', addCustomPrompt);

// Listener for delete buttons (using event delegation)
document.getElementById('custom-prompts-list').addEventListener('click', (event) => {
    if (event.target && event.target.classList.contains('delete-btn')) {
        const promptId = event.target.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this prompt?')) {
            deleteCustomPrompt(promptId);
        }
    }
});
