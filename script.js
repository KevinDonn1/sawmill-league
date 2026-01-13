        // Build clean list results instead of table
        let html = '';
        scores.forEach((s, rank) => {
            const p = players[s.idx];
            const newTag = rank < availableTags.length ? availableTags[rank] : null;
            const change = p.tag != null && newTag != null ? newTag - p.tag : 0;
            const changeText = change !== 0 ? (change < 0 ? 'Gained ' : 'Lost ') + Math.abs(change) : '—';
            const changeClass = change < 0 ? 'gained' : (change > 0 ? 'lost' : '');

            html += `
                <h4>Rank ${rank + 1}: ${p.name}</h4>
                <p>Raw Score: <strong>${s.score}</strong></p>
                <p>Old Tag: ${p.tag || '—'} → <strong>New Tag: ${newTag || '—'}</strong></p>
                <p class="${changeClass}">Change: ${changeText}</p>
                <hr style="border-color:#eee;">
            `;
            p.tag = newTag;
        });
        document.getElementById('bagtag-results').innerHTML = html;
