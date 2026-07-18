let data = [];
let currentNode = null;
let searchQuery = '';

window.onload = async function () {
    await loadAllData();
    
    // Setup add root button
    const addRootBtn = document.getElementById("addRootBtn");
    if (addRootBtn) {
        addRootBtn.addEventListener("click", () => {
            const node = createNode("topic");
            data.push(node);
            currentNode = node; // auto select
            renderTree();
            renderEditor();
            renderStats();
            saveAllData();
        });
    }
};

function createNode(nodeType = "vocabulary") {
    let item = {};
    FIELDS.forEach(field => {
        if (field.type === 'image' || field.type === 'audio') {
            item[field.name] = [];
        } else {
            item[field.name] = "";
        }
    });
    item.title = nodeType === 'topic' ? "New Topic" : "New Node";
    item.id = Date.now();
    item.children = [];
    item.expanded = true;
    item.node_type = nodeType;
    return item;
}

// Normalize media files from legacy single URL string format to array of objects
function normalizeMedia(node) {
    // normalize image
    if (typeof node.image === 'string') {
        if (node.image) {
            node.image = [{ url: node.image, name: getFileNameFromUrl(node.image) }];
        } else {
            node.image = [];
        }
    } else if (!node.image) {
        node.image = [];
    }
    
    // normalize audio
    if (typeof node.audio === 'string') {
        if (node.audio) {
            node.audio = [{ url: node.audio, name: getFileNameFromUrl(node.audio) }];
        } else {
            node.audio = [];
        }
    } else if (!node.audio) {
        node.audio = [];
    }
    
    // normalize children
    if (node.children && Array.isArray(node.children)) {
        node.children.forEach(normalizeMedia);
    }
}

function getFileNameFromUrl(url) {
    if (!url) return '';
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    // strip timestamp if exists: 1784211788_Transport.mp3 -> Transport.mp3
    const underscoreIdx = lastPart.indexOf('_');
    if (underscoreIdx !== -1) {
        const timestamp = lastPart.substring(0, underscoreIdx);
        if (!isNaN(timestamp) && timestamp.length >= 9) {
            return lastPart.substring(underscoreIdx + 1);
        }
    }
    return lastPart;
}

// Tree view rendering with search filtering
function renderTree() {
    const tree = document.getElementById("tree");
    if (!tree) return;
    tree.innerHTML = "";
    
    data.forEach(node => {
        const nodeEl = buildNode(node);
        if (nodeEl) {
            tree.appendChild(nodeEl);
        }
    });
}

function filterNode(node, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    const titleMatch = (node.title || '').toLowerCase().includes(q);
    const meaningMatch = (node.meaning || '').toLowerCase().includes(q);
    const synonymsMatch = (node.synonyms || '').toLowerCase().includes(q);
    const antonymsMatch = (node.antonyms || '').toLowerCase().includes(q);
    
    const selfMatch = titleMatch || meaningMatch || synonymsMatch || antonymsMatch;
    
    if (node.children && node.children.length > 0) {
        const someChildMatch = node.children.some(child => filterNode(child, query));
        return selfMatch || someChildMatch;
    }
    return selfMatch;
}

function buildNode(node) {
    // If search active and neither this nor descendants match, hide it
    if (searchQuery && !filterNode(node, searchQuery)) {
        return null;
    }
    
    const wrapper = document.createElement("div");
    const row = document.createElement("div");
    row.className = "node-row";
    if (currentNode && currentNode.id === node.id) {
        row.classList.add("active");
    }
    
    const toggle = document.createElement("span");
    const nodeHasChildren = node.children && node.children.length > 0;
    
    // Auto-expand everything when searching
    const isExpanded = searchQuery ? true : node.expanded;
    
    toggle.className = "toggle";
    if (nodeHasChildren) {
        toggle.innerText = isExpanded ? "▼" : "▶";
    } else {
        toggle.innerText = "•";
    }
    
    toggle.onclick = (e) => {
        e.stopPropagation();
        node.expanded = !node.expanded;
        renderTree();
        saveAllData();
    };

    const title = document.createElement("div");
    title.className = "node-title";
    
    const nodeTypeIcons = { topic: "📁", idea: "💡", vocabulary: "🔤", grammar: "📐", note: "📝", question: "❓" };
    const emoji = nodeTypeIcons[node.node_type] || "🔹";
    
    title.innerHTML = `<span class="node-type-badge badge-${node.node_type}"></span> ${emoji} ${node.title || "New Node"}`;
    
    row.onclick = () => {
        currentNode = node;
        renderTree(); // refresh active indicator
        renderEditor();
    };
    
    // Action buttons visible on hover
    const actions = document.createElement("div");
    actions.className = "tree-node-actions";
    
    const addChildBtn = document.createElement("button");
    addChildBtn.className = "tree-action-btn";
    addChildBtn.innerText = "+";
    addChildBtn.title = "Add Child Node";
    addChildBtn.onclick = (e) => {
        e.stopPropagation();
        const child = createNode("vocabulary");
        node.children.push(child);
        node.expanded = true;
        currentNode = child; // auto-select child
        renderTree();
        renderEditor();
        renderStats();
        saveAllData();
    };
    
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "tree-action-btn delete";
    deleteBtn.innerText = "🗑";
    deleteBtn.title = "Delete Node";
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete "${node.title || 'this node'}" and all its children?`)) {
            deleteNode(node.id);
        }
    };
    
    actions.appendChild(addChildBtn);
    actions.appendChild(deleteBtn);
    
    row.appendChild(toggle);
    row.appendChild(title);
    row.appendChild(actions);
    wrapper.appendChild(row);
    
    const childContainer = document.createElement("div");
    childContainer.className = "node-children";
    
    if (isExpanded && nodeHasChildren) {
        node.children.forEach(child => {
            const childEl = buildNode(child);
            if (childEl) {
                childContainer.appendChild(childEl);
            }
        });
        wrapper.appendChild(childContainer);
    }
    
    return wrapper;
}

// Render form editor (Right panel)
function renderEditor() {
    const editor = document.getElementById("editor");
    if (!editor) return;
    
    if (!currentNode) {
        editor.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🌱</div>
                <h3>Start Learning</h3>
                <p>Select a node from the tree or create a new topic to start editing.</p>
            </div>
        `;
        return;
    }
    
    const nodeTypeIcons = { topic: "📁", idea: "💡", vocabulary: "🔤", grammar: "📐", note: "📝", question: "❓" };
    const currentIcon = nodeTypeIcons[currentNode.node_type] || "🔹";
    
    editor.innerHTML = `
        <div class="editor-header">
            <div class="editor-title-group">
                <h2>${currentNode.title || 'New Node'}</h2>
                <div class="node-type-indicator badge-${currentNode.node_type}" style="color: white; padding: 4px 12px; border-radius: 12px; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:6px;">
                    ${currentIcon} ${currentNode.node_type.toUpperCase()}
                </div>
            </div>
            <div class="editor-actions">
                <button class="btn-primary" onclick="saveNode()"><span class="btn-icon">💾</span> Save Changes</button>
                <button class="btn-secondary" onclick="addChild()"><span class="btn-icon">+</span> Add Child</button>
                ${currentNode.node_type === 'topic' ? `
                <button class="btn-secondary" style="background-color: rgba(139, 92, 246, 0.1); color: var(--color-grammar); border: 1px solid rgba(139, 92, 246, 0.2);" onclick="startFlashcardReview()">
                    <span class="btn-icon">🎴</span> Review Topic
                </button>` : ''}
            </div>
        </div>
        
        <div class="form-grid">
            <div class="form-group">
                <label for="title">Title / Vocabulary Word</label>
                <input type="text" id="title" value="${currentNode.title || ''}" placeholder="e.g. Transport" onchange="syncTitle(this.value)">
            </div>
            
            <div class="form-group">
                <label for="node_type">Node Type</label>
                <select id="node_type" onchange="handleNodeTypeChange(this.value)">
                    ${NODE_TYPES.map(type => `<option value="${type}" ${currentNode.node_type === type ? 'selected' : ''}>${type.toUpperCase()}</option>`).join('')}
                </select>
            </div>
            
            <div class="form-group col-full">
                <label for="phonetic">Phonetic IPA Pronunciation</label>
                <input type="text" id="phonetic" value="${currentNode.phonetic || ''}" placeholder="e.g. /trӕnsˈpoːt/">
            </div>
            
            <div class="form-group col-full">
                <label for="meaning">Meaning / Translation</label>
                <textarea id="meaning" placeholder="Enter word meaning or translation...">${currentNode.meaning || ''}</textarea>
            </div>
            
            <div class="form-group col-full">
                <label for="example">Examples</label>
                <textarea id="example" placeholder="Write example sentences using the word...">${currentNode.example || ''}</textarea>
            </div>
            
            <div class="form-group col-full">
                <label for="note">Study Notes / Mnemonic Rules</label>
                <textarea id="note" placeholder="Write custom mnemonic guides, usage notes...">${currentNode.note || ''}</textarea>
            </div>
        </div>
        
        <h3 class="editor-section-title">Word Associations</h3>
        <div class="form-grid">
            <div class="form-group">
                <label>Synonyms</label>
                <div class="tags-input-container" id="synonyms-container">
                    ${renderTagsPills(currentNode.synonyms || '', 'synonyms')}
                    <input type="text" id="synonyms-input" placeholder="Add synonym & press Enter" onkeydown="handleTagInput(event, 'synonyms')">
                </div>
            </div>
            
            <div class="form-group">
                <label>Antonyms</label>
                <div class="tags-input-container" id="antonyms-container">
                    ${renderTagsPills(currentNode.antonyms || '', 'antonyms')}
                    <input type="text" id="antonyms-input" placeholder="Add antonym & press Enter" onkeydown="handleTagInput(event, 'antonyms')">
                </div>
            </div>
        </div>
        
        <h3 class="editor-section-title">Media Attachments</h3>
        <div class="form-grid">
            <div class="form-group">
                <label>Images Gallery</label>
                <div class="media-upload-area">
                    <input type="file" accept="image/*" onchange="handleFileUpload(this, 'image')">
                    <div class="upload-prompt">
                        <span class="icon">📷</span>
                        <span><span class="highlight">Upload Image</span> or drag file here</span>
                    </div>
                </div>
                <div class="images-grid" id="image-gallery-grid">
                    ${renderImagesGrid(currentNode.image)}
                </div>
            </div>
            
            <div class="form-group">
                <label>Audio Playlist</label>
                <div class="media-upload-area">
                    <input type="file" accept="audio/*" onchange="handleFileUpload(this, 'audio')">
                    <div class="upload-prompt">
                        <span class="icon">🎙️</span>
                        <span><span class="highlight">Upload Audio</span> or drag file here</span>
                    </div>
                </div>
                
                <div class="tts-generation-block" style="margin-top: 12px; display: flex; gap: 8px;">
                    <input type="text" id="tts-input-text" placeholder="Or type text to generate pronunciation..." style="flex: 1;">
                    <select id="tts-lang-select" style="width: 130px;">
                        <option value="en">English (US)</option>
                        <option value="vi">Vietnamese</option>
                    </select>
                    <button class="btn-primary" onclick="generateTTS()" style="padding: 8px 12px; font-size:13px;">Generate</button>
                </div>
                
                <div class="audio-list" id="audio-playlist-container">
                    ${renderAudioList(currentNode.audio)}
                </div>
            </div>
        </div>
        
        <div class="editor-toolbar">
            <div class="toolbar-left">
                <button class="btn-danger" onclick="handleDeleteNodeClick()"><span class="btn-icon">🗑</span> Delete Node</button>
            </div>
            <div class="toolbar-right">
                <button class="btn-primary" onclick="saveNode()"><span class="btn-icon">💾</span> Save Node</button>
            </div>
        </div>
    `;
}

function syncTitle(val) {
    if (currentNode) {
        currentNode.title = val;
        renderTree();
    }
}

function addChild() {
    const child = createNode("vocabulary");
    if (!currentNode.children) currentNode.children = [];
    currentNode.children.push(child);
    currentNode.expanded = true;
    currentNode = child; // auto select the child
    renderTree();
    renderEditor();
    renderStats();
    saveAllData();
}

function handleNodeTypeChange(value) {
    if (currentNode) {
        currentNode.node_type = value;
        renderEditor();
        renderTree();
        renderStats();
    }
}

// Synonyms/Antonyms tag renderer & handlers
function renderTagsPills(tagsString, type) {
    if (!tagsString) return '';
    const tags = tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
    return tags.map(tag => `
        <span class="tag-pill ${type === 'antonyms' ? 'antonym' : ''}">
            ${tag}
            <span class="remove-tag" onclick="removeTag('${type}', '${tag}')">&times;</span>
        </span>
    `).join('');
}

function handleTagInput(event, type) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const input = event.target;
        const val = input.value.trim();
        if (val) {
            let currentVal = currentNode[type] || '';
            const existingTags = currentVal.split(',').map(t => t.trim()).filter(t => t.length > 0);
            if (!existingTags.includes(val)) {
                existingTags.push(val);
                currentNode[type] = existingTags.join(', ');
                saveNode();
            }
            input.value = '';
        }
    }
}

function removeTag(type, tagToRemove) {
    let currentVal = currentNode[type] || '';
    const tags = currentVal.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const filtered = tags.filter(t => t !== tagToRemove);
    currentNode[type] = filtered.join(', ');
    saveNode();
}

// Images Grid Renderer
function renderImagesGrid(images) {
    if (!images || images.length === 0) {
        return '<div style="margin-top:12px; color:var(--text-light); text-align:center; font-size:12px;">No images uploaded</div>';
    }
    return images.map((img, idx) => `
        <div class="image-card" onclick="openLightbox('${img.url}')">
            <img src="${img.url}" alt="${img.name || 'image'}">
            <button class="image-card-delete" onclick="event.stopPropagation(); removeMedia('image', ${idx})">&times;</button>
        </div>
    `).join('');
}

// Audios Playlist Renderer
function renderAudioList(audios) {
    if (!audios || audios.length === 0) {
        return '<div style="margin-top:12px; color:var(--text-light); text-align:center; font-size:12px;">No audios uploaded</div>';
    }
    return audios.map((aud, idx) => `
        <div class="audio-item">
            <span class="audio-item-icon">🔊</span>
            <div class="audio-item-details">
                <span class="audio-item-name" title="${aud.name}">${aud.name || 'Audio file'}</span>
                <div class="audio-player-wrapper">
                    <audio controls style="width: 100%; max-width: 220px; height: 26px;">
                        <source src="${aud.url}" type="audio/mpeg">
                    </audio>
                </div>
            </div>
            <button class="audio-item-delete" onclick="removeMedia('audio', ${idx})">🗑</button>
        </div>
    `).join('');
}

// Drag & drop file upload handler
async function handleFileUpload(input, type) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const formData = new FormData();
    formData.append("file", file);
    
    const endpoint = type === 'image' ? '/api/upload/image' : '/api/upload/audio';
    
    // Show visual uploading state
    const uploadArea = input.closest('.media-upload-area');
    const originalContent = uploadArea.innerHTML;
    uploadArea.innerHTML = `<div class="upload-prompt"><span class="icon">🔄</span><span>Uploading ${file.name}...</span></div>`;
    
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            body: formData
        });
        const result = await response.json();
        
        if (!Array.isArray(currentNode[type])) {
            currentNode[type] = [];
        }
        
        currentNode[type].push({
            url: result.url,
            name: result.name || file.name
        });
        
        saveNode();
    } catch (err) {
        console.error("Upload failed", err);
        alert("Upload failed. Please try again.");
        renderEditor();
    }
}

async function removeMedia(type, index) {
    if (currentNode && Array.isArray(currentNode[type])) {
        const mediaItem = currentNode[type][index];
        if (mediaItem && mediaItem.url) {
            try {
                await fetch("/api/delete/file", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ url: mediaItem.url })
                });
            } catch (err) {
                console.error("Failed to delete physical file from server", err);
            }
        }
        currentNode[type].splice(index, 1);
        saveNode();
    }
}

async function generateTTS() {
    if (!currentNode) return;
    const textInput = document.getElementById("tts-input-text");
    const langSelect = document.getElementById("tts-lang-select");
    if (!textInput || !langSelect) return;
    
    const text = textInput.value.trim();
    const lang = langSelect.value;
    
    if (!text) {
        alert("Please enter some text to generate audio.");
        return;
    }
    
    const generateBtn = document.querySelector(".tts-generation-block button");
    const originalText = generateBtn.innerText;
    generateBtn.innerText = "Generating...";
    generateBtn.disabled = true;
    
    try {
        const response = await fetch("/api/tts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text, lang })
        });
        const result = await response.json();
        
        if (result.error) {
            alert(`Error: ${result.error}`);
            return;
        }
        
        if (!Array.isArray(currentNode.audio)) {
            currentNode.audio = [];
        }
        
        currentNode.audio.push({
            url: result.url,
            name: result.name || `${text}.mp3`
        });
        
        saveNode();
    } catch (err) {
        console.error("TTS generation failed", err);
        alert("TTS generation failed. Please try again.");
    } finally {
        generateBtn.innerText = originalText;
        generateBtn.disabled = false;
    }
}

// Lightbox controller
function openLightbox(url) {
    const lightbox = document.getElementById("image-lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    if (lightbox && lightboxImg) {
        lightboxImg.src = url;
        lightbox.classList.add("show");
    }
}

function closeLightbox() {
    const lightbox = document.getElementById("image-lightbox");
    if (lightbox) {
        lightbox.classList.remove("show");
    }
}

// Node Deletion logic
function handleDeleteNodeClick() {
    if (currentNode) {
        if (confirm(`Are you sure you want to delete "${currentNode.title || 'this node'}" and all its sub-items?`)) {
            deleteNode(currentNode.id);
        }
    }
}

function deleteNode(nodeId) {
    data = removeNode(data, nodeId);
    if (currentNode && currentNode.id === nodeId) {
        currentNode = null;
    }
    renderTree();
    renderEditor();
    renderStats();
    saveAllData();
}

function removeNode(nodes, nodeId) {
    return nodes
        .filter(node => node.id !== nodeId)
        .map(node => {
            if (node.children) {
                node.children = removeNode(node.children, nodeId);
            }
            return node;
        });
}

// Node fields update & sync
function saveNode() {
    if (!currentNode) return;
    
    currentNode.title = document.getElementById("title").value;
    currentNode.node_type = document.getElementById("node_type").value;
    currentNode.phonetic = document.getElementById("phonetic").value;
    currentNode.meaning = document.getElementById("meaning").value;
    currentNode.example = document.getElementById("example").value;
    currentNode.note = document.getElementById("note").value;
    
    renderTree();
    renderEditor();
    renderStats();
    saveAllData();
}

async function saveAllData() {
    try {
        await fetch("/api/save", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
    } catch (err) {
        console.error("Failed to save data on server", err);
    }
}

async function loadAllData() {
    try {
        const response = await fetch("/api/load");
        data = await response.json();
        
        // Normalize images and audios for all nodes to support lists
        data.forEach(normalizeMedia);
        
        renderTree();
        renderStats();
    } catch (err) {
        console.error("Failed to load data", err);
    }
}

// Search box input controller
function handleSearch() {
    const searchInput = document.getElementById("treeSearch");
    if (searchInput) {
        searchQuery = searchInput.value;
        renderTree();
    }
}

// Statistics calculator
function calculateStats(nodes) {
    const counts = { topic: 0, idea: 0, vocabulary: 0, grammar: 0, note: 0, question: 0 };
    function traverse(n) {
        if (counts[n.node_type] !== undefined) {
            counts[n.node_type]++;
        }
        if (n.children && Array.isArray(n.children)) {
            n.children.forEach(traverse);
        }
    }
    nodes.forEach(traverse);
    return counts;
}

function renderStats() {
    const counts = calculateStats(data);
    const statsDiv = document.getElementById("statsDashboard");
    if (!statsDiv) return;
    statsDiv.innerHTML = `
        <div class="stat-item">
            <span class="stat-value" style="color: var(--color-topic)">${counts.topic}</span>
            <span class="stat-label">Topics</span>
        </div>
        <div class="stat-item">
            <span class="stat-value" style="color: var(--color-vocabulary)">${counts.vocabulary}</span>
            <span class="stat-label">Vocabs</span>
        </div>
        <div class="stat-item">
            <span class="stat-value" style="color: var(--color-grammar)">${counts.grammar}</span>
            <span class="stat-label">Grammar</span>
        </div>
    `;
}

// Flashcard deck & controller
let flashcardDeck = [];
let currentFlashcardIndex = 0;
let activeFcAudio = null;

function startFlashcardReview() {
    if (!currentNode) return;
    flashcardDeck = [];
    currentFlashcardIndex = 0;
    
    // Collect all child nodes with content (meaning, examples, or media)
    function collect(node) {
        const hasContent = node.meaning || node.example || (node.image && node.image.length > 0) || (node.audio && node.audio.length > 0);
        if (hasContent) {
            flashcardDeck.push(node);
        }
        if (node.children && Array.isArray(node.children)) {
            node.children.forEach(collect);
        }
    }
    
    collect(currentNode);
    
    if (flashcardDeck.length === 0) {
        alert("This topic has no child nodes with vocabulary content (meanings/examples/media) to review!");
        return;
    }
    
    // Show the modal overlay
    const modal = document.getElementById("flashcard-modal");
    if (modal) {
        modal.classList.add("show");
        showFlashcard(0);
    }
}

function closeFlashcards() {
    const modal = document.getElementById("flashcard-modal");
    if (modal) {
        modal.classList.remove("show");
    }
    if (activeFcAudio) {
        activeFcAudio.pause();
        activeFcAudio = null;
    }
}

function showFlashcard(index) {
    if (index < 0 || index >= flashcardDeck.length) return;
    currentFlashcardIndex = index;
    const card = flashcardDeck[index];
    
    // reset flipped animation
    const flashcardEl = document.querySelector(".flashcard");
    if (flashcardEl) {
        flashcardEl.classList.remove("flipped");
    }
    
    // Set front card contents
    const typeLabel = document.getElementById("fc-type");
    if (typeLabel) typeLabel.innerText = card.node_type.toUpperCase();
    
    const titleLabel = document.getElementById("fc-title");
    if (titleLabel) titleLabel.innerText = card.title || 'Unnamed';
    
    const phoneticLabel = document.getElementById("fc-phonetic");
    if (phoneticLabel) phoneticLabel.innerText = card.phonetic || '';
    
    // Set back card contents
    const meaningLabel = document.getElementById("fc-meaning");
    if (meaningLabel) meaningLabel.innerText = card.meaning || 'No definition defined';
    
    const exampleGroup = document.getElementById("fc-example-group");
    const exampleVal = document.getElementById("fc-example");
    if (card.example) {
        if (exampleGroup) exampleGroup.style.display = "block";
        if (exampleVal) exampleVal.innerText = card.example;
    } else {
        if (exampleGroup) exampleGroup.style.display = "none";
    }
    
    const noteGroup = document.getElementById("fc-note-group");
    const noteVal = document.getElementById("fc-note");
    if (card.note) {
        if (noteGroup) noteGroup.style.display = "block";
        if (noteVal) noteVal.innerText = card.note;
    } else {
        if (noteGroup) noteGroup.style.display = "none";
    }
    
    // Synonyms & Antonyms
    const synGroup = document.getElementById("fc-synonyms-group");
    const synContainer = document.getElementById("fc-synonyms");
    if (card.synonyms && synContainer) {
        if (synGroup) synGroup.style.display = "block";
        synContainer.innerHTML = card.synonyms.split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0)
            .map(t => `<span class="tag-pill">${t}</span>`).join('');
    } else {
        if (synGroup) synGroup.style.display = "none";
    }
    
    const antGroup = document.getElementById("fc-antonyms-group");
    const antContainer = document.getElementById("fc-antonyms");
    if (card.antonyms && antContainer) {
        if (antGroup) antGroup.style.display = "block";
        antContainer.innerHTML = card.antonyms.split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0)
            .map(t => `<span class="tag-pill antonym">${t}</span>`).join('');
    } else {
        if (antGroup) antGroup.style.display = "none";
    }
    
    // Media inside Flashcard: Audios and Images
    const audioContainer = document.getElementById("fc-audio-container");
    if (audioContainer) {
        audioContainer.innerHTML = '';
        if (card.audio && card.audio.length > 0) {
            card.audio.forEach((aud) => {
                const row = document.createElement("div");
                row.className = "fc-audio-row";
                row.onclick = (e) => e.stopPropagation(); // prevent card flip on play
                row.innerHTML = `
                    <span class="fc-audio-name" title="${aud.name}">${aud.name}</span>
                    <div class="fc-audio-btn" onclick="playFlashcardAudio('${aud.url}')">▶</div>
                `;
                audioContainer.appendChild(row);
            });
        }
    }
    
    const imageContainer = document.getElementById("fc-image-container");
    if (imageContainer) {
        imageContainer.innerHTML = '';
        if (card.image && card.image.length > 0) {
            card.image.forEach((img) => {
                const imgCard = document.createElement("div");
                imgCard.className = "fc-image-card";
                imgCard.onclick = (e) => {
                    e.stopPropagation(); // prevent card flip on zoom
                    openLightbox(img.url);
                };
                imgCard.innerHTML = `<img src="${img.url}" alt="${img.name}">`;
                imageContainer.appendChild(imgCard);
            });
        }
    }
    
    // Update progress controls
    const progressText = document.getElementById("fc-progress-text");
    if (progressText) {
        progressText.innerText = `${index + 1} / ${flashcardDeck.length}`;
    }
    
    const percent = ((index + 1) / flashcardDeck.length) * 100;
    const progressBar = document.getElementById("fc-progress-bar");
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
    }
    
    // Disable/enable navigation buttons
    const prevBtn = document.getElementById("fc-prev-btn");
    const nextBtn = document.getElementById("fc-next-btn");
    if (prevBtn) prevBtn.disabled = (index === 0);
    if (nextBtn) nextBtn.disabled = (index === flashcardDeck.length - 1);
}

function flipCard() {
    const flashcardEl = document.querySelector(".flashcard");
    if (flashcardEl) {
        flashcardEl.classList.toggle("flipped");
    }
}

function playFlashcardAudio(url) {
    if (activeFcAudio) {
        activeFcAudio.pause();
    }
    activeFcAudio = new Audio(url);
    activeFcAudio.play().catch(err => {
        console.error("Audio playback failed", err);
    });
}

function prevCard() {
    if (currentFlashcardIndex > 0) {
        showFlashcard(currentFlashcardIndex - 1);
    }
}

function nextCard() {
    if (currentFlashcardIndex < flashcardDeck.length - 1) {
        showFlashcard(currentFlashcardIndex + 1);
    }
}
