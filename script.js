document.addEventListener('DOMContentLoaded', () => {
    const totalHoles = 24;
    let players = []; // optional — only used if you add players

    // Add Player (optional — can skip this)
    document.getElementById('add-player')?.addEventListener('click', () => {
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

    // Main Generate Button — works even without players
    document.getElementById('generate-btn').addEventListener('click', () => {
        const startsInput = document.getElementById('group-starts').value.trim();
        const groupStarts = startsInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (groupStarts.length === 0) return alert('Enter at least one starting hole.');

        const ctpInput = document.getElementById('ctp-holes').value.trim();
        const ctpHoles = ctpInput.split(',').map(h => parseInt(h.trim())).filter(n => !isNaN(n));
        if (ctpHoles.length === 0) return alert('Enter CTP holes.');

        // Calculate and show flag assignments
        const { bringOut, pickUp } = calculateFlagAssignments(groupStarts, ctpHoles);
        let html = '';
        for (let g = 1; g <= groupStarts.length; g++) {
            const take = (bringOut[g] || []).sort((a,b)=>a-b).join(', ') || 'None';
            const pick = (pickUp[g]  || []).sort((a,b)=>a-b).join(', ') || 'None';
            html += `
                <h4>Group ${g} (starts on hole ${groupStarts[g-1]})</h4>
                <p><strong>Take out CTP flags:</strong> ${take}</p>
                <p><strong>Pick Up:</strong> ${pick}</p>
                <hr>
            `;
        }
        document.getElementById('ctp-flags').innerHTML = html;
        document.getElementById('output').style.display = 'block';

        // Optional: show score section only if you want bag tags now
        // document.getElementById('scores-section').style.display = 'block';
    });

    // Your original flag calculation function
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
            if (firstG !== -1) bringOut[firstG].push(ctp);
            if (lastG  !== -1) pickUp[lastG].push(ctp);
        });

        return { bringOut, pickUp };
    }
});
