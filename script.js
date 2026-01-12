document.addEventListener('DOMContentLoaded', () => {
    const addPlayerBtn = document.getElementById('add-player');
    const playerList = document.getElementById('player-list');
    const generateBtn = document.getElementById('generate-btn');
    const postRoundSection = document.getElementById('post-round');
    const postPlayerList = document.getElementById('post-player-list');
    const finalizeBtn = document.getElementById('finalize-btn');
    const outputSection = document.getElementById('output');
    const cardsDiv = document.getElementById('cards');
    const ctpDiv = document.getElementById('ctp-assignments');
    const handicapDiv = document.getElementById('handicap-summary');
    const bagtagDiv = document.getElementById('bagtag-summary');
    const exportBtn = document.getElementById('export-csv');
    const saveBtn = document.getElementById('save-event');
    const loadBtn = document.getElementById('load-event');

    let players = [];

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

    // Generate pre-round (cards, CTPs)
    generateBtn.addEventListener('click', () => {
        gatherPlayers();
        if (players.length < 3) {
            alert('Need at least 3 players for a card!');
            return;
        }

        const total = players.length;

        // Shuffle and make cards (3-5 per card)
        const shuffled = shuffleArray([...players]);
        const cards = [];
        let cardSize = Math.ceil(total / Math.floor(total / 4)); // ~4 per card
        cardSize = Math.max(3, Math.min(5, cardSize));
        for (let i = 0; i < shuffled.length; i += cardSize) {
            cards.push(shuffled.slice(i, i + cardSize));
        }

        // 10 CTPs: random unique holes 1-24, assign to random players
        const holes = Array.from({length: 24}, (_, i) => i + 1);
        const ctpHoles = shuffleArray([...holes]).slice(0, 10);
        const ctpPlayers = shuffleArray([...shuffled]).slice(0, Math.min(10, total));
        const ctpAssignments = ctpHoles.map((hole, i) => ({hole, player: ctpPlayers[i % ctpPlayers.length]}));

        // Handicap avg (for net payouts)
        const handicaps = players.map(p => p.handicap || 0);
        const avgHandicap = handicaps.reduce((a, b) => a + b, 0) / handicaps.length;

        // Display pre-round
        cardsDiv.innerHTML = `<h3>Card Groupings (${total} players)</h3>` + 
            cards.map((card, idx) => `<div class="card-group"><strong>Card ${idx+1} (${card.length} players)</strong><ul>${card.map(p => `<li>${p.name} (Handicap: ${p.handicap || 'N/A'}, Incoming Tag: ${p.bagtagIn || 'None'})</li>`).join('')}</ul></div>`).join('');

        ctpDiv.innerHTML = `<h3>10 CTP Assignments (Holes 1-24, $5 Entry per Player)</h3><ul>${ctpAssignments.map(a => `<li>Hole ${a.hole}: ${a.player.name}</li>`).join('')}</ul><p>Each CTP winner gets their share of the pooled $5 entries (100% payout).</p>`;

        handicapDiv.innerHTML = `<h3>Handicap Summary (for Net Payouts)</h3><p>Avg Handicap: ${avgHandicap.toFixed(2)}</p><p>Net Score = Raw Score - Handicap (use for handicapped payouts; raw for tags/low raw).</p>`;

        // Show post-round section for scores
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
        bagtagDiv.innerHTML = ''; // Clear until finalized
    });

    // Finalize post-round (assign tags based on raw scores)
    finalizeBtn.addEventListener('click', () => {
        gatherPlayers(); // Refresh if needed
        const scoreEntries = document.querySelectorAll('.post-player-entry');
        let hasScores = true;
        scoreEntries.forEach((entry, i) => {
            const rawScore = parseFloat(entry.querySelector('.player-raw-score').value);
            if (isNaN(rawScore)) {
                hasScores = false;
            } else {
                players[i].rawScore = rawScore;
                players[i].netScore = rawScore - (players[i].handicap || 0);
            }
        });

        if (!hasScores) {
            alert('Enter raw scores for all players to assign bag tags!');
            return;
        }

        // Collect incoming tags (only those with tags)
        const incomingTags = players.filter(p => p.bagtagIn).map(p => p.bagtagIn).sort((a, b) => a - b);

        // Sort players by raw score ascending (low best) for tags/low raw
        const sortedByRaw = [...players].sort((a, b) => a.rawScore - b.rawScore);

        // Assign outgoing tags: Best gets lowest incoming tag, next gets next, etc.
        // If more players than tags, untagged stay untagged; if fewer, extra tags unassigned
        sortedByRaw.forEach((player, i) => {
            player.bagtagOut = (i < incomingTags.length) ? incomingTags[i] : null;
        });

        // Display bag tag summary
        bagtagDiv.innerHTML = `<h3>Bag Tag Results (Based on Raw Scores)</h3>
            <p>Tags redistributed among incoming tags (up to 75 available, ~35 in play). Players keep tags for week/challenges.</p>
            <table><thead><tr><th>Player</th><th>Raw Score</th><th>Net Score</th><th>Incoming Tag</th><th>Outgoing Tag</th></tr></thead>
            <tbody>${sortedByRaw.map(p => `<tr><td>${p.name}</td><td>${p.rawScore}</td><td>${p.netScore.toFixed(2)}</td><td>${p.bagtagIn || 'None'}</td><td>${p.bagtagOut || 'None'}</td></tr>`).join('')}</tbody></table>
            <p>Low Raw Winner: ${sortedByRaw[0].name} (Score: ${sortedByRaw[0].rawScore}) - Use for buy-in payout.</p>`;

        // Update buyins with low raw note
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

    // Export CSV
    exportBtn.addEventListener('click', () => {
        gatherPlayers();
        let csv = 'Sawmill League Event Export\n';
        csv += `Players: ${players.length}\n`;
        csv += 'Name,Handicap,Incoming Tag,Raw Score,Net Score,Outgoing Tag\n' + players.map(p => `${p.name},${p.handicap},${p.bagtagIn || ''},${p.rawScore || ''},${p.netScore || ''},${p.bagtagOut || ''}`).join('\n');
        csv += '\n\nCards:\n' + cardsDiv.innerText.replace(/\n/g, '\n');
        csv += '\n\nCTPs:\n' + ctpDiv.innerText.replace(/\n/g, '\n');
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
        // Set incoming for next as this outgoing
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