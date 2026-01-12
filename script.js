document.addEventListener('DOMContentLoaded', function() {
    console.log("Script fully loaded and DOM ready");

    // Null-safe getElement
    function safeGet(id) {
        const el = document.getElementById(id);
        if (!el) console.error(`Element with id "${id}" not found!`);
        return el;
    }

    const addGroupBtn = safeGet('add-group');
    const groupList = safeGet('group-list');
    const startingHolesSection = safeGet('starting-holes-section');
    const startingHolesList = safeGet('starting-holes-list');
    const generateBtn = safeGet('generate-btn');

    if (!addGroupBtn || !generateBtn) {
        console.error("Critical elements missing - check HTML IDs");
        return;
    }

    let groups = [];

    function updateStartingHolesUI() {
        console.log("Updating starting holes UI");
        if (!startingHolesList) return;
        startingHolesList.innerHTML = '';
        const groupEntries = document.querySelectorAll('.group-entry') || [];
        if (groupEntries.length === 0) {
            if (startingHolesSection) startingHolesSection.style.display = 'none';
            return;
        }
        if (startingHolesSection) startingHolesSection.style.display = 'block';

        groupEntries.forEach((entry, idx) => {
            const nameInput = entry.querySelector('.group-name');
            const name = nameInput ? nameInput.value.trim() : `Group ${idx + 1}`;
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
        console.log("Add group button clicked");
        const entry = document.createElement('div');
        entry.classList.add('group-entry');
        entry.innerHTML = `
            <input type="text" class="group-name" placeholder="Group/Card Name (e.g. Kevin, Jack, EZ)">
            <button class="remove-group">Remove</button>
        `;
        if (groupList) groupList.appendChild(entry);

        const removeBtn = entry.querySelector('.remove-group');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                entry.remove();
                updateStartingHolesUI();
            });
        }

        const nameInput = entry.querySelector('.group-name');
        if (nameInput) nameInput.addEventListener('input', updateStartingHolesUI);

        updateStartingHolesUI();
    });

    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            console.log("Generate button clicked - starting execution");
            groups = [];
            document.querySelectorAll('.group-entry').forEach(entry => {
                const nameInput = entry.querySelector('.group-name');
                const name = nameInput ? nameInput.value.trim() : '';
                if (name) groups.push({name});
            });

            if (groups.length === 0) {
                alert('Add at least one group/card first.');
                return;
            }

            // Collect manual starting holes
            const inputs = document.querySelectorAll('.starting-hole-input');
            const used = new Set();
            const map = {};

            inputs.forEach(input => {
                const val = parseInt(input.value);
                if (!isNaN(val) && val >= 1 && val <= 24) {
                    if (used.has(val)) {
                        alert(`Duplicate hole ${val} - please fix before generating.`);
                        return false; // early exit flag
                    }
                    used.add(val);
                    map[input.dataset.index] = val;
                }
            });

            // Auto fill missing
            let avail = Array.from({length: 24}, (_, i) => i + 1).filter(h => !used.has(h));
            avail = shuffleArray(avail);

            const finalHoles = groups.map((_, idx) => map[idx] || avail.shift() || null);

            // CTP holes
            const ctpInput = document.getElementById('ctp-holes')?.value.trim() || '';
            let ctp = ctpInput.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 24);
            if (ctp.length !== 10 || new Set(ctp).size !== 10) {
                console.log("Using random CTP holes");
                ctp = shuffleArray(Array.from({length: 24}, (_, i) => i + 1)).slice(0, 10);
            }

            // Assignments
            const shuffled = shuffleArray([...groups]);
            const setup = ctp.map((h, i) => ({hole: h, group: shuffled[i % groups.length].name}));
            const cleanupShuf = shuffleArray([...groups]);
            const cleanup = ctp.map((h, i) => ({hole: h, group: cleanupShuf[i % groups.length].name}));

            // Render
            let html = '<h3>Groups & Starting Holes</h3>';
            groups.forEach((g, i) => {
                html += `<div class="assignment-group"><strong>${g.name}</strong> → Starting Hole: ${finalHoles[i] || '?'}</div>`;
            });
            document.getElementById('group-assignments').innerHTML = html;

            document.getElementById('ctp-setup').innerHTML = `<h3>Bring Out Flags</h3><ul>${setup.map(a => `<li>Hole ${a.hole}: ${a.group}</li>`).join('')}</ul>`;

            document.getElementById('ctp-cleanup').innerHTML = `<h3>Pick Up Flags</h3><ul>${cleanup.map(a => `<li>Hole ${a.hole}: ${a.group}</li>`).join('')}</ul>`;

            document.getElementById('output').style.display = 'block';
            console.log("Generation finished successfully");
        });
    }

    function shuffleArray(arr) {
        const copy = arr.slice();
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    // Initial UI update if groups exist on load
    updateStartingHolesUI();
});
