document.addEventListener('DOMContentLoaded', () => {
    const addGroupBtn = document.getElementById('add-group');
    const groupList = document.getElementById('group-list');
    const generateBtn = document.getElementById('generate-btn');
    const postRoundSection = document.getElementById('post-round');
    const postPlayerList = document.getElementById('post-player-list');
    const finalizeBtn = document.getElementById('finalize-btn');
    const outputSection = document.getElementById('output');
    const groupAssignmentsDiv = document.getElementById('group-assignments');
    const ctpSetupDiv = document.getElementById('ctp-setup');
    const ctpCleanupDiv = document.getElementById('ctp-cleanup');
    const handicapDiv = document.getElementById('handicap-summary');
    const bagtagDiv = document.getElementById('bagtag-summary');
    const exportBtn = document.getElementById('export-csv');
    const saveBtn = document.getElementById('save-event');
    const loadBtn = document.getElementById('load-event');

    let groups = [];

    // Add group row
    addGroupBtn.addEventListener('click', () => {
        const entry = document.createElement('div');
        entry.classList.add('group-entry');
        entry.innerHTML = `
            <input type="text" class="group-name" placeholder="Group Name/Rep (e.g., Kevin's Card)">
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
                <input type="number" class="player-handicap" placeholder="Handicap" step="0.1">
                <input type="number" class="player-bagtag-in" placeholder="Incoming Bag Tag" min="1" max="75">
                <button class="remove-player">Remove</button>
            `;
            subList.appendChild(playerEntry);
            playerEntry.querySelector('.remove-player').addEventListener('click', () => playerEntry.remove());
        });

        entry.querySelector('.remove-group').addEventListener('click', () => entry.remove());
    });

    // Generate pre-round
    generateBtn.addEventListener('click', () => {
        gatherGroups();
        if (groups.length < 1) {
            alert('Add at least one group!');
            return;
        }

        const totalGroups = groups.length;
        const allPlayers = groups.flatMap(g => g.players);

        // Starting holes: random unique for each group
        const holes = Array.from({length: 24}, (_, i) => i + 1);
        const startingHoles = shuffleArray([...holes]).slice(0, totalGroups);

        // CTP holes: user input or random 10 unique
        let ctpHolesInput = document.getElementById('ctp-holes').value.trim();
        let ctpHoles = ctpHolesInput ? ctpHolesInput.split(',').map(h => parseInt(h.trim())) : shuffleArray([...holes]).slice(0, 10);
        if (ctpHoles.length !== 10 || ctpHoles.some(isNaN)) {
            alert('Invalid CTP holes—using random 10.');
            ctpHoles = shuffleArray([...holes]).slice(0, 10);
        }

        // Assign setup (take out) and cleanup (pick up) fairly across groups
        const shuffledGroups = shuffleArray([...groups]);
        const setupAssignments = ctpHoles.map((hole, i) => ({hole, group: shuffledGroups[i % totalGroups]}));
        const cleanupShuffled = shuffleArray([...groups]); // Separate shuffle for fairness
        const cleanupAssignments = ctpHoles.map((hole, i) => ({hole, group: cleanupShuffled[i % totalGroups]}));

        // Handicap avg
        const handicaps = allPlayers.map(p => p.handicap || 0);
        const avgHandicap = handicaps.length > 0 ? handicaps.reduce((a, b) => a + b, 0) / handicaps.length : 0;

        // Display
        groupAssignmentsDiv.innerHTML = `<h3>Group Assignments (${totalGroups} groups)</h3>` + 
            groups.map((group, idx) => `<div class="assignment-group"><strong>${group.name} (Starting Hole: ${startingHoles[idx]})</strong><ul>${group.players.map(p => `<li>${p.name} (Handicap: ${p.handicap || 'N/A'}, Incoming Tag: ${p.bagtagIn || 'None'})</li>`).join('')}</ul></div>`).join('');

        ctpSetupDiv.innerHTML = `<h3>CTP Flag Take-Out (Setup) Assignments ($5 Entry)</h3><ul>${setupAssignments.map(a => `<li>Hole ${a.hole}: ${a.group.name} (Take out flag)</li>`).join('')}</ul><p>Distribute duties to avoid overload.</p>`;

        ctpCleanupDiv.innerHTML = `<h3>CTP Flag Pick-Up (Cleanup) Assignments</h3><ul>${cleanupAssignments.map(a => `<li>Hole ${a.hole}: ${a.group.name} (Pick up flag)</li>`).join('')}</ul><p>Groups bring back to TD after round.</p>`;

        handicapDiv.innerHTML = `<h3>Handicap Summary (for Net Payouts)</h3><p>Avg Handicap: ${avgHandicap.toFixed(2)}</p><p>Net Score = Raw Score - Handicap.</p>`;

        // Show post-round for scores
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
        bagtagDiv.innerHTML = ''; // Clear until finalized
    });

    // Finalize post-round
    finalizeBtn.addEventListener('click', () => {
        gatherGroups(); // Refresh
        const allPlayers = groups.flatMap(g => g.players);
        const scoreEntries = document.querySelectorAll('.post-player-entry');
        let hasScores = true;
        scoreEntries.forEach((entry, i) => {
            const rawScore = parseFloat(entry.querySelector('.player-raw-score').value);
            if (isNaN(rawScore)) hasScores = false;
            else {
                allPlayers[i].rawScore = rawScore;
                allPlayers[i].netScore = rawScore - (allPlayers[i].handicap || 0);
            }
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
            <table><thead><tr><th>Player</th><th>Raw</th><th>Net</th><th>In Tag</th><th>Out Tag</th></tr></thead>
            <tbody>${sortedByRaw.map(p => `<tr><td>${p.name}</td><td>${p.rawScore}</td><td>${p.netScore.toFixed(2)}</td><td>${p.bagtagIn || 'None'}</td><td>${p.bagtagOut || 'None'}</td></tr>`).join('')}</tbody></table>
            <p>Low Raw Winner: ${sortedByRaw[0].name} (Score: ${sortedByRaw[0].rawScore})</p>`;
    });

    function gatherGroups() {
        groups = [];
        document.querySelectorAll('.group-entry').forEach(entry => {
            const name = entry.querySelector('.group-name').value.trim();
            const players = [];
            entry.querySelectorAll('.player-entry').forEach(pEntry => {
                const pName = pEntry.querySelector('.player-name').value.trim();
                const handicap = parseFloat(pEntry.querySelector('.player-handicap').value) || 0;
                const bagtagIn = parseInt(pEntry.querySelector('.player-bagtag-in').value) || null;
                if (pName) players.push({name: pName, handicap, bagtagIn});
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

    // Export CSV (updated with new assignments)
    exportBtn.addEventListener('click', () => {
        gatherGroups();
        const allPlayers = groups.flatMap(g => g.players);
        let csv = 'Sawmill League Event Export\n';
        csv += 'Group,Players,Starting Hole\n' + groups.map(g => `${g.name},${g.players.map(p => p.name).join(';')},[starting]`).join('\n'); // Placeholder for starting
        csv += '\n\nCTP Setup\n' + ctpSetupDiv.innerText;
        csv += '\n\nCTP Cleanup\n' + ctpCleanupDiv.innerText;
        csv += '\n\nPlayers: Name,Handicap,Incoming Tag,Raw Score,Net Score,Outgoing Tag\n' + allPlayers.map(p => `${p.name},${p.handicap},${p.bagtagIn || ''},${p.rawScore || ''},${p.netScore || ''},${p.bagtagOut || ''}`).join('\n');
        downloadCSV(csv, 'sawmill-league-event.csv');
    });

    function downloadCSV(content, filename) {
        const blob = new Blob([content], {type: 'text/csv;charset=utf-8;'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }

    // Save/Load (now saves groups/players)
    saveBtn.addEventListener('click', () => {
        gatherGroups();
        const nextData = groups.map(g => ({
            name: g.name,
            players: g.players.map(p => ({name: p.name, handicap: p.handicap, bagtagIn: p.bagtagOut}))
        }));
        localStorage.setItem('sawmillEvent', JSON.stringify(nextData));
        alert('Saved! Outgoing tags as next incoming.');
    });

    loadBtn.addEventListener('click', () => {
        const saved = localStorage.getItem('sawmillEvent');
        if (saved) {
            groups = JSON.parse(saved);
            groupList.innerHTML = '';
            groups.forEach(g => {
                addGroupBtn.click();
                const entries = groupList.querySelectorAll('.group-entry');
                const last = entries[entries.length - 1];
                last.querySelector('.group-name').value = g.name;
                g.players.forEach(p => {
                    last.querySelector('.add-player-to-group').click();
                    const pEntries = last.querySelectorAll('.player-entry');
                    const pLast = pEntries[pEntries.length - 1];
                    pLast.querySelector('.player-name').value = p.name;
                    pLast.querySelector('.player-handicap').value = p.handicap || '';
                    pLast.querySelector('.player-bagtag-in').value = p.bagtagIn || '';
                });
            });
            alert('Loaded last event!');
        } else {
            alert('No saved event.');
        }
    });
});
