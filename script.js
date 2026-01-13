document.addEventListener('DOMContentLoaded', () => {
    const totalHoles = 24;
    let players = [];

    // -------------------
    // Add Player Row
    // -------------------
    document.getElementById('add-player').addEventListener('click', () => {
        const div = document.createElement('div');
        div.style.marginBottom = '10px';
        div.innerHTML = `
            <input type="text" class="player-name" placeholder="Player Name" style="width:45%;">
            <input type="number" class="player-tag" placeholder="Incoming Tag #" min="1" max="75" style="width:25%;">
            <button class="remove">Remove</button>
        `;
        document.getElementById('player-list').appendChild(div);
        div.querySelector('.remove').onclick = () => div.remove();
    });

    // -------------------
    // Generate Button
    // -------------------
    document.getElementById('generate-btn').addEventListener('click', () => {
        // Gather players
        players = [];
        document.querySelectorAll('#player-list > div').forEach(row => {
            const name = row.querySelector('.player-name').value.trim();
            const tag  = parseInt(row.querySelector('.player-tag').value) || null;
            if (name) players.push({ name, tag });
        });

        if (players.length < 3) return alert('Add at least 3 players.');

        // CTP & starting holes (same as before)
        const startsInput = document.getElementById('group-starts').value.trim();
        const groupStarts = startsInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (groupStarts.length === 0) return alert('Enter starting holes.');

        const ctpInput = document.getElementById('ctp-holes').value.trim();
        const ctpHoles = ctpInput.split(',').map(h => parseInt(h.trim())).filter(n => !isNaN(n));
        if (ctpHoles.length === 0) return alert('Enter CTP holes.');

        // Show scores section
        const scoreList = document.getElementById('score-list');
        scoreList.innerHTML = '';
        players.forEach((p, i) => {
            const div = document.createElement('div');
            div.innerHTML = `
                <label>${p.name} ${p.tag ? `(Tag #${p.tag})` : ''}</label>
                <input type="number" class="raw-score" data-idx="${i}" placeholder="Raw score from UDisc" step="0.5">
            `;
            scoreList.appendChild(div);
        });

        document.getElementById('scores-section').style.display = 'block';
        document.getElementById('output').style.display = 'block';

        // Generate flags (your working logic)
        const { bringOut, pickUp } = calculateFlagAssignments(groupStarts, ctpHoles);
        let flagsHTML = '';
        for (let g = 1; g <= groupStarts.length; g++) {
            const take = (bringOut[g] || []).sort((a,b)=>a-b).join(', ') || 'None';
            const pick = (pickUp[g]  || []).sort((a,b)=>a-b).join(', ') || 'None';
            flagsHTML += `
                <h4>Group ${g} (starts on ${groupStarts[g-1]})</h4>
                <p><strong>Take out CTP flags:</strong> ${take}</p>
                <p><strong>Pick Up:</strong> ${pick}</p>
                <hr>
            `;
        }
        document.getElementById('ctp-flags').innerHTML = flagsHTML;
    });

    // -------------------
    // Assign Tags Button
    // -------------------
    document.getElementById('assign-tags-btn').addEventListener('click', () => {
        const scores = [];
        let allFilled = true;

        document.querySelectorAll('.raw-score').forEach(inp => {
            const score = parseFloat(inp.value);
            const idx = parseInt(inp.dataset.idx);
            if (isNaN(score)) allFilled = false;
            else scores.push({ idx, score });
        });

        if (!allFilled) return alert('Enter raw scores for all players.');

        // Sort: lowest raw score = rank 1 (best)
        scores.sort((a, b) => a.score - b.score);

        // Collect available tags (only those turned in)
        let availableTags = players
            .map(p => p.tag)
            .filter(t => t != null)
            .sort((a, b) => a - b);

        // Assign
        const results = [];
        scores.forEach((s, rank) => {
            const p = players[s.idx];
            const newTag = rank < availableTags.length ? availableTags[rank] : null;
            const change = p.tag != null && newTag != null ? newTag - p.tag : 0;
            results.push({
                rank: rank + 1,
                name: p.name,
                raw: s.score,
                oldTag: p.tag || '—',
                newTag: newTag || '—',
                change: change
            });
            // Update player for persistence
            p.tag = newTag;
        });

        // Build results table
        let html = '<table><tr><th>Rank</th><th>Player</th><th>Raw</th><th>Old Tag</th><th>New Tag</th><th>Change</th></tr>';
        results.forEach(r => {
            let changeClass = '';
            if (r.change < 0) changeClass = 'gained';  // lower number = better
            else if (r.change > 0) changeClass = 'lost';
            html += `<tr>
                <td>${r.rank}</td>
                <td>${r.name}</td>
                <td>${r.raw}</td>
                <td>${r.oldTag}</td>
                <td><strong>${r.newTag}</strong></td>
                <td class="${changeClass}">${r.change !== 0 ? (r.change > 0 ? '+' : '') + r.change : '—'}</td>
            </tr>`;
        });
        html += '</table>';
        document.getElementById('bagtag-results').innerHTML = html;

        // Show current owners
        updateCurrentTagsDisplay();
    });

    function updateCurrentTagsDisplay() {
        let sorted = [...players].filter(p => p.tag != null).sort((a,b) => a.tag - b.tag);
        let html = '<table><tr><th>Tag #</th><th>Current Owner</th></tr>';
        sorted.forEach(p => {
            html += `<tr><td>${p.tag}</td><td>${p.name}</td></tr>`;
        });
        html += '</table>';
        if (sorted.length === 0) html = '<p>No tags currently assigned.</p>';
        document.getElementById('current-tags').innerHTML = html;
    }

    // -------------------
    // Save / Load (browser localStorage)
    // -------------------
    document.getElementById('save-session').addEventListener('click', () => {
        localStorage.setItem('sawmillBagTags', JSON.stringify(players));
        alert('Saved current tag owners for next week!');
    });

    document.getElementById('load-last').addEventListener('click', () => {
        const saved = localStorage.getItem('sawmillBagTags');
        if (!saved) return alert('No saved data found.');
        
        players = JSON.parse(saved);
        document.getElementById('player-list').innerHTML = '';
        players.forEach(p => {
            const div = document.createElement('div');
            div.style.marginBottom = '10px';
            div.innerHTML = `
                <input type="text" class="player-name" value="${p.name}" style="width:45%;">
                <input type="number" class="player-tag" value="${p.tag || ''}" placeholder="Tag #" min="1" max="75" style="width:25%;">
                <button class="remove">Remove</button>
            `;
            document.getElementById('player-list').appendChild(div);
            div.querySelector('.remove').onclick = () => div.remove();
        });
        updateCurrentTagsDisplay();
        alert('Loaded last week\'s players & tags!');
    });

    // Flag calculation function (your working version)
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
});
