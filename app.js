const IMAGE_BASE = 'https://raw.githubusercontent.com/RayZo1/duelisttrading/main/';
const CACHE_BUSTER = Date.now() + '_' + Math.floor(Math.random() * 1000);

// anti-tamper security check
function triggerTamperShield(reason) {
    const shield = document.getElementById('tamper-shield');
    if (shield) {
        shield.querySelector('p').textContent = reason || 'Developer options are disabled on this platform to prevent value tampering and secure trade calculations.';
        shield.classList.add('active');
        const container = document.querySelector('.container');
        if (container) container.style.filter = 'blur(10px)';
        const navbar = document.querySelector('.navbar');
        if (navbar) navbar.style.filter = 'blur(10px)';
    }
}

// block right click
document.addEventListener('contextmenu', e => {
    e.preventDefault();
    return false;
});

// block dev tools keys
document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        triggerTamperShield('F12 Developer Tools are disabled on this platform.');
        return false;
    }
    // Ctrl+Shift+I or Cmd+Option+I
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
        e.preventDefault();
        triggerTamperShield('Element inspector is disabled on this platform.');
        return false;
    }
    // Ctrl+Shift+J or Cmd+Option+J
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
        e.preventDefault();
        triggerTamperShield('Developer console is disabled on this platform.');
        return false;
    }
    // Ctrl+Shift+C or Cmd+Option+C
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
        e.preventDefault();
        triggerTamperShield('Inspector selection tool is disabled.');
        return false;
    }
    // Ctrl+U or Cmd+U
    if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
        e.preventDefault();
        triggerTamperShield('Viewing source code is disabled.');
        return false;
    }
});

// devtools detector
const devtoolsDetector = {
    isOpen: false,
    init() {
        // Getter on elements printed to console
        const element = new Image();
        Object.defineProperty(element, 'id', {
            get: () => {
                this.isOpen = true;
                triggerTamperShield('Developer Console activity detected.');
            }
        });
        
        setInterval(() => {
            this.isOpen = false;
            console.log(element);
            console.clear();
            if (this.isOpen) {
                triggerTamperShield('Developer Console detected.');
            }
        }, 1000);

        // Debugger check (pauses execution if tools are open)
        setInterval(() => {
            const start = performance.now();
            debugger;
            const end = performance.now();
            if (end - start > 100) {
                triggerTamperShield('Tamper protection active.');
            }
        }, 1000);
        
        // Mismatch window layout check
        setInterval(() => {
            const threshold = 160;
            const widthDiff = window.outerWidth - window.innerWidth;
            const heightDiff = window.outerHeight - window.innerHeight;
            // Only trigger if we aren't in standard iframe preview state
            if (window.self === window.top) {
                if (widthDiff > threshold || heightDiff > threshold) {
                    triggerTamperShield('Inspection panel detected.');
                }
            }
        }, 1000);
    }
};
devtoolsDetector.init();

let dbRef = null;

// dom els
const tabHome      = document.getElementById('tab-home');
const logoHome     = document.getElementById('logo-home');
const tabValues    = document.getElementById('tab-values');
const tabCalc      = document.getElementById('tab-calculator');
const viewHome     = document.getElementById('view-home');
const viewValues   = document.getElementById('view-values');
const viewCalc     = document.getElementById('view-calculator');
const catContainer = document.getElementById('category-container');
const itemsGrid    = document.getElementById('items-grid');
const searchInput  = document.getElementById('search-input');

const yourTotalEl  = document.getElementById('your-total');
const theirTotalEl = document.getElementById('their-total');
const diffYouEl    = document.getElementById('diff-you');
const diffThemEl   = document.getElementById('diff-them');
const diffTextEl   = document.getElementById('diff-text');
const diffFillEl   = document.getElementById('diff-fill');

const yourList  = document.getElementById('your-items-list');
const theirList = document.getElementById('their-items-list');
const btnAddYour  = document.getElementById('btn-add-your');
const btnAddTheir = document.getElementById('btn-add-their');

const modal      = document.getElementById('item-modal');
const modalSearch = document.getElementById('modal-search');
const modalBody  = document.getElementById('modal-body');

// itemsData
let itemsData      = [];
let activeCategory = 'All';
let searchQuery    = '';
let yourOffer      = [];
let theirOffer     = [];
let currentSide    = null;

const fmt = (n) => (n === null || n === undefined) ? '???' : '$' + Math.round(n).toLocaleString();

// check value
async function getVerifiedValue(itemId) {
    try {
        const snap = await firebase.database().ref(itemId).once('value');
        const data = snap.val();
        if (data) {
            return data.value !== undefined ? data.value : null;
        }
        return null;
    } catch (_) {
        return null;
    }
}

// modal controls
function openModal(side) {
    currentSide = side;
    modalSearch.value = '';
    renderModalItems('');
    modal.classList.add('show');
    setTimeout(() => modalSearch.focus(), 100);
}

function closeModal() {
    modal.classList.remove('show');
    currentSide = null;
}

btnAddYour.addEventListener('click',  () => openModal('your'));
btnAddTheir.addEventListener('click', () => openModal('their'));
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
modalSearch.addEventListener('input', (e) => renderModalItems(e.target.value));

// 3d tilt utility
function applyTiltEffect(card) {
    let rafId = null;
    let targetRX = 0, targetRY = 0;
    let currentRX = 0, currentRY = 0;

    function animateTilt() {
        currentRX += (targetRX - currentRX) * 0.12;
        currentRY += (targetRY - currentRY) * 0.12;

        card.style.transform =
            `perspective(800px) rotateX(${currentRX}deg) rotateY(${currentRY}deg) scale3d(1.03,1.03,1.03)`;

        if (Math.abs(targetRX - currentRX) > 0.01 || Math.abs(targetRY - currentRY) > 0.01) {
            rafId = requestAnimationFrame(animateTilt);
        } else {
            rafId = null;
        }
    }

    card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        targetRX = ((y - r.height / 2) / r.height) * 8;
        targetRY = ((x - r.width  / 2) / r.width)  * -8;
        if (!rafId) rafId = requestAnimationFrame(animateTilt);
    });

    card.addEventListener('mouseleave', () => {
        targetRX = 0;
        targetRY = 0;
        if (!rafId) rafId = requestAnimationFrame(animateTilt);
    });
}

// initialize tilt on home page cards
document.querySelectorAll('.home-card').forEach(applyTiltEffect);

// tab switching
function switchView(target) {
    tabHome.classList.toggle('active', target === 'home');
    tabValues.classList.toggle('active', target === 'values');
    tabCalc.classList.toggle('active', target === 'calc');

    viewHome.classList.toggle('hidden', target !== 'home');
    viewValues.classList.toggle('hidden', target !== 'values');
    viewCalc.classList.toggle('hidden', target !== 'calc');

    if (target === 'values') {
        activeCategory = 'All';
        setupCategories();
        renderGrid();
    }
}

tabHome.addEventListener('click', () => switchView('home'));
logoHome.addEventListener('click', () => switchView('home'));
tabValues.addEventListener('click', () => switchView('values'));
tabCalc.addEventListener('click', () => switchView('calc'));

// home page links
document.getElementById('card-to-values').addEventListener('click', () => switchView('values'));
document.getElementById('card-to-calc').addEventListener('click', () => switchView('calc'));

searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderGrid();
});

// categories list
function setupCategories() {
    const cats = ['All', ...new Set(itemsData.map(i => i.category).filter(Boolean))];
    catContainer.innerHTML = '';
    cats.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-chip' + (cat === activeCategory ? ' active' : '');
        btn.textContent = cat;
        btn.addEventListener('click', () => {
            catContainer.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = cat;
            renderGrid();
        });
        catContainer.appendChild(btn);
    });
}

// main list grid
function renderGrid() {
    let list = itemsData;
    if (activeCategory !== 'All') list = list.filter(i => i.category === activeCategory);
    if (searchQuery) list = list.filter(i => i.name && i.name.toLowerCase().includes(searchQuery));

    itemsGrid.innerHTML = '';

    if (!list.length) {
        itemsGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-secondary);padding:3rem;">No items found.</div>';
        return;
    }

    list.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.style.animationDelay = `${idx * 0.04}s`;
        card.style.animation = `fadeInUp 0.5s ${idx * 0.04}s cubic-bezier(0.22,1,0.36,1) both`;

        card.addEventListener('animationend', () => {
            card.style.animation = 'none';
        });

        card.innerHTML = `
            <div class="card-title" style="margin-top: 0.5rem; margin-bottom: 1rem;">${item.name || 'Unnamed'}</div>
            <img src="${item.image}" alt="${item.name}" class="card-image" onerror="this.onerror=null;this.style.display='none';">
            <div class="card-value-container" style="text-align: left; margin-top: auto;">
                <div class="card-stat-row">
                    <span class="stat-label">Value</span>
                    <span class="stat-val highlight-value">${fmt(item.value)}</span>
                </div>
                <div class="card-stat-row">
                    <span class="stat-label">Type</span>
                    <span class="stat-val">${item.category || 'Item'}</span>
                </div>
                <div class="card-stat-row">
                    <span class="stat-label">Rarity</span>
                    <span class="stat-val">${item.rarity || 'Common'}</span>
                </div>
                <div class="card-stat-row">
                    <span class="stat-label">Demand</span>
                    <span class="stat-val highlight-demand">${item.demand || 'High'}</span>
                </div>
            </div>
        `;
        itemsGrid.appendChild(card);

        // apply 3d tilt effect
        applyTiltEffect(card);
    });
}

// items in modal
function renderModalItems(query) {
    let list = query
        ? itemsData.filter(i => i.name && i.name.toLowerCase().includes(query.toLowerCase()))
        : itemsData;

    modalBody.innerHTML = '';

    if (!list.length) {
        modalBody.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:2rem;">No items found.</div>';
        return;
    }

    list.forEach(item => {
        const div = document.createElement('div');
        div.className = 'modal-item';
        div.innerHTML = `
            <div style="display:flex;align-items:center;gap:1rem;">
                <img src="${item.image}" style="width:44px;height:44px;object-fit:contain;" onerror="this.onerror=null;this.style.display='none';">
                <span style="font-weight:600;">${item.name || 'Unnamed'}</span>
            </div>
            <span style="font-weight:700;">${fmt(item.value)}</span>
        `;
        div.addEventListener('click', () => addItem(item));
        modalBody.appendChild(div);
    });
}

// calculator logic
async function addItem(item) {
    const side = currentSide;
    closeModal();

    // verify live value first
    let verifiedValue = await getVerifiedValue(item.id);
    if (verifiedValue === null) {
        // Fallback to loaded item value (or null if missing)
        verifiedValue = item.value;
    }

    // save immutable entry
    const entry = Object.freeze({
        id:       item.id,
        name:     item.name,
        image:    item.image,
        category: item.category,
        rarity:   item.rarity,
        value:    verifiedValue !== undefined ? verifiedValue : null,   // always the server value
        calcId:   Date.now() + Math.random()
    });

    if (side === 'your') yourOffer.push(entry);
    else theirOffer.push(entry);

    redrawCalc();
}

function removeItem(side, calcId) {
    if (side === 'your') yourOffer = yourOffer.filter(i => i.calcId !== calcId);
    else theirOffer = theirOffer.filter(i => i.calcId !== calcId);
    redrawCalc();
}

function makeCalcCard(item, side) {
    const wrap = document.createElement('div');
    wrap.className = 'calc-item-card';

    wrap.innerHTML = `
        <div class="remove-overlay">
            <svg viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
            <span>Remove</span>
        </div>
        <img src="${item.image}" class="card-img" onerror="this.onerror=null;this.style.display='none';">
        <div class="card-name">${item.name || 'Unnamed'}</div>
        <div class="card-val">${fmt(item.value)}</div>
    `;

    wrap.addEventListener('click', () => {
        removeItem(side, item.calcId);
    });

    return wrap;
}

function redrawCalc() {
    const yt = yourOffer.reduce((s, i) => s + (i.value || 0), 0);
    const tt = theirOffer.reduce((s, i) => s + (i.value || 0), 0);

    yourTotalEl.textContent  = fmt(yt);
    theirTotalEl.textContent = fmt(tt);
    diffYouEl.textContent    = fmt(yt);
    diffThemEl.textContent   = fmt(tt);

    yourList.innerHTML  = '';
    theirList.innerHTML = '';

    yourOffer.forEach(item  => yourList.appendChild(makeCalcCard(item, 'your')));
    theirOffer.forEach(item => theirList.appendChild(makeCalcCard(item, 'their')));

    // calculate totals
    const diff = tt - yt;
    if (yt === 0 && tt === 0) {
        diffTextEl.textContent = 'Add Items';
        diffTextEl.className   = 'diff-result-badge';
        diffFillEl.style.width = '50%';
        diffFillEl.style.background = 'var(--primary-color)';
    } else {
        diffFillEl.style.width = ((yt / (yt + tt)) * 100).toFixed(2) + '%';
        if (diff > 0) {
            diffTextEl.textContent = '+' + Math.round(diff).toLocaleString();
            diffTextEl.className   = 'diff-result-badge win';
            diffFillEl.style.background = 'var(--win-color)';
        } else if (diff < 0) {
            diffTextEl.textContent = '-' + Math.round(Math.abs(diff)).toLocaleString();
            diffTextEl.className   = 'diff-result-badge loss';
            diffFillEl.style.background = 'var(--loss-color)';
        } else {
            diffTextEl.textContent = '0';
            diffTextEl.className   = 'diff-result-badge';
            diffFillEl.style.background = '#F59E0B';
        }
    }
}

// init connection
async function initFirebase() {
    itemsGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-secondary);">Loading items...</div>';

    try {
        firebase.initializeApp({
            apiKey:            "AIzaSyAJZDjZCXr0KRT5Ylfr2uFLXMhzYzUY3QY",
            authDomain:        "duelist-values.firebaseapp.com",
            databaseURL:       "https://duelist-values-default-rtdb.europe-west1.firebasedatabase.app",
            projectId:         "duelist-values",
            storageBucket:     "duelist-values.firebasestorage.app",
            messagingSenderId: "488819610078",
            appId:             "1:488819610078:web:42e6681d9884a3db24cd4f"
        });

        dbRef = firebase.database().ref('/');
        const snap = await dbRef.once('value');
        const data = snap.val();

        if (data) {
            itemsData = [];
            // parse category
            Object.keys(data).forEach(category => {
                const catItems = data[category];
                if (!catItems || typeof catItems !== 'object') return;
                Object.keys(catItems).forEach(itemKey => {
                    const item = catItems[itemKey];
                    itemsData.push(Object.freeze({
                        id:       `${category}/${itemKey}`,   // e.g. "Pistol/Red Beam"
                        category: category,
                        name:     itemKey,
                        rarity:   item.rarity   || 'Common',
                        value:    (item.value !== undefined && item.value !== null && item.value !== "") ? item.value : null,
                        demand:   item.demand || '???',
                        // Pull image from github
                        image:    IMAGE_BASE + (item.image || '') + '?v=' + CACHE_BUSTER,
                    }));
                });
            });
        } else {
            itemsGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;">No items in database yet.</div>';
        }
    } catch (err) {
        console.error('Firebase error:', err);
        itemsGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#EF4444;">Could not connect to database.</div>';
    }

    setupCategories();
    renderGrid();
    redrawCalc();
}

initFirebase();
