document.addEventListener('DOMContentLoaded', () => {
    const totalHoles = 24;
    let players = [];

    // Add Player (optional)
    document.getElementById('add-player').addEventListener('click', () => {
        const div = document.createElement('div');
        div.className = 'player-row';
        div.innerHTML = `
            <input type="text" class="player-name" placeholder="Player Name">
            <input type="number" class="player-tag" placeholder="Incoming Tag #" min="1" max="75">
            <button class="remove-btn">Remove</button>
        `;
        document.getElementById('player-list').appendChild(div);
        div.querySelector('.remove-btn').onclick = () => div.remove();
    });

    // Generate CTP Flags (works without players)
    document.getElementById('generate-btn').addEventListener('click', () => {
        const startsInput = document.getElementById('group-starts').value.trim();
        const groupStarts = startsInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (groupStarts.length === 0) return alert('Enter starting holes.');

        const ctpInput = document.getElementById('ctp-holes').value.trim();
        const ctpHoles = ctpInput.split(',').map(h => parseInt(h.trim())).filter(n => !isNaN(n));
        if (ctpHoles.length === 0) return alert('Enter CTP holes.');

        const { bringOut, pickUp } = calculateFlagAssignments(groupStarts, ctpHoles);
        let html = '';
        for (let g = 1; g <= groupStarts.length; g++) {
            const take = (bringOut[g] || []).sort((a,b)=>a-b).join(', ') || 'None';
            const pick = (pickUp[g] || []).sort((a,b)=>a-b).join(', ') || 'None';
            html += `
                <h4>Group ${g} (starts on hole ${groupStarts[g-1]})</h4>
                <p><strong>Take out CTP flags:</strong> ${take}</p>
                <p><strong>Pick Up:</strong> ${pick}</p>
                <hr>
            `;
        }
        document.getElementById('ctp-flags').innerHTML = html;
        document.getElementById('output').style.display = 'block';
    });

    // Button to show score entry (after round)
    document.getElementById('show-scores-btn').addEventListener('click', () => {
        // Gather any added players
        players = [];
        document.querySelectorAll('#player-list .player-row').forEach(row => {
            const name = row.querySelector('.player-name').value.trim();
            const tag = parseInt(row.querySelector('.player-tag').value) || null;
            if (name) players.push({ name, tag });
        });

        if (players.length === 0) {
            alert('No players added yet. Add some now or manually note tags on paper.');
            return;
        }

        const scoreList = document.getElementById('score-list');
        scoreList.innerHTML = '';
        players.forEach((p, i) => {
            const div = document.createElement('div');
            div.className = 'score-row';
            div.innerHTML = `
                <label>${p.name} ${p.tag ? `(Incoming Tag #${p.tag})` : ''}</label>
                <input type="number" class="raw-score" data-idx="${i}" placeholder="Raw score from UDisc">
            `;
            scoreList.appendChild(div);
        });

        document.getElementById('scores-section').style.display = 'block';
    });

    // Assign tags from scores
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

        // Sort by raw score (lowest = best)
        scores.sort((a, b) => a.score - b.score);

        // Get available tags (turned in)
        let availableTags = players
            .map(p => p.tag)
            .filter(t => t != null)
            .sort((a, b) => a - b);

        // Assign & build results
        let html = '';
        scores.forEach((s, rank) => {
            const p = players[s.idx];
            const newTag = rank < availableTags.length ? availableTags[rank] : null;
            const change = p.tag != null && newTag != null ? newTag - p.tag : 0;
            const changeText = change < 0 ? `Gained ${Math.abs(change)} spots` : (change > 0 ? `Lost ${change} spots` : 'No change');
            const changeClass = change < 0 ? 'gained' : (change > 0 ? 'lost' : '');

            html += `
                <h4>Rank ${rank + 1}: ${p.name}</h4>
                <p>Raw Score: <strong>${s.score}</strong></p>
                <p>Old Tag: ${p.tag || '—'} → <strong>New Tag: ${newTag || '—'}</strong></p>
                <p class="${changeClass}">${changeText}</p>
                <hr>
            `;
            p.tag = newTag; // Update for persistence
        });
        document.getElementById('bagtag-results').innerHTML = html;

        // Show updated current owners
        let currentHtml = '<ul>';
        const sortedCurrent = [...players].filter(p => p.tag != null).sort((a,b) => a.tag - b.tag);
        if (sortedCurrent.length === 0) {
            currentHtml = '<p>No tags assigned yet.</p>';
        } else {
            sortedCurrent.forEach(p => {
                currentHtml += `<li>Tag #${p.tag}: <strong>${p.name}</strong></li>`;
            });
            currentHtml += '</ul>';
        }
        document.getElementById('current-tags').innerHTML = currentHtml;

        // Optional: scroll to results
        document.getElementById('bagtag-output').scrollIntoView({ behavior: 'smooth' });
    });

    // Save / Load
    document.getElementById('save-session').addEventListener('click', () => {
        localStorage.setItem('sawmillBagTags', JSON.stringify(players));
        alert('Saved current tag owners!');
    });

    document.getElementById('load-last').addEventListener('click', () => {
        const saved = localStorage.getItem('sawmillBagTags');
        if (!saved) return alert('No saved data.');
        players = JSON.parse(saved);
        document.getElementById('player-list').innerHTML = '';
        players.forEach(p => {
            const div = document.createElement('div');
            div.className = 'player-row';
            div.innerHTML = `
                <input type="text" class="player-name" value="${p.name}">
                <input type="number" class="player-tag" value="${p.tag || ''}">
                <button class="remove-btn">Remove</button>
            `;
            document.getElementById('player-list').appendChild(div);
            div.querySelector('.remove-btn').onclick = () => div.remove();
        });
        alert('Loaded last saved players & tags.');
    });

    // Flag calculation
    function calculateFlagAssignments(groupStarts, ctpHoles) {
        const bringOut = {}, pickUp = {};
        for (let i = 1; i <= groupStarts.length; i++) {
            bringOut[i] = []; pickUp[i] = [];
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
