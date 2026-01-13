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

    generateBtn.addEventListener('click', () => {
        gatherPlayers();
        if (players.length < 3) return alert('Need at least 3 players!');

        const total = players.length;
        const ctpInput = document.getElementById('ctp-holes').value.trim();
        const ctpHoles = ctpInput.split(',').map(h => parseInt(h.trim())).filter(n => !isNaN(n));
        if (ctpHoles.length !== 10) return alert('Enter exactly 10 valid CTP holes.');

        const startsInput = document.getElementById('group-starts').value.trim();
        const groupStarts = startsInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        const numGroups = groupStarts.length;
        if (numGroups < 1 || new Set(groupStarts).size !== numGroups) return alert('Enter unique starting holes.');

        const shuffled = shuffleArray([...players]);
        const cards = [];
        const cardSize = Math.ceil(total / numGroups);
        for (let i = 0; i < total; i += cardSize) {
            cards.push(shuffled.slice(i, i + cardSize));
        }

        cardsDiv.innerHTML = `<h3>Groups & Starting Holes (${total} players, ${numGroups} groups)</h3>` + 
            cards.map((card, idx) => `<div class="card-group"><strong>Group ${idx+1} → Starting Hole: ${groupStarts[idx]}</strong><ul>${card.map(p => `<li>${p.name} (Handicap: ${p.handicap || 'N/A'}, Incoming Tag: ${p.bagtagIn || 'None'})</li>`).join('')}</ul></div>`).join('');

        const { bringOut, pickUp } = calculateFlagAssignments(groupStarts, ctpHoles);

        let flagsHTML = '<h3>CTP Flag Assignments (Bring Out / Pick Up)</h3>';
        for (let g = 1; g <= numGroups; g++) {
            const takeOut = (bringOut[g] || []).sort((a,b)=>a-b).join(', ') || 'None';
            const pick = (pickUp[g] || []).sort((a,b)=>a-b).join(', ') || 'None';
            flagsHTML += `<h4>Group ${g}</h4><p>Take out CTP flags: ${takeOut}</p><p>Pick Up: ${pick}</p><hr>`;
        }
        ctpFlagsDiv.innerHTML = flagsHTML;

        // ... (rest of generateBtn code unchanged: CTP player assignments, handicap summary, post-round setup)
        // Note: I omitted repeating the full unchanged parts for brevity—keep them from your previous script.js

        postRoundSection.style.display = 'block';
        outputSection.style.display = 'block';
    });

    function calculateFlagAssignments(groupStarts, ctpHoles) {
        const bringOut = {};
        const pickUp = {};
        for (let i = 1; i <= groupStarts.length; i++) {
            bringOut[i] = [];
            pickUp[i] = [];
        }

        ctpHoles.forEach(ctp => {
            let minDist = Infinity, maxDist = -Infinity;
            let firstG = -1, lastG = -1;
            groupStarts.forEach((start, idx) => {
                let dist = (ctp - start + totalHoles) % totalHoles;
                if (dist < minDist) { minDist = dist; firstG = idx + 1; }
                if (dist > maxDist) { maxDist = dist; lastG = idx + 1; }
            });
            bringOut[firstG].push(ctp);
            pickUp[lastG].push(ctp);
        });

        return { bringOut, pickUp };
    }

    // Keep the rest of your script.js (gatherPlayers, shuffleArray, finalizeBtn, save/load/export, etc.) unchanged
});
