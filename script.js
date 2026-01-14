document.addEventListener('DOMContentLoaded', () => {
    const totalHolesSelect = document.getElementById('total-holes');
    const customHolesInput = document.getElementById('custom-holes');
    const generateBtn = document.getElementById('generate-btn');
    const outputSection = document.getElementById('output');
    const ctpFlagsDiv = document.getElementById('ctp-flags');
    const courseDisplay = document.getElementById('course-display');

    // Show custom holes input if selected
    totalHolesSelect.addEventListener('change', () => {
        customHolesInput.style.display = totalHolesSelect.value === 'custom' ? 'block' : 'none';
    });

    generateBtn.addEventListener('click', () => {
        const courseName = document.getElementById('course-name').value.trim() || 'Custom Course';
        let totalHoles = parseInt(totalHolesSelect.value);
        if (totalHolesSelect.value === 'custom') {
            totalHoles = parseInt(customHolesInput.value);
            if (isNaN(totalHoles) || totalHoles < 1) return alert('Enter a valid number of holes.');
        }

        const startsInput = document.getElementById('group-starts').value.trim();
        const groupStarts = startsInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (groupStarts.length === 0) return alert('Enter group starting holes.');

        const ctpInput = document.getElementById('ctp-holes').value.trim();
        const ctpHoles = ctpInput.split(',').map(h => parseInt(h.trim())).filter(n => !isNaN(n));
        if (ctpHoles.length === 0) return alert('Enter CTP holes.');

        // Calculate assignments
        const { bringOut, pickUp } = calculateFlagAssignments(groupStarts, ctpHoles, totalHoles);

        let html = '';
        for (let g = 1; g <= groupStarts.length; g++) {
            const takeOut = (bringOut[g] || []).sort((a, b) => a - b).join(', ') || 'None';
            const pick = (pickUp[g] || []).sort((a, b) => a - b).join(', ') || 'None';
            html += `
                <h4>Group ${g} (starts on hole ${groupStarts[g-1]})</h4>
                <p>Take out CTP flags: ${takeOut}</p>
                <p>Pick Up: ${pick}</p>
            `;
        }
        ctpFlagsDiv.innerHTML = html;

        courseDisplay.textContent = courseName;

        outputSection.style.display = 'block';
    });

    function calculateFlagAssignments(groupStarts, ctpHoles, totalHoles) {
        const bringOut = {};
        const pickUp = {};
        for (let i = 1; i <= groupStarts.length; i++) {
            bringOut[i] = [];
            pickUp[i] = [];
        }

        ctpHoles.forEach(ctp => {
            let minDist = Infinity;
            let maxDist = -Infinity;
            let firstG = -1;
            let lastG = -1;
            groupStarts.forEach((start, idx) => {
                let dist = (ctp - start + totalHoles) % totalHoles;
                if (dist < minDist) {
                    minDist = dist;
                    firstG = idx + 1;
                }
                if (dist > maxDist) {
                    maxDist = dist;
                    lastG = idx + 1;
                }
            });
            if (firstG !== -1) bringOut[firstG].push(ctp);
            if (lastG !== -1) pickUp[lastG].push(ctp);
        });

        return { bringOut, pickUp };
    }
});
