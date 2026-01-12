document.addEventListener('DOMContentLoaded', () => {
    const addGroupBtn = document.getElementById('add-group');
    const groupList = document.getElementById('group-list');
    const startingHolesSection = document.getElementById('starting-holes-section');
    const startingHolesList = document.getElementById('starting-holes-list');
    const generateBtn = document.getElementById('generate-btn');
    const outputSection = document.getElementById('output');
    const groupAssignmentsDiv = document.getElementById('group-assignments');
    const ctpSetupDiv = document.getElementById('ctp-setup');
    const ctpCleanupDiv = document.getElementById('ctp-cleanup');
    const exportBtn = document.getElementById('export-csv');
    const saveBtn = document.getElementById('save-event');
    const loadBtn = document.getElementById('load-event');

    let groups = [];

    function updateStartingHolesUI() {
        startingHolesList.innerHTML = '';
        const groupEntries = document.querySelectorAll('.group-entry');
        if (groupEntries.length === 0) {
            startingHolesSection.style.display = 'none';
            return;
        }
        startingHolesSection.style.display = 'block';

        groupEntries.forEach((entry, idx) => {
            const name = entry.querySelector('.group-name').value.trim() || `Group ${idx + 1}`;
            const div = document.createElement('div');
            div.classList.add('starting-hole-entry');
            div.innerHTML = `
                <span>${name}</span>
                <input type="number" class="starting-hole-input" data-index="${idx}" min="1" max="24" placeholder="1–24">
            `;
            startingHolesList.appendChild(div);
        });
    }

    addGroupBtn.addEventListener('click', () => {
        const entry = document.createElement('div');
        entry.classList.add('group-entry');
        entry.innerHTML = `
            <input type="text" class="group-name" placeholder="Group/Card Name (e.g. Kevin, Jack, EZ)">
            <button class="remove-group">Remove</button>
        `;
        groupList.appendChild(entry);

        entry.querySelector('.remove-group').addEventListener('click', () => {
            entry.remove();
            updateStartingHolesUI();
        });

        // Update on name change
        entry.querySelector('.group-name').addEventListener('input', updateStartingHolesUI);

        updateStartingHolesUI();
    });

    generateBtn.addEventListener('click', () => {
        groups = [];
        document.querySelectorAll('.group-entry').forEach(entry => {
            const name = entry.querySelector('.group-name').value.trim();
            if (name) groups.push({name});
        });

        if (groups.length === 0) {
            alert('Add at least one group/card.');
            return;
        }

        // Collect starting holes
        const startingInputs = document.querySelectorAll('.starting-hole-input');
        const startingMap = {};
        const usedHoles = new Set();

        startingInputs.forEach(input => {
            const idx = input.dataset.index;
            const val = parseInt(input.value);
            if (!isNaN(val) && val >= 1 && val <= 24) {
                if (usedHoles.has(val)) {
                    alert(`Duplicate starting hole ${val} detected! Please fix.`);
                    return;
                }
                usedHoles.add(val);
                startingMap[idx] = val;
            }
        });

        // Assign any missing starting holes randomly
        let available = Array.from({length: 24}, (_, i) => i + 1).filter(h => !usedHoles.has(h));
        available = shuffleArray(available);

        const finalStarting = groups.map((_, idx) => startingMap[idx] || available.shift() || null);

        // CTP holes
        let ctpInput = document.getElementById('ctp-holes').value.trim();
        let ctpHoles = ctpInput ? ctpInput.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 24) : [];
        if (ctpHoles.length !== 10 || new Set(ctpHoles).size !== 10) {
            alert('Using random 10 unique CTP holes.');
            ctpHoles = shuffleArray(Array.from({length: 24}, (_, i) => i + 1)).slice(0, 10);
        }

        // Assignments
        const shuffled = shuffleArray([...groups]);
        const setup = ctpHoles.map((h, i) => ({hole: h, group: shuffled[i % groups.length].name}));
        const cleanupShuffled = shuffleArray([...groups]);
        const cleanup = ctpHoles.map((h, i) => ({hole: h, group: cleanupShuffled[i % groups.length].name}));

        // Output
        groupAssignmentsDiv.innerHTML = `<h3>Groups & Starting Holes</h3>` +
            groups.map((g, i) => `<div class="assignment-group"><strong>${g.name}</strong> → Starting Hole: ${finalStarting[i] || '?'}</div>`).join('');

        ctpSetupDiv.innerHTML = `<h3>Bring Out / Setup Flags</h3><ul>${setup.map(a => `<li>Hole ${a.hole}: ${a.group} (bring out flag)</li>`).join('')}</ul>`;

        ctpCleanupDiv.innerHTML = `<h3>Pick Up / Cleanup Flags</h3><ul>${cleanup.map(a => `<li>Hole ${a.hole}: ${a.group} (pick up flag)</li>`).join('')}</ul>`;

        outputSection.style.display = 'block';
    });

    function shuffleArray(arr) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    // Export (basic)
    exportBtn.addEventListener('click', () => {
        let csv = "Group,Starting Hole\n";
        document.querySelectorAll('.assignment-group').forEach(div => {
            const text = div.innerText.replace(' → ', ',');
            csv += text + "\n";
        });
        csv += "\nBring Out Flags\n" + ctpSetupDiv.innerText.replace(/\n/g, "\n");
        csv += "\nPick Up Flags\n" + ctpCleanupDiv.innerText.replace(/\n/g, "\n");

        const blob = new Blob([csv], {type: 'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sawmill-assignments.csv';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Save/Load can be added back if needed — omitted for simplicity
});
