document.addEventListener('DOMContentLoaded', () => {
    const addGroupBtn = document.getElementById('add-group');
    const groupList = document.getElementById('group-list');
    const startingHolesSection = document.getElementById('starting-holes-section');
    const startingHolesList = document.getElementById('starting-holes-list');
    const generateBtn = document.getElementById('generate-btn');
    const postRoundSection = document.getElementById('post-round');
    const postPlayerList = document.getElementById('post-player-list');
    const finalizeBtn = document.getElementById('finalize-btn');
    const outputSection = document.getElementById('output');
    const groupAssignmentsDiv = document.getElementById('group-assignments');
    const ctpSetupDiv = document.getElementById('ctp-setup');
    const ctpCleanupDiv = document.getElementById('ctp-cleanup');
    const bagtagDiv = document.getElementById('bagtag-summary');
    const exportBtn = document.getElementById('export-csv');
    const saveBtn = document.getElementById('save-event');
    const loadBtn = document.getElementById('load-event');

    let groups = [];
    let startingHoles = {};

    // Add group row
    addGroupBtn.addEventListener('click', () => {
        const entry = document.createElement('div');
        entry.classList.add('group-entry');
        entry.innerHTML = `
            <input type="text" class="group-name" placeholder="Group/Card Name/Rep (e.g., Kevin's Card)">
            <h4>Optional Players in Group</h4>
            <div class="player-sub-list"></div>
            <button class="add-player-to-group">Add Player to Group</button>
            <button class="remove-group">Remove Group</button>
        `;
        groupList.appendChild(entry);

        const subList = entry.querySelector('.player-sub-list');
        entry.querySelector('.add-player-to-group').addEventListener('click', () => {
            const playerEntry = document.createElement('div');
            playerEntry.classList.add('player-entry');
            playerEntry.innerHTML = `
                <input type="text" class="player-name" placeholder="Player Name">
                <input type="number" class="player-bagtag-in" placeholder="Incoming Bag Tag" min="1" max="75">
                <button class="remove-player">Remove</button>
            `;
            subList.appendChild(playerEntry);
            playerEntry.querySelector('.remove-player').addEventListener('click', () => playerEntry.remove());
        });

        entry.querySelector('.remove-group').addEventListener('click', () => {
            entry.remove();
            updateStartingHolesUI(); // Refresh starting holes list
        });

        updateStartingHolesUI(); // Refresh after adding
    });

    // Update starting holes UI whenever groups change
    function updateStartingHolesUI() {
        startingHolesList.innerHTML = '';
        const groupEntries = document.querySelectorAll('.group-entry');
        groupEntries.forEach((entry, idx) => {
            const name = entry.querySelector('.group-name').value.trim() || `Group ${idx + 1}`;
            const div = document.createElement('div');
            div.classList.add('starting-hole-entry');
            div.innerHTML = `
                <span>${name}</span>
                <input type="number" class="starting-hole-input" data-index="${idx}" min="1" max="24" placeholder="Auto">
            `;
            startingHolesList.appendChild(div);
        });

        // Show section only if there are groups
        startingHolesSection.style.display = groupEntries.length > 0 ? 'block' : 'none';

        // Restore previously entered values if any
        Object.keys(startingHoles).forEach(key => {
            const input = startingHolesList.querySelector(`input[data-index="${key}"]`);
            if (input) input.value = startingHoles[key];
        });
    }

    // Listen for group name changes to update labels
    groupList.addEventListener('input', (e) => {
        if (e.target.classList.contains('group-name')) {
            updateStartingHolesUI();
        }
    });

    // Generate pre-round
    generateBtn.addEventListener('click', () => {
        gatherGroups();
        if (groups.length < 1) {
            alert('Add at least one group!');
            return;
        }

        // Collect manual starting holes
        startingHoles = {};
        document.querySelectorAll('.starting-hole-input').forEach(input => {
            const idx = input.dataset.index;
            const val = parseInt(input.value);
            if (!isNaN(val) && val >= 1 && val <= 24) {
                startingHoles[idx] = val;
            }
        });

        const totalGroups = groups.length;
        const allPlayers = groups.flatMap(g => g.players);

        // Assign starting holes: use manual where provided, random for others, no duplicates
        let availableHoles = Array.from({length: 24}, (_, i) => i + 1);
        // Remove manually assigned holes from available
        Object.values(startingHoles).forEach(h => {
            availableHoles = availableHoles.filter(x => x !== h);
        });
        const randomHoles = shuffleArray([...availableHoles]);

        const finalStartingHoles = groups.map((_, idx) => {
            return startingHoles[idx] || randomHoles.shift() || null;
        });

        // CTP holes: user input or random 10 unique
        let ctpHolesInput = document.getElementById('ctp-holes').value.trim();
        let ctpHoles = ctpHolesInput ? ctpHolesInput.split(',').map(h => parseInt(h.trim())) : shuffleArray([...Array.from({length: 24}, (_, i) => i + 1)]).slice(0, 10);
        if (ctpHoles.length !== 10 || ctpHoles.some(isNaN)) {
            alert('Invalid CTP holes—using random 10.');
            ctpHoles = shuffleArray([...Array.from({length: 24}, (_, i) => i + 1)]).slice(0, 10);
        }

        // Assign bring-out and pick-up fairly
        const shuffledGroups = shuffleArray([...groups]);
        const setupAssignments = ctpHoles.map((hole, i) => ({hole, group: shuffledGroups[i % totalGroups]}));
        const cleanupShuffled = shuffleArray([...groups]);
        const cleanupAssignments = ctpHoles.map((hole, i) => ({hole, group: cleanupShuffled[i % totalGroups]}));

        // Display
        groupAssignmentsDiv.innerHTML = `<h3>Group/Card Assignments (${totalGroups} groups)</h3>` + 
            groups.map((group, idx) => `<div class="assignment-group"><strong>${group.name} (Starting Hole: ${finalStartingHoles[idx] || 'Auto-assigned'})</strong><ul>${group.players.map(p => `<li>${p.name} (Incoming Tag: ${p.bagtagIn || 'None'})</li>`).join('')}</ul></div>`).join('');

        ctpSetupDiv.innerHTML = `<h3>CTP Flag Bring-Out (Setup) Assignments ($5 Entry)</h3><ul>${setupAssignments.map(a => `<li>Hole ${a.hole}: ${a.group.name} (Bring out flag)</li>`).join('')}</ul><p>Distribute duties to avoid overload.</p>`;

        ctpCleanupDiv.innerHTML = `<h3>CTP Flag Pick-Up (Cleanup) Assignments</h3><ul>${cleanupAssignments.map(a => `<li>Hole ${a.hole}: ${a.group.name} (Pick up flag)</li>`).join('')}</ul><p>Groups bring back to TD after round.</p>`;

        postRoundSection.style.display = 'block';
        postPlayerList.innerHTML = '';
        allPlayers.forEach(p => {
            const entry = document.createElement('div');
            entry.classList.add('post-player-entry');
            entry.innerHTML = `
                <span>${p.name} (Incoming Tag: ${p.bagtagIn || 'None'})</span>
                <input type="number" class="player-raw-score" placeholder="Raw Score" min="-20" max="100">
            `;
            postPlayerList.appendChild(entry);
        });

        outputSection.style.display = 'block';
        bagtagDiv.innerHTML = '';
    });

    // Finalize (bag tags based on raw scores) - kept from previous version
    finalizeBtn.addEventListener('click', () => {
        gatherGroups();
        const allPlayers = groups.flatMap(g => g.players);
        const scoreEntries = document.querySelectorAll('.post-player-entry');
        let hasScores = true;
        scoreEntries.forEach((entry, i) => {
            const rawScore = parseFloat(entry.querySelector('.player-raw-score').value);
            if (isNaN(rawScore)) hasScores = false;
            else allPlayers[i].rawScore = rawScore;
        });

        if (!hasScores) {
            alert('Enter raw scores for all players!');
            return;
        }

        const incomingTags = allPlayers.filter(p => p.bagtagIn).map(p => p.bagtagIn).sort((a, b) => a - b);
        const sortedByRaw = [...allPlayers].sort((a, b) => a.rawScore - b.rawScore);
        sortedByRaw.forEach((player, i) => {
            player.bagtagOut = (i < incomingTags.length) ? incomingTags[i] : null;
        });

        bagtagDiv.innerHTML = `<h3>Bag Tag Results (Raw Scores)</h3>
            <table><thead><tr><th>Player</th><th>Raw</th><th>In Tag</th><th>Out Tag</th></tr></thead>
            <tbody>${sortedByRaw.map(p => `<tr><td>${p.name}</td><td>${p.rawScore}</td><td>${p.bagtagIn || 'None'}</td><td>${p.bagtagOut || 'None'}</td></tr>`).join('')}</tbody></table>
            <p>Low Raw Winner: ${sortedByRaw[0].name} (Score: ${sortedByRaw[0].rawScore})</p>`;
    });

    function gatherGroups() {
        groups = [];
        document.querySelectorAll('.group-entry').forEach(entry => {
            const name = entry.querySelector('.group-name').value.trim();
            const players = [];
            entry.querySelectorAll('.player-entry').forEach(pEntry => {
                const pName = pEntry.querySelector('.player-name').value.trim();
                const bagtagIn = parseInt(pEntry.querySelector('.player-bagtag-in').value) || null;
                if (pName) players.push({name: pName, bagtagIn});
            });
            if (name) groups.push({name, players});
        });
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Export, Save, Load - same as before (omitted for brevity, copy from your current script.js if needed)
    // ... (paste the exportBtn, saveBtn, loadBtn listeners from previous version here)

});
