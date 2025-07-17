document.addEventListener('DOMContentLoaded', () => {
    const editorContainer = document.getElementById('editor-container');
    const sceneToc = document.getElementById('scene-toc');
    const csvFileInput = document.getElementById('csv-file-input');
    const loadCsvBtn = document.getElementById('load-csv-btn');
    const saveCsvBtn = document.getElementById('save-csv-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const addSceneBtn = document.getElementById('add-scene-btn');

    let storyData = { title: "New Story", scenes: {} }; // Initialize with a default structure

    const CSV_HEADERS = [
        'SceneID', 'EventType', 'Character', 'Text', 'NextSceneID_Dialogue', 'SE',
        'SetVar_Name', 'SetVar_Value', 'Condition_Var', 'Condition_Op', 'Condition_Value',
        'CharacterImage', 'CharacterPosition',
        'Choice1_Text', 'Choice1_NextSceneID', 'Choice1_Condition_Var', 'Choice1_Condition_Op', 'Choice1_Condition_Value',
        'Background'
    ];

    // --- CSV Parsing and Unparsing ---

    function parseCSV(csvString) {
        const lines = csvString.split(/\r\n|\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) return { title: "New Story", scenes: {} };

        const headers = lines[0].split(',').map(h => h.trim());
        const scenes = {};
        let currentSceneId = null;

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            if (row.SceneID) {
                currentSceneId = row.SceneID;
                scenes[currentSceneId] = { background: row.Background || '', events: [] };
            }

            if (currentSceneId && row.EventType) {
                const event = { type: row.EventType };

                if (row.EventType === 'dialogue') {
                    event.character = row.Character;
                    event.text = row.Text;
                    if (row.NextSceneID_Dialogue) event.nextSceneId = row.NextSceneID_Dialogue;
                    if (row.SE) event.se = row.SE;
                    if (row.SetVar_Name) event.setVar = { name: row.SetVar_Name, value: row.SetVar_Value };
                    if (row.Condition_Var) event.condition = { var: row.Condition_Var, op: row.Condition_Op, value: row.Condition_Value };
                    if (row.CharacterImage) event.characterImage = row.CharacterImage;
                    if (row.CharacterPosition) event.characterPosition = row.CharacterPosition;
                } else if (row.EventType === 'system') {
                    if (row.SE) event.se = row.SE;
                    if (row.SetVar_Name) event.setVar = { name: row.SetVar_Name, value: row.SetVar_Value };
                    if (row.Condition_Var) event.condition = { var: row.Condition_Var, op: row.Condition_Op, value: row.Condition_Value };
                } else if (row.EventType === 'choice') {
                    event.message = row.Text;
                    if (row.SE) event.se = row.SE;
                    if (row.SetVar_Name) event.setVar = { name: row.SetVar_Name, value: row.SetVar_Value };
                    if (row.Condition_Var) event.condition = { var: row.Condition_Var, op: row.Condition_Op, value: row.Condition_Value };
                }
                scenes[currentSceneId].events.push(event);
            }
        }
        return { title: "Story from CSV", scenes };
    }

    function unparseCSV(storyData) {
        let csv = CSV_HEADERS.join(',') + '\n';
        const sceneIds = Object.keys(storyData.scenes);

        sceneIds.forEach(sceneId => {
            const scene = storyData.scenes[sceneId];
            scene.events.forEach((event, eventIndex) => {
                const row = {};
                CSV_HEADERS.forEach(header => row[header] = ''); // Initialize row

                if (eventIndex === 0) {
                    row.SceneID = sceneId;
                    row.Background = scene.background || '';
                }
                row.EventType = event.type;

                if (event.type === 'dialogue') {
                    row.Character = event.character || '';
                    row.Text = event.text || '';
                    row.NextSceneID_Dialogue = event.nextSceneId || '';
                    row.SE = event.se || '';
                    if (event.setVar) { row.SetVar_Name = event.setVar.name || ''; row.SetVar_Value = event.setVar.value || ''; }
                    if (event.condition) { row.Condition_Var = event.condition.var || ''; row.Condition_Op = event.condition.op || ''; row.Condition_Value = event.condition.value || ''; }
                    row.CharacterImage = event.characterImage || '';
                    row.CharacterPosition = event.characterPosition || '';
                } else if (event.type === 'system') {
                    row.SE = event.se || '';
                    if (event.setVar) { row.SetVar_Name = event.setVar.name || ''; row.SetVar_Value = event.setVar.value || ''; }
                    if (event.condition) { row.Condition_Var = event.condition.var || ''; row.Condition_Op = event.condition.op || ''; row.Condition_Value = event.condition.value || ''; }
                } else if (event.type === 'choice') {
                    event.options.forEach((option, optIndex) => {
                        row[`Choice${optIndex + 1}_Text`] = option.text || '';
                        row[`Choice${optIndex + 1}_NextSceneID`] = option.nextSceneId || '';
                        if (option.condition) {
                            row[`Choice${optIndex + 1}_Condition_Var`] = option.condition.var || '';
                            row[`Choice${optIndex + 1}_Condition_Op`] = option.condition.op || '';
                            row[`Choice${optIndex + 1}_Condition_Value`] = option.condition.value || '';
                        }
                    });
                } else if (event.type === 'end') {
                    row.Text = event.message || '';
                    row.SE = event.se || '';
                    if (event.setVar) { row.SetVar_Name = event.setVar.name || ''; row.SetVar_Value = event.setVar.value || ''; }
                    if (event.condition) { row.Condition_Var = event.condition.var || ''; row.Condition_Op = event.condition.op || ''; row.Condition_Value = event.condition.value || ''; }
                }
                csv += CSV_HEADERS.map(header => `"${row[header].replace(/"/g, '""')}"`).join(',') + '\n';
            });
        });
        return csv;
    }

    function exportToStoryJson(storyData) {
        const gameJson = { title: storyData.title, scenes: {} };
        for (const sceneId in storyData.scenes) {
            const scene = storyData.scenes[sceneId];
            gameJson.scenes[sceneId] = { background: scene.background, events: [] };
            scene.events.forEach(event => {
                const newEvent = { type: event.type };
                if (event.type === 'dialogue') {
                    newEvent.character = event.character;
                    newEvent.text = event.text;
                    if (event.nextSceneId) newEvent.nextSceneId = event.nextSceneId;
                    if (event.se) newEvent.se = event.se;
                    if (event.setVar) newEvent.setVar = event.setVar;
                    if (event.condition) newEvent.condition = event.condition;
                    if (event.characterImage) newEvent.characterImage = event.characterImage;
                    if (event.characterPosition) newEvent.characterPosition = event.characterPosition;
                } else if (event.type === 'system') {
                    if (event.se) newEvent.se = event.se;
                    if (event.setVar) newEvent.setVar = event.setVar;
                    if (event.condition) newEvent.condition = event.condition;
                } else if (event.type === 'choice') {
                    newEvent.options = event.options.map(opt => {
                        const newOpt = { text: opt.text, nextSceneId: opt.nextSceneId };
                        if (opt.condition) newOpt.condition = opt.condition;
                        return newOpt;
                    });
                } else if (event.type === 'end') {
                    newEvent.message = event.message;
                    if (event.se) newEvent.se = event.se;
                    if (event.setVar) newEvent.setVar = event.setVar;
                    if (event.condition) newEvent.condition = event.condition;
                }
                gameJson.scenes[sceneId].events.push(newEvent);
            });
        }
        return gameJson;
    }

    // --- Main Render Function ---
    function renderStory() {
        const sceneOrder = Object.keys(storyData.scenes);
        editorContainer.innerHTML = '';
        sceneToc.innerHTML = '';

        if (!storyData || !storyData.scenes) return;

        sceneOrder.forEach(sceneId => {
            renderScene(sceneId, storyData.scenes[sceneId]);
            renderSceneTocItem(sceneId);
        });
    }

    // --- Render a single Scene in main editor ---
    function renderScene(sceneId, scene) {
        const sceneEl = document.createElement('div');
        sceneEl.className = 'scene';
        sceneEl.id = `scene-${sceneId}`; // Add ID for scrolling
        sceneEl.dataset.sceneId = sceneId;

        sceneEl.innerHTML = `
            <div class="scene-header">
                <h2>Scene: <input type="text" class="scene-id-input" value="${sceneId}" readonly></h2>
                <div class="scene-header-controls">
                    <button class="move-scene-btn move-scene-up-btn" title="Move scene up"><i class="fas fa-arrow-up"></i></button>
                    <button class="move-scene-btn move-scene-down-btn" title="Move scene down"><i class="fas fa-arrow-down"></i></button>
                    <button class="delete-scene-btn" title="Delete scene"><i class="fas fa-trash-alt"></i> Delete Scene</button>
                </div>
            </div>
            <div class="events-container"></div>
            <div class="scene-controls">
                <select class="add-event-select">
                    <option value="dialogue">Dialogue</option>
                    <option value="choice">Choice</option>
                    <option value="system">System</option>
                    <option value="end">End</option>
                </select>
                <button class="add-event-btn"><i class="fas fa-plus"></i> Add Event</button>
            </div>
        `;

        const eventsContainer = sceneEl.querySelector('.events-container');
        scene.events.forEach((event, index) => {
            eventsContainer.appendChild(renderEvent(sceneId, event, index));
        });

        editorContainer.appendChild(sceneEl);
    }

    // --- Render a single Scene TOC Item in sidebar ---
    function renderSceneTocItem(sceneId) {
        const tocItemEl = document.createElement('li');
        tocItemEl.className = 'scene-toc-item';
        tocItemEl.dataset.sceneId = sceneId;
        tocItemEl.innerHTML = `
            <span class="scene-toc-item-title">${sceneId}</span>
            <div class="scene-toc-item-controls">
                <button class="move-scene-toc-btn move-scene-up-btn" title="Move up"><i class="fas fa-arrow-up"></i></button>
                <button class="move-scene-toc-btn move-scene-down-btn" title="Move down"><i class="fas fa-arrow-down"></i></button>
                <button class="delete-scene-toc-btn" title="Delete"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        sceneToc.appendChild(tocItemEl);
    }

    // --- Render a single Event ---
    function renderEvent(sceneId, event, index) {
        const eventEl = document.createElement('div');
        eventEl.className = 'event';
        eventEl.dataset.eventIndex = index;

        let content = `<div class="event-header"><strong>${event.type.toUpperCase()}</strong><button class="delete-event-btn" title="Delete event"><i class="fas fa-times"></i></button></div>`;

        // Common fields for all event types
        content += `
            <div class="event-common-props">
                <input type="text" value="${event.se || ''}" placeholder="SE (e.g., se/sound.mp3)" class="event-prop" data-prop="se">
                <input type="text" value="${event.setVar ? event.setVar.name : ''}" placeholder="Set Var Name" class="event-prop" data-prop="setVar.name">
                <input type="text" value="${event.setVar ? event.setVar.value : ''}" placeholder="Set Var Value" class="event-prop" data-prop="setVar.value">
                <input type="text" value="${event.condition ? event.condition.var : ''}" placeholder="Condition Var" class="event-prop" data-prop="condition.var">
                <select class="event-prop" data-prop="condition.op">
                    <option value="" ${!event.condition || event.condition.op === '' ? 'selected' : ''}>Op</option>
                    <option value="==" ${event.condition && event.condition.op === '==' ? 'selected' : ''}>==</option>
                    <option value="!=" ${event.condition && event.condition.op === '!=' ? 'selected' : ''}>!=</option>
                    <option value=">" ${event.condition && event.condition.op === '>' ? 'selected' : ''}>&gt;</option>
                    <option value="<" ${event.condition && event.condition.op === '<' ? 'selected' : ''}>&lt;</option>
                    <option value=">=" ${event.condition && event.condition.op === '>=' ? 'selected' : ''}>&gt;=</option>
                    <option value="<=" ${event.condition && event.condition.op === '<=' ? 'selected' : ''}>&lt;=</option>
                </select>
                <input type="text" value="${event.condition ? event.condition.value : ''}" placeholder="Condition Value" class="event-prop" data-prop="condition.value">
            </div>
        `;

        switch (event.type) {
            case 'system':
                // System event has no specific fields, only common ones.
                break;
            case 'dialogue':
                content += `
                    <input type="text" value="${event.character || ''}" placeholder="Character" class="event-prop" data-prop="character">
                    <textarea placeholder="Dialogue Text" class="event-prop" data-prop="text">${event.text || ''}</textarea>
                    <input type="text" value="${event.nextSceneId || ''}" placeholder="Next Scene ID (optional)" class="event-prop" data-prop="nextSceneId">
                    <input type="text" value="${event.characterImage || ''}" placeholder="Character Image (e.g., characters/char.png)" class="event-prop" data-prop="characterImage">
                    <select class="event-prop" data-prop="characterPosition">
                        <option value="" ${!event.characterPosition ? 'selected' : ''}>Position</option>
                        <option value="left" ${event.characterPosition === 'left' ? 'selected' : ''}>Left</option>
                        <option value="right" ${event.characterPosition === 'right' ? 'selected' : ''}>Right</option>
                    </select>
                `;
                break;
            case 'choice':
                const optionsHtml = (event.options || []).map((opt, i) => `
                    <div class="choice-option" data-option-index="${i}">
                        <input type="text" value="${opt.text || ''}" placeholder="Option Text" class="event-prop-choice" data-prop="text">
                        <input type="text" value="${opt.nextSceneId || ''}" placeholder="Next Scene ID" class="event-prop-choice" data-prop="nextSceneId">
                        <input type="text" value="${opt.condition ? opt.condition.var : ''}" placeholder="Condition Var" class="event-prop-choice" data-prop="condition.var">
                        <select class="event-prop-choice" data-prop="condition.op">
                            <option value="" ${!opt.condition || opt.condition.op === '' ? 'selected' : ''}>Op</option>
                            <option value="==" ${opt.condition && opt.condition.op === '==' ? 'selected' : ''}>==</option>
                            <option value="!=" ${opt.condition && opt.condition.op === '!=' ? 'selected' : ''}>!=</option>
                            <option value=">" ${opt.condition && opt.condition.op === '>' ? 'selected' : ''}>&gt;</option>
                            <option value="<" ${opt.condition && opt.condition.op === '<' ? 'selected' : ''}>&lt;</option>
                            <option value=">=" ${opt.condition && opt.condition.op === '>=' ? 'selected' : ''}>&gt;=</option>
                            <option value="<=" ${opt.condition && opt.condition.op === '<=' ? 'selected' : ''}>&lt;=</option>
                        </select>
                        <input type="text" value="${opt.condition ? opt.condition.value : ''}" placeholder="Condition Value" class="event-prop-choice" data-prop="condition.value">
                        <button class="delete-option-btn" title="Delete option"><i class="fas fa-minus-circle"></i></button>
                    </div>
                `).join('');
                content += `<div class="choice-options-container">${optionsHtml}</div><button class="add-option-btn"><i class="fas fa-plus"></i> Add Option</button>`;
                break;
            case 'end':
                content += `<input type="text" value="${event.message || ''}" placeholder="End Message" class="event-prop" data-prop="message">`;
                break;
        }
        eventEl.innerHTML = content;
        return eventEl;
    }

    // --- Event Listeners ---

    loadCsvBtn.addEventListener('click', () => csvFileInput.click());

    csvFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                storyData = parseCSV(e.target.result);
                renderStory();
                alert('CSV loaded successfully!');
            } catch (error) {
                console.error('Failed to parse CSV:', error);
                alert('Failed to load CSV. See console for details.');
            }
        };
        reader.readAsText(file);
    });

    saveCsvBtn.addEventListener('click', () => {
        if (!storyData) {
            alert('No story data to save.');
            return;
        }
        updateStoryDataFromUI();
        const csvString = unparseCSV(storyData);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'story.csv';
        a.click();
        URL.revokeObjectURL(url);
        alert('Story saved as story.csv!');
    });

    exportJsonBtn.addEventListener('click', () => {
        if (!storyData) {
            alert('No story data to export.');
            return;
        }
        updateStoryDataFromUI();
        const gameJson = exportToStoryJson(storyData);
        const jsonString = JSON.stringify(gameJson, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'story.json';
        a.click();
        URL.revokeObjectURL(url);
        alert('Story exported as story.json!');
    });

    addSceneBtn.addEventListener('click', () => {
        const newSceneId = prompt('Enter new scene ID:');
        if (newSceneId && !storyData.scenes[newSceneId]) {
            storyData.scenes[newSceneId] = { background: '', events: [] };
            renderStory();
        } else if (newSceneId) {
            alert('Scene ID already exists.');
        }
    });

    // Event delegation for main editor content
    editorContainer.addEventListener('click', (e) => {
        updateStoryDataFromUI(); // Update data before performing actions
        const target = e.target.closest('button');
        if (!target) return;

        const sceneEl = target.closest('.scene');
        if (!sceneEl) return;
        const sceneId = sceneEl.dataset.sceneId;

        // Scene-level actions (main editor)
        if (target.classList.contains('delete-scene-btn')) {
            if (confirm(`Are you sure you want to delete scene: ${sceneId}?`)) {
                delete storyData.scenes[sceneId];
                renderStory();
            }
        } else if (target.classList.contains('add-event-btn')) {
            const select = sceneEl.querySelector('.add-event-select');
            const type = select.value;
            let newEvent = { type };
            if (type === 'choice') newEvent.options = [{ text: '', nextSceneId: '', condition: {} }];
            storyData.scenes[sceneId].events.push(newEvent);
            renderStory();
        } else if (target.classList.contains('move-scene-up-btn') || target.classList.contains('move-scene-down-btn')) {
            moveScene(sceneId, target.classList.contains('move-scene-up-btn') ? -1 : 1);
        }

        // Event-level actions
        const eventEl = target.closest('.event');
        if (!eventEl) return;
        const eventIndex = parseInt(eventEl.dataset.eventIndex, 10);

        if (target.classList.contains('delete-event-btn')) {
            storyData.scenes[sceneId].events.splice(eventIndex, 1);
            renderStory();
        } else if (target.classList.contains('add-option-btn')) {
            storyData.scenes[sceneId].events[eventIndex].options.push({ text: '', nextSceneId: '', condition: {} });
            renderStory();
        } else if (target.classList.contains('delete-option-btn')) {
            const optionIndex = parseInt(target.closest('.choice-option').dataset.optionIndex, 10);
            storyData.scenes[sceneId].events[eventIndex].options.splice(optionIndex, 1);
            renderStory();
        }
    });

    // Event delegation for sidebar TOC
    sceneToc.addEventListener('click', (e) => {
        updateStoryDataFromUI(); // Update data before performing actions
        const target = e.target.closest('button') || e.target.closest('.scene-toc-item-title');
        if (!target) return;

        const tocItemEl = target.closest('.scene-toc-item');
        if (!tocItemEl) return;
        const sceneId = tocItemEl.dataset.sceneId;

        if (target.classList.contains('scene-toc-item-title')) {
            // Scroll to scene
            document.getElementById(`scene-${sceneId}`).scrollIntoView({ behavior: 'smooth' });
            // Highlight active TOC item
            document.querySelectorAll('.scene-toc-item').forEach(item => item.classList.remove('active'));
            tocItemEl.classList.add('active');
        } else if (target.classList.contains('delete-scene-toc-btn')) {
            if (confirm(`Are you sure you want to delete scene: ${sceneId}?`)) {
                delete storyData.scenes[sceneId];
                renderStory();
            }
        } else if (target.classList.contains('move-scene-toc-btn')) {
            moveScene(sceneId, target.classList.contains('move-scene-up-btn') ? -1 : 1);
        }
    });

    // --- Helper function to move a scene ---
    function moveScene(sceneId, direction) {
        const sceneIds = Object.keys(storyData.scenes);
        const currentIndex = sceneIds.indexOf(sceneId);
        const newIndex = currentIndex + direction;

        if (newIndex >= 0 && newIndex < sceneIds.length) {
            const [movedId] = sceneIds.splice(currentIndex, 1);
            sceneIds.splice(newIndex, 0, movedId);
            const reorderedScenes = {};
            sceneIds.forEach(id => { reorderedScenes[id] = storyData.scenes[id]; });
            storyData.scenes = reorderedScenes;
            renderStory();
        }
    }

    // --- Function to update storyData from UI before saving ---
    function updateStoryDataFromUI() {
        const newStoryData = { title: storyData.title, scenes: {} };
        document.querySelectorAll('.scene').forEach(sceneEl => {
            const sceneId = sceneEl.querySelector('.scene-id-input').value;
            const newScene = { background: '', events: [] }; // Background will be set from CSV

            sceneEl.querySelectorAll('.event').forEach(eventEl => {
                const eventIndex = parseInt(eventEl.dataset.eventIndex, 10);
                // Assuming original event type is preserved, or derived from UI if needed
                const type = eventEl.querySelector('strong').textContent.toLowerCase(); // Get type from UI
                const newEvent = { type };

                // Common properties
                const seInput = eventEl.querySelector('[data-prop="se"]');
                if (seInput && seInput.value) newEvent.se = seInput.value;

                const setVarNameInput = eventEl.querySelector('[data-prop="setVar.name"]');
                const setVarValueInput = eventEl.querySelector('[data-prop="setVar.value"]');
                if (setVarNameInput && setVarNameInput.value) {
                    newEvent.setVar = { name: setVarNameInput.value, value: setVarValueInput ? setVarValueInput.value : '' };
                }

                const conditionVarInput = eventEl.querySelector('[data-prop="condition.var"]');
                const conditionOpSelect = eventEl.querySelector('[data-prop="condition.op"]');
                const conditionValueInput = eventEl.querySelector('[data-prop="condition.value"]');
                if (conditionVarInput && conditionVarInput.value) {
                    newEvent.condition = {
                        var: conditionVarInput.value,
                        op: conditionOpSelect ? conditionOpSelect.value : '',
                        value: conditionValueInput ? conditionValueInput.value : ''
                    };
                }

                if (type === 'dialogue') {
                    newEvent.character = eventEl.querySelector('[data-prop="character"]').value;
                    newEvent.text = eventEl.querySelector('[data-prop="text"]').value;
                    const nextSceneIdInput = eventEl.querySelector('[data-prop="nextSceneId"]');
                    if (nextSceneIdInput && nextSceneIdInput.value) newEvent.nextSceneId = nextSceneIdInput.value;
                    const characterImageInput = eventEl.querySelector('[data-prop="characterImage"]');
                    if (characterImageInput && characterImageInput.value) newEvent.characterImage = characterImageInput.value;
                    const characterPositionSelect = eventEl.querySelector('[data-prop="characterPosition"]');
                    if (characterPositionSelect && characterPositionSelect.value) newEvent.characterPosition = characterPositionSelect.value;
                } else if (type === 'choice') {
                    newEvent.options = [];
                    eventEl.querySelectorAll('.choice-option').forEach(optEl => {
                        const option = {};
                        option.text = optEl.querySelector('[data-prop="text"]').value;
                        option.nextSceneId = optEl.querySelector('[data-prop="nextSceneId"]').value;

                        const optConditionVarInput = optEl.querySelector('[data-prop="condition.var"]');
                        const optConditionOpSelect = optEl.querySelector('[data-prop="condition.op"]');
                        const optConditionValueInput = optEl.querySelector('[data-prop="condition.value"]');
                        if (optConditionVarInput && optConditionVarInput.value) {
                            option.condition = {
                                var: optConditionVarInput.value,
                                op: optConditionOpSelect ? optConditionOpSelect.value : '',
                                value: optConditionValueInput ? optConditionValueInput.value : ''
                            };
                        }
                        newEvent.options.push(option);
                    });
                } else if (type === 'end') {
                    newEvent.message = eventEl.querySelector('[data-prop="message"]').value;
                }
                newScene.events.push(newEvent);
            });
            newStoryData.scenes[sceneId] = newScene;
        });
        storyData = newStoryData;
    }

    // Initial render (empty story)
    renderStory();
});