document.addEventListener('DOMContentLoaded', () => {
    const addPlayerBtn = document.getElementById('add-player');
    const playerList = document.getElementById('player-list');
    const generateBtn = document.getElementById('generate-btn');
    const postRoundSection = document.getElementById('post-round');
    const postPlayerList = document.getElementById('post-player-list');
    const finalizeBtn = document.getElementById('finalize-btn');
    const outputSection = document.getElementById('output');
    const cardsDiv = document.getElementById('cards');
    const ctpAssignmentsDiv = document.getElementById('ctp-assignments');
    const ctpFlagsDiv = document.getElementById('ctp-flags');
    const handicapDiv = document.getElementById('handicap-summary');
    const bagtagDiv = document.getElementById('bagtag-summary');
    const exportBtn = document.getElementById('export-csv');
    const saveBtn = document.getElementById('save-event');
    const loadBtn = document.getElementById('load-event');

    let players = [];
    const totalHoles = 24;

    // Add player row (pre-round)
    addPlayerBtn.addEventListener('click', () => {
        const entry = document.createElement('div');
        entry.classList.add('player-entry');
        entry.innerHTML = `
            <input type="text" class="player-name" placeholder="Player Name (required)">
            <input type="number" class="player-handicap" placeholder="Handicap (e.g. +2.5)" step="0.1">
            <input type="number" class="player-bagtag-in" placeholder="Incoming Bag Tag # (optional)" min="1" max="75">
            <button class="remove-player">Remove</button>
        `;
        playerList.appendChild(entry);
        entry.querySelector('.remove-player').addEventListener('click', () => entry.remove());
    });

    // Generate pre-round (cards, CTPs, flags)
    generateBtn.addEventListener('click', () => {
        gatherPlayers();
        if (players.length < 3) {
            alert('Need at least 3 players for a card!');
            return;
        }

        const total = players.length;
        const ctpInput = document.getElementById('ctp-holes').value.trim();
        const ctpHoles = ctpInput ? ctpInput.split(',').map(h => parseInt(h.trim())) : [];
        if (ctpHoles.length !== 10 || ctpHoles.some(isNaN)) {
            alert('Enter exactly 10 valid CTP holes, comma-separated.');
            return;
        }

        const startsInput = document.getElementById('group-starts').value.trim();
        const groupStarts = startsInput ? startsInput.split(',').map(s => parseInt(s.trim())) : [];
        const numGroups = groupStarts.length;
        if (numGroups < 1 || groupStarts.some(isNaN) || new Set(groupStarts).size !== numGroups) {
            alert('Enter valid, unique starting holes for each group, comma-separated.');
            return;
        }

        // Create cards: Distribute players into groups
        const shuffled = shuffleArray([...players]);
        const cardSize = Math.ceil(total / numGroups);
        const cards = [];
        for (let i = 0; i < total; i += cardSize) {
            cards.push(shuffled.slice(i, i + cardSize));
        }
        if (cards.length > numGroups) {
            // Merge extras if needed
            cards[numGroups - 1].push(...cards.slice(numGroups).flat());
            cards.length = numGroups;
        }

        // Assign CTP duties (random players per hole)
        const ctpAssignments = ctpHoles.map(hole => ({hole, player: shuffleArray([...shuffled])[Math.floor(Math.random() * total)]}));

        // Handicap avg
        const handicaps = players.map(p => p.handicap || 0);
        const avgHandicap = handicaps.reduce((a, b) => a + b, 0) / handicaps.length;

        // Display cards with starting holes
        cardsDiv.innerHTML = `<h3>Group & Starting Holes (${total} players, ${numGroups} groups)</h3>` + 
            cards.map((card, idx) => `<div class="card-group"><strong>Group ${idx+1} - Starting Hole: ${groupStarts[idx]} (${card.length} players)</strong><ul>${card.map(p => `<li>${p.name} (Handicap: ${p.handicap || 'N/A'}, Incoming Tag: ${p.bagtagIn || 'None'})</li>`).join('')}</ul></div>`).join('');

        ctpAssignmentsDiv.innerHTML = `<h3>CTP Assignments (Player Duties, $5 Entry)</h3><ul>${ctpAssignments.map(a => `<li>Hole ${a.hole}: ${a.player.name}</li>`).join('')}</ul><p>Each winner shares pooled entries (100% payout).</p>`;

        handicapDiv.innerHTML = `<h3>Handicap Summary (for Net Payouts)</h3><p>Avg Handicap: ${avgHandicap.toFixed(2)}</p><p>Net = Raw - Handicap (raw for tags/low raw).</p>`;

        // Flag bring out/pick up logic
        const { bringOut, pickUp } = calculateFlagAssignments(groupStarts, ctpHoles);

        let flagsHTML = '<h3>CTP Flag Assignments</h3>';
        for (let group = 1; group <= numGroups; group++) {
            const takeOut = (bringOut[group] || []).sort((a,b) => a - b).join(', ') || 'None';
            const pick = (pickUp[group] || []).sort((a,b) => a - b).join(', ') || 'None';
            flagsHTML += `<h4>Group ${group}</h4><p>Take out CTP flags: ${takeOut}</p><p>Pick Up: ${pick}</p>`;
        }
        ctpFlagsDiv.innerHTML = flagsHTML;

        // Show post-round
        postRoundSection.style.display = 'block';
        postPlayerList.innerHTML = '';
        players.forEach(p => {
            const entry = document.createElement('div');
            entry.classList.add('post-player-entry');
            entry.innerHTML = `
                <span>${p.name} (Incoming Tag: ${p.bagtagIn || 'None'})</span>
                <input type="number" class="player-raw-score" placeholder="Raw Score (required for tags)" min="-20" max="100">
            `;
            postPlayerList.appendChild(entry);
        });

        outputSection.style.display = 'block';
        bagtagDiv.innerHTML = '';
    });

    // Finalize post-round
    finalizeBtn.addEventListener('click', () => {
        gatherPlayers();
        const scoreEntries = document.querySelectorAll('.post-player-entry');
        let hasScores = true;
        scoreEntries.forEach((entry, i) => {
            const rawScore = parseFloat(entry.querySelector('.player-raw-score').value);
            if (isNaN(rawScore)) hasScores = false;
            else {
                players[i].rawScore = rawScore;
                players[i].netScore = rawScore - (players[i].handicap || 0);
            }
        });
        if (!hasScores) {
            alert('Enter raw scores for all players!');
            return;
        }

        const incomingTags = players.filter(p => p.bagtagIn).map(p => p.bagtagIn).sort((a, b) => a - b);
        const sortedByRaw = [...players].sort((a, b) => a.rawScore - b.rawScore);
        sortedByRaw.forEach((p, i) => p.bagtagOut = i < incomingTags.length ? incomingTags[i] : null);

        bagtagDiv.innerHTML = `<h3>Bag Tag Results (Based on Raw Scores)</h3>
            <p>Tags redistributed among incoming tags (up to 75 available, ~35 in play). Players keep tags for week/challenges.</p>
            <table><thead><tr><th>Player</th><th>Raw Score</th><th>Net Score</th><th>Incoming Tag</th><th>Outgoing Tag</th></tr></thead>
            <tbody>${sortedByRaw.map(p => `<tr><td>${p.name}</td><td>${p.rawScore}</td><td>${p.netScore.toFixed(2)}</td><td>${p.bagtagIn || 'None'}</td><td>${p.bagtagOut || 'None'}</td></tr>`).join('')}</tbody></table>
            <p>Low Raw Winner: ${sortedByRaw[0].name} (Score: ${sortedByRaw[0].rawScore}) - Use for buy-in payout.</p>`;
        document.getElementById('buyins-payouts').innerHTML += `<p>Note: Use raw scores for low raw buy-in and bag tags; nets for handicapped payouts.</p>`;
    });

    function gatherPlayers() {
        players = [];
        document.querySelectorAll('.player-entry').forEach(entry => {
            const name = entry.querySelector('.player-name').value.trim();
            const handicap = parseFloat(entry.querySelector('.player-handicap').value) || 0;
            const bagtagIn = parseInt(entry.querySelector('.player-bagtag-in').value) || null;
            if (name) players.push({name, handicap, bagtagIn});
        });
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function calculateFlagAssignments(groupStarts, ctpHoles) {
        const numGroups = groupStarts.length;
        const bringOut = Object.fromEntries(groupStarts.map((_, i) => [i+1, []]));
        const pickUp = Object.fromEntries(groupStarts.map((_, i) => [i+1, []]));

        ctpHoles.forEach(ctp => {
            // For each CTP, find relative order from each group's start
            const distances = groupStarts.map(start => (ctp - start + totalHoles) % totalHoles);
            const order = [...groupStarts.keys()].sort((a, b) => distances[a] - distances[b]).map(i => i+1);

            // First in order brings out (take out), last picks up
            bringOut[order[0]].push(ctp);
            pickUp[order[order.length - 1]].push(ctp);
        });

        return { bringOut, pickUp };
    }

    // Export CSV (updated to include flags)
    exportBtn.addEventListener('click', () => {
        gatherPlayers();
        let csv = 'Sawmill League Event Export\n';
        csv += `Players: ${players.length}\n`;
        csv += 'Name,Handicap,Incoming Tag,Raw Score,Net Score,Outgoing Tag\n' + players.map(p => `${p.name},${p.handicap},${p.bagtagIn || ''},${p.rawScore || ''},${p.netScore || ''},${p.bagtagOut || ''}`).join('\n');
        csv += '\n\nGroups:\n' + cardsDiv.innerText.replace(/\n/g, '\n');
        csv += '\n\nCTPs:\n' + ctpAssignmentsDiv.innerText.replace(/\n/g, '\n');
        csv += '\n\nFlags:\n' + ctpFlagsDiv.innerText.replace(/\n/g, '\n');
        csv += '\n\nBag Tags:\n' + bagtagDiv.innerText.replace(/\n/g, '\n');
        downloadCSV(csv, 'sawmill-league-event.csv');
    });

    function downloadCSV(content, filename) {
        const blob = new Blob([content], {type: 'text/csv;charset=utf-8;'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }

    // Save/Load (carry over outgoing tags as next incoming)
    saveBtn.addEventListener('click', () => {
        gatherPlayers();
        const nextPlayers = players.map(p => ({name: p.name, handicap: p.handicap, bagtagIn: p.bagtagOut}));
        localStorage.setItem('sawmillEvent', JSON.stringify(nextPlayers));
        alert('Event saved! Outgoing tags set as next week\'s incoming.');
    });

    loadBtn.addEventListener('click', () => {
        const saved = localStorage.getItem('sawmillEvent');
        if (saved) {
            players = JSON.parse(saved);
            playerList.innerHTML = '';
            players.forEach(p => {
                addPlayerBtn.click();
                const entries = playerList.querySelectorAll('.player-entry');
                const last = entries[entries.length - 1];
                last.querySelector('.player-name').value = p.name;
                last.querySelector('.player-handicap').value = p.handicap || '';
                last.querySelector('.player-bagtag-in').value = p.bagtagIn || '';
            });
            alert('Loaded last event! Using outgoing tags as incoming.');
        } else {
            alert('No saved event found.');
        }
    });
});
