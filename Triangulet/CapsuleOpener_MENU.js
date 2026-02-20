(async function TrianguletOpener() {
    // === CONFIG ===
    const OPEN_DELAY = 230;
    const API_PACKS = '/data/trians';
    const API_OPEN = '/api/open';
    const AUTH = typeof triangulet !== 'undefined' ? triangulet.tokenraw : null;

    if (!AUTH) {
        console.error('triangulet.tokenraw not found. Aborting.');
        alert('triangulet.tokenraw not found. Make sure you run this where triangulet is defined.');
        return;
    }

    // === STATE ===
    const rarities = ['Uncommon', 'Rare', 'Epic', 'Legendary', 'Chroma', 'Mystical'];
    const unlocks = rarities.reduce((acc, r) => (acc[r] = {}, acc), {});
    let unique = 'NONE';
    let opened = 0;
    let running = false;
    let inFlight = false;
    let selectedPack = null;
    let minimized = false;

    // === CREATE UI ===
    const box = document.createElement('div');
    Object.assign(box.style, {
        position: 'fixed', top: '10px', right: '10px', width: '260px', padding: '10px',
        background: '#1e1e1e', color: '#eee', border: '2px solid #444', borderRadius: '12px',
        zIndex: '2147483647', display: 'flex', flexDirection: 'column',
        boxShadow: '0 6px 18px rgba(0,0,0,0.8)', fontFamily: 'Nunito,sans-serif',
        transition: 'width 0.2s, height 0.2s', resize: 'both', overflow: 'auto',
        maxWidth: '400px', maxHeight: '600px'
    });
    document.body.appendChild(box);

    // Header container
    const headerContainer = document.createElement('div');
    headerContainer.style.display = 'flex';
    headerContainer.style.justifyContent = 'space-between';
    headerContainer.style.alignItems = 'center';
    box.appendChild(headerContainer);

    const header = document.createElement('h4');
    header.textContent = 'Capsule Opener by Bmincs';
    header.style.margin = '0';
    header.style.flex = '1';
    header.style.fontSize = '14px';
    header.style.userSelect = 'none';
    headerContainer.appendChild(header);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.gap = '4px';
    headerContainer.appendChild(buttonsContainer);

    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = '–';
    Object.assign(minimizeBtn.style, {
        cursor: 'pointer', fontWeight: 'bold', fontSize: '16px',
        border: 'none', background: 'transparent', color: '#eee'
    });
    buttonsContainer.appendChild(minimizeBtn);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    Object.assign(closeBtn.style, {
        cursor: 'pointer', fontWeight: 'bold', fontSize: '16px',
        border: 'none', background: 'transparent', color: '#f33'
    });
    buttonsContainer.appendChild(closeBtn);

    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '6px';
    box.appendChild(content);

    // Pack select
    const packSelect = document.createElement('select');
    Object.assign(packSelect.style, {
        width: '100%', padding: '6px', marginBottom: '6px', background: '#333', color: '#eee', border: '1px solid #555', borderRadius: '6px'
    });
    packSelect.disabled = true;
    content.appendChild(packSelect);

    // Buttons
    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = '6px';
    content.appendChild(controls);

    const startBtn = document.createElement('button');
    startBtn.textContent = 'Start';
    Object.assign(startBtn.style, {
        flex: '1', padding: '6px', background: '#039162', color: 'white', border: 'none',
        borderRadius: '6px', cursor: 'pointer', boxShadow: '0 4px 0 #01744e'
    });
    startBtn.disabled = true;
    controls.appendChild(startBtn);

    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop';
    Object.assign(stopBtn.style, {
        flex: '1', padding: '6px', background: '#b30000', color: 'white', border: 'none',
        borderRadius: '6px', cursor: 'pointer', boxShadow: '0 4px 0 #760000'
    });
    stopBtn.disabled = true;
    controls.appendChild(stopBtn);

    // Info text
    const recent = document.createElement('p');
    recent.textContent = `RECENT UNIQUE: ${unique}`;
    recent.style.margin = '4px 0';
    content.appendChild(recent);

    const openedEl = document.createElement('p');
    openedEl.textContent = `CAPSULES OPENED: ${opened.toLocaleString()}`;
    openedEl.style.margin = '4px 0';
    content.appendChild(openedEl);

    // Logs
    const logs = document.createElement('div');
    Object.assign(logs.style, {
        maxHeight: '140px', overflow: 'auto', background: '#222', padding: '6px',
        borderRadius: '6px', fontSize: '12px', color: '#eee'
    });
    logs.textContent = 'No actions yet.';
    content.appendChild(logs);

    const counts = document.createElement('div');
    counts.style.marginTop = '6px';
    content.appendChild(counts);

    // BUTTONS
    minimizeBtn.addEventListener('click', () => {
        minimized = !minimized;
        content.style.display = minimized ? 'none' : 'flex';
        box.style.width = minimized ? '140px' : '260px';
    });

    closeBtn.addEventListener('click', () => {
        box.remove();
    });

    function addLogLine(text, type = 'info') {
        const el = document.createElement('div');
        el.textContent = text;
        if (type === 'error') el.style.color = '#f55';
        logs.appendChild(el);
        logs.scrollTop = logs.scrollHeight;
    }

    // FETCH PACKS
    try {
        const res = await fetch(API_PACKS, { headers: { Accept: 'application/json', authorization: AUTH, 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error(`Failed to fetch packs: ${res.status}`);
        const data = await res.json();
        packSelect.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select a capsule...';
        packSelect.appendChild(placeholder);

        data.ValuesnCapsules.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name;
            packSelect.appendChild(opt);
        });

        packSelect.disabled = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        addLogLine('Packs loaded.');
    } catch (err) {
        packSelect.innerHTML = '<option value="">Failed to load packs</option>';
        addLogLine('Error loading packs: ' + err.message, 'error');
        console.error(err);
        return;
    }

    packSelect.addEventListener('change', () => {
        selectedPack = packSelect.value || null;
        addLogLine(selectedPack ? `Selected pack: ${selectedPack}` : 'Pack cleared.');
    });

    function renderCounts() {
        counts.innerHTML = '';
        rarities.forEach(r => {
            const title = document.createElement('div');
            title.style.fontWeight = '700';
            title.style.marginTop = '4px';
            title.textContent = r;
            counts.appendChild(title);
            const items = unlocks[r];
            if (!items || Object.keys(items).length === 0) {
                const none = document.createElement('div');
                none.textContent = '—';
                none.style.fontSize = '12px';
                counts.appendChild(none);
            } else {
                Object.keys(items).forEach(k => {
                    const line = document.createElement('div');
                    line.textContent = `${k}: ${items[k].toLocaleString()}x`;
                    line.style.fontSize = '12px';
                    counts.appendChild(line);
                });
            }
        });
    }

    async function doOpen() {
        if (!selectedPack) return addLogLine('No pack selected.', 'error');
        if (inFlight) return;
        inFlight = true;
        try {
            const res = await fetch(API_OPEN, {
                method: 'POST',
                headers: { Accept: 'application/json', authorization: AUTH, 'Content-Type': 'application/json' },
                body: JSON.stringify({ capsule: selectedPack })
            });
            if (!res.ok) throw new Error('Open failed: ' + res.status);
            const response = await res.json();
            if (response?.rarity && response?.trian) {
                if (response.new) unique = response.trian;
                unlocks[response.rarity][response.trian] = (unlocks[response.rarity][response.trian] || 0) + 1;
                opened++;
                recent.textContent = `RECENT UNIQUE: ${unique}`;
                openedEl.textContent = `CAPSULES OPENED: ${opened.toLocaleString()}`;
                addLogLine(`${response.rarity} ${response.trian} (${unlocks[response.rarity][response.trian]}x)`);
                renderCounts();
            } else {
                addLogLine('Unexpected response', 'error');
                console.log(response);
            }
        } catch (err) {
            addLogLine('Open error: ' + err.message, 'error');
            console.error(err);
        } finally {
            inFlight = false;
        }
    }

    async function openLoop() {
        while (true) {
            if (running) await doOpen();
            await new Promise(r => setTimeout(r, OPEN_DELAY));
        }
    }
    openLoop();

    startBtn.addEventListener('click', () => {
        if (!selectedPack) return addLogLine('Select a capsule first.', 'error');
        running = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        addLogLine('Opener started.');
    });

    stopBtn.addEventListener('click', () => {
        running = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        addLogLine('Opener stopped.');
    });

    // === DRAG BOX ===
    (function drag(el) {
        let isDown = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
        el.style.cursor = 'move';
        header.addEventListener('mousedown', e => {
            if (['INPUT','SELECT','BUTTON'].includes(e.target.tagName)) return;
            isDown = true;
            startX = e.clientX; startY = e.clientY;
            startLeft = el.offsetLeft; startTop = el.offsetTop;
            document.body.style.userSelect = 'none';
        });
        document.addEventListener('mousemove', e => {
            if (!isDown) return;
            el.style.left = startLeft + (e.clientX - startX) + 'px';
            el.style.top = startTop + (e.clientY - startY) + 'px';
            el.style.right = 'auto';
            el.style.bottom = 'auto';
            el.style.position = 'fixed';
        });
        document.addEventListener('mouseup', () => { if (isDown) { isDown=false; document.body.style.userSelect=''; }});
    })(box);

    // Footer
    const footer = document.createElement('div');
    footer.style.marginTop = '6px';
    footer.style.fontSize = '11px';
    footer.innerHTML = `Coded by <a href="https://github.com/bmincsfr/Triangulet" target="_blank" style="color:#6cf">Bmincs</a>`;
    content.appendChild(footer);

    console.log('%cTriangulet opener loaded', 'font-size:16px;color:green');
})();
