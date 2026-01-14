document.addEventListener('DOMContentLoaded', () => {
    console.log("Script loaded successfully!"); // Check browser console for this message

    const addPlayerBtn = document.getElementById('add-player');
    const generateBtn = document.getElementById('generate-btn');
    const playerList = document.getElementById('player-list');
    const ctpFlags = document.getElementById('ctp-flags');
    const output = document.getElementById('output');

    if (!addPlayerBtn || !generateBtn) {
        console.error("Buttons not found in HTML!");
        return;
    }

    // Add Player button
    addPlayerBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'player-row';
        row.innerHTML = `
            <input type="text" class="player-name" placeholder="Player Name">
            <input type="number" class="player-tag" placeholder="Incoming Tag #">
            <button class="remove-btn">Remove</button>
        `;
        playerList.appendChild(row);
        row.querySelector('.remove-btn').onclick = () => row.remove();
        console.log("Player row added");
    });

    // Generate button - core flag logic
    generateBtn.addEventListener('click', () => {
        console.log("Generate clicked");

        const startsStr = document.getElementById('group-starts').value.trim();
        const starts = startsStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

        const ctpStr = document.getElementById('ctp-holes').value.trim();
        const ctps = ctpStr.split(',').map(h => parseInt(h.trim())).filter(n => !isNaN(n));

        if (starts.length === 0 || ctps.length === 0) {
            alert("Enter starting holes and CTP holes.");
            return;
        }

        const flags = calculateFlags(starts, ctps);

        let html = '';
        for (let g = 1; g <= starts.length; g++) {
            const takeOut = (flags.bringOut[g] || []).sort((a,b)=>a-b).join(', ') || 'None';
            const pickUp = (flags.pickUp[g] || []).sort((a,b)=>a-b).join(', ') || 'None';
            html += `
                <h4>Group ${g} (starts on hole ${starts[g-1]})</h4>
                <p><strong>Take out CTP flags:</strong> ${takeOut}</p>
                <p><strong>Pick Up:</strong> ${pickUp}</p>
                <hr>
            `;
        }
        ctpFlags.innerHTML = html;
        output.style.display = 'block';
    });

    function calculateFlags(starts, ctps) {
        const bringOut = {}, pickUp = {};
        for (let i = 1; i <= starts.length; i++) {
            bringOut[i] = []; pickUp[i] = [];
        }
        const total = 24;

        ctps.forEach(hole => {
            let minD = Infinity, maxD = -Infinity;
            let first = -1, last = -1;
            starts.forEach((s, idx) => {
                let d = (hole - s + total) % total;
                if (d < minD) { minD = d; first = idx + 1; }
                if (d > maxD) { maxD = d; last = idx + 1; }
            });
            bringOut[first].push(hole);
            pickUp[last].push(hole);
        });
        return { bringOut, pickUp };
    }
});
