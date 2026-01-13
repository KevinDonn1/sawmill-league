document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const outputSection = document.getElementById('output');
    const ctpFlagsDiv = document.getElementById('ctp-flags');

    const totalHoles = 24;

    generateBtn.addEventListener('click', () => {
        const startsInput = document.getElementById('group-starts').value.trim();
        const groupStarts = startsInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        const numGroups = groupStarts.length;

        if (numGroups < 1) return alert('Enter at least one starting hole.');

        const ctpInput = document.getElementById('ctp-holes').value.trim();
        const ctpHoles = ctpInput.split(',').map(h => parseInt(h.trim())).filter(n => !isNaN(n));

        if (ctpHoles.length === 0) return alert('Enter at least some CTP holes.');

        const { bringOut, pickUp } = calculateAssignments(groupStarts, ctpHoles);

        let html = '';
        for (let g = 1; g <= numGroups; g++) {
            const takeOutList = (bringOut[g] || []).sort((a,b)=>a-b).join(', ') || 'None';
            const pickUpList  = (pickUp[g]  || []).sort((a,b)=>a-b).join(', ') || 'None';
            html += `
                <h4>Group ${g} (starts on hole ${groupStarts[g-1]})</h4>
                <p><strong>Take out CTP flags:</strong> ${takeOutList}</p>
                <p><strong>Pick Up:</strong> ${pickUpList}</p>
                <hr>
            `;
        }

        ctpFlagsDiv.innerHTML = html;
        outputSection.style.display = 'block';
    });

    function calculateAssignments(groupStarts, ctpHoles) {
        const bringOut = {};
        const pickUp = {};
        for (let i = 1; i <= groupStarts.length; i++) {
            bringOut[i] = [];
            pickUp[i] = [];
        }

        ctpHoles.forEach(ctp => {
            let minDist = Infinity;
            let maxDist = -Infinity;
            let firstGroup = -1;
            let lastGroup = -1;

            groupStarts.forEach((start, idx) => {
                let dist = (ctp - start + totalHoles) % totalHoles;
                if (dist < minDist) {
                    minDist = dist;
                    firstGroup = idx + 1;
                }
                if (dist > maxDist) {
                    maxDist = dist;
                    lastGroup = idx + 1;
                }
            });

            if (firstGroup !== -1) bringOut[firstGroup].push(ctp);
            if (lastGroup  !== -1) pickUp[lastGroup].push(ctp);
        });

        return { bringOut, pickUp };
    }
});
