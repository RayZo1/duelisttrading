// ═══════════════════════════════════════════════════════
//  DUELIST VALUES — app.js
// ═══════════════════════════════════════════════════════

// Disable right-click on the calculator to prevent easy DOM inspection
document.getElementById('view-calculator').addEventListener('contextmenu', e => e.preventDefault());

// ─── Firebase reference ───────────────────────────────────────────────────────
let dbRef = null;

// ─── DOM Elements ─────────────────────────────────────────────────────────────
const tabValues    = document.getElementById('tab-values');
const tabCalc      = document.getElementById('tab-calculator');
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

// ─── State ────────────────────────────────────────────────────────────────────
// itemsData holds FROZEN objects — values cannot be mutated from the console
let itemsData      = [];
let activeCategory = 'All';
let searchQuery    = '';
let yourOffer      = [];
let theirOffer     = [];
let currentSide    = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => '$' + Math.round(n || 0).toLocaleString();

// ─── Anti-Tamper: value verification ──────────────────────────────────────────
// Before adding any item to the calculator, re-fetch its value live from
// Firebase so a user can't paste fake data into the console.
// itemId is now "Category/Item Name" e.g. "Pistol/Red Beam"
async function getVerifiedValue(itemId) {
    try {
        const snap = await firebase.database().ref(itemId).once('value');
        const data = snap.val();
        return data ? data.value : null;
    } catch (_) {
        return null;
    }
}

// ─── Modal ────────────────────────────────────────────────────────────────────
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

// ─── Tabs ─────────────────────────────────────────────────────────────────────
tabValues.addEventListener('click', () => {
    tabValues.classList.add('active');
    tabCalc.classList.remove('active');
    viewValues.classList.remove('hidden');
    viewCalc.classList.add('hidden');
    activeCategory = 'All';
    setupCategories();
    renderGrid();
});

tabCalc.addEventListener('click', () => {
    tabCalc.classList.add('active');
    tabValues.classList.remove('active');
    viewCalc.classList.remove('hidden');
    viewValues.classList.add('hidden');
});

searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderGrid();
});

// ─── Categories ───────────────────────────────────────────────────────────────
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

// ─── Values Grid ──────────────────────────────────────────────────────────────
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

        card.innerHTML = `
            <div class="card-header">
                <span class="badge">${item.category || 'Item'}</span>
                <span class="badge">${item.rarity || 'Common'}</span>
            </div>
            <img src="${item.image}" alt="${item.name}" class="card-image" onerror="this.onerror=null;this.style.display='none';">
            <div class="card-title">${item.name || 'Unnamed'}</div>
            <div class="card-value-container">
                <span class="value-label">Value</span>
                <span class="value-amount">${fmt(item.value)}</span>
            </div>
        `;
        itemsGrid.appendChild(card);

        // ── GPU-smooth 3D tilt using requestAnimationFrame ──────────────────
        let rafId = null;
        let targetRX = 0, targetRY = 0;
        let currentRX = 0, currentRY = 0;

        function animateTilt() {
            // Lerp toward target for buttery smoothness
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
            targetRX = ((y - r.height / 2) / r.height) * -18;
            targetRY = ((x - r.width  / 2) / r.width)  *  18;
            if (!rafId) rafId = requestAnimationFrame(animateTilt);
        });

        card.addEventListener('mouseleave', () => {
            targetRX = 0;
            targetRY = 0;
            if (!rafId) rafId = requestAnimationFrame(animateTilt);
        });
    });
}

// ─── Modal Items ──────────────────────────────────────────────────────────────
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

// ─── Calculator ───────────────────────────────────────────────────────────────
async function addItem(item) {
    closeModal();

    // ── ANTI-TAMPER: verify value live from Firebase before accepting ────────
    const verifiedValue = await getVerifiedValue(item.id);
    if (verifiedValue === null) {
        // Could not verify — reject silently
        console.warn('Could not verify value for item:', item.name);
        return;
    }

    // Use the Firebase-authoritative value, not whatever is in memory
    const entry = Object.freeze({
        id:       item.id,
        name:     item.name,
        image:    item.image,
        category: item.category,
        rarity:   item.rarity,
        value:    verifiedValue,   // ← always the server value
        calcId:   Date.now() + Math.random()
    });

    if (currentSide === 'your') yourOffer.push(entry);
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
    wrap.style.cssText = `
        position:relative; display:inline-flex; flex-direction:column;
        align-items:center; background:var(--card-bg);
        border:1px solid var(--border-color); border-radius:14px;
        padding:0.8rem; width:116px; gap:0.4rem;
        transition: transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease;
        will-change: transform;
    `;
    wrap.addEventListener('mouseenter', () => {
        wrap.style.transform = 'translateY(-4px)';
        wrap.style.boxShadow = '0 10px 25px rgba(0,0,0,0.4)';
    });
    wrap.addEventListener('mouseleave', () => {
        wrap.style.transform = 'translateY(0)';
        wrap.style.boxShadow = 'none';
    });

    const del = document.createElement('button');
    del.innerHTML = '×';
    del.style.cssText = `
        position:absolute; top:5px; right:5px; width:22px; height:22px;
        border-radius:50%; border:none; background:rgba(239,68,68,0.2);
        color:#EF4444; cursor:pointer; font-size:1rem; line-height:1;
        display:flex; align-items:center; justify-content:center;
        transition: background 0.15s ease;
    `;
    del.addEventListener('mouseenter', () => del.style.background = 'rgba(239,68,68,0.5)');
    del.addEventListener('mouseleave', () => del.style.background = 'rgba(239,68,68,0.2)');
    del.addEventListener('click', (e) => { e.stopPropagation(); removeItem(side, item.calcId); });

    const img = document.createElement('img');
    img.src = item.image;
    img.style.cssText = 'width:62px;height:62px;object-fit:contain;';
    img.onerror = () => { img.onerror = null; img.style.display = 'none'; };

    const name = document.createElement('div');
    name.textContent = item.name;
    name.style.cssText = 'font-size:0.78rem;font-weight:600;text-align:center;color:#FFF;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;';

    const val = document.createElement('div');
    val.textContent = fmt(item.value);
    val.style.cssText = 'font-size:0.82rem;font-weight:700;color:var(--primary-hover);user-select:none;-webkit-user-select:none;';

    wrap.append(del, img, name, val);
    return wrap;
}

function redrawCalc() {
    const yt = yourOffer.reduce((s, i) => s + i.value, 0);
    const tt = theirOffer.reduce((s, i) => s + i.value, 0);

    yourTotalEl.textContent  = fmt(yt);
    theirTotalEl.textContent = fmt(tt);
    diffYouEl.textContent    = fmt(yt);
    diffThemEl.textContent   = fmt(tt);

    yourList.innerHTML  = '';
    theirList.innerHTML = '';

    yourOffer.forEach(item  => yourList.appendChild(makeCalcCard(item, 'your')));
    theirOffer.forEach(item => theirList.appendChild(makeCalcCard(item, 'their')));

    // Diff bar
    const diff = tt - yt;
    if (yt === 0 && tt === 0) {
        diffTextEl.textContent = 'Add Items';
        diffTextEl.className   = 'diff-result-badge';
        diffFillEl.style.width = '50%';
        diffFillEl.style.background = 'var(--primary-color)';
    } else {
        diffFillEl.style.width = ((yt / (yt + tt)) * 100).toFixed(2) + '%';
        if (diff > 0) {
            diffTextEl.textContent = 'WIN  +' + fmt(diff);
            diffTextEl.className   = 'diff-result-badge win';
            diffFillEl.style.background = 'var(--win-color)';
        } else if (diff < 0) {
            diffTextEl.textContent = 'LOSS  -' + fmt(Math.abs(diff));
            diffTextEl.className   = 'diff-result-badge loss';
            diffFillEl.style.background = 'var(--loss-color)';
        } else {
            diffTextEl.textContent = 'FAIR TRADE';
            diffTextEl.className   = 'diff-result-badge';
            diffFillEl.style.background = '#F59E0B';
        }
    }
}

// ─── Firebase ─────────────────────────────────────────────────────────────────
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
            // New format: { "Category": { "Item Name": { image, name, rarity, value } } }
            Object.keys(data).forEach(category => {
                const catItems = data[category];
                if (!catItems || typeof catItems !== 'object') return;
                Object.keys(catItems).forEach(itemKey => {
                    const item = catItems[itemKey];
                    itemsData.push(Object.freeze({
                        id:       `${category}/${itemKey}`,   // e.g. "Pistol/Red Beam"
                        category: category,
                        name:     item.name     || itemKey,
                        rarity:   item.rarity   || 'Common',
                        value:    item.value     || 0,
                        // Auto-prepend assets/ — no need to type it in Firebase
                        image:    'assets/' + (item.image || ''),
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
