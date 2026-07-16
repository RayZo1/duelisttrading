import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// State
let itemsData = [];
let activeTab = 'values';
let activeCategory = 'All';
let searchQuery = '';

let yourOffer = [];
let theirOffer = [];
let currentTargetSide = null; // 'your' or 'their'

// Elements
const tabValues = document.getElementById('tab-values');
const tabCalc = document.getElementById('tab-calculator');
const viewValues = document.getElementById('view-values');
const viewCalc = document.getElementById('view-calculator');
const categoryContainer = document.getElementById('category-container');
const itemsGrid = document.getElementById('items-grid');
const searchInput = document.getElementById('search-input');

// Calc Elements
const yourTotalEl = document.getElementById('your-total');
const theirTotalEl = document.getElementById('their-total');
const yourItemsEl = document.getElementById('your-items');
const theirItemsEl = document.getElementById('their-items');
const diffYouEl = document.getElementById('diff-you');
const diffThemEl = document.getElementById('diff-them');
const diffTextEl = document.getElementById('diff-text');
const diffFillEl = document.getElementById('diff-fill');

// Modal Elements
const modal = document.getElementById('item-modal');
const modalSearch = document.getElementById('modal-search');
const modalBody = document.getElementById('modal-body');

// Formatting
const formatMoney = (amount) => {
    if (!amount) return '$0';
    return '$' + amount.toLocaleString();
};

// Initialize
async function init() {
    setupTabs();
    setupSearch();
    
    // Close modal on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    modalSearch.addEventListener('input', (e) => {
        renderModalItems(e.target.value);
    });

    // Make global for inline onclick
    window.openModal = openModal;

    itemsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">Loading items from Firebase... Make sure you updated firebase-config.js with your Web API credentials!</div>';

    try {
        const querySnapshot = await getDocs(collection(db, "items"));
        itemsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        if(itemsData.length === 0) {
             itemsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">Connected to Firebase! But there are no items in the "items" collection.</div>';
        } else {
             setupCategories();
             renderGrid();
        }
    } catch (e) {
        console.error("Error fetching items: ", e);
        itemsGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--loss-color);">Could not connect to Firebase.<br><br><small>${e.message}</small><br><br>Make sure you added your config to <code>firebase-config.js</code></div>`;
    }

    updateCalculator();
}

// Tabs
function setupTabs() {
    tabValues.addEventListener('click', () => {
        tabValues.classList.add('active');
        tabCalc.classList.remove('active');
        viewValues.classList.remove('hidden');
        viewCalc.classList.add('hidden');
    });

    tabCalc.addEventListener('click', () => {
        tabCalc.classList.add('active');
        tabValues.classList.remove('active');
        viewCalc.classList.remove('hidden');
        viewValues.classList.add('hidden');
    });
}

// Categories
function setupCategories() {
    const categories = ['All', ...new Set(itemsData.map(item => item.category).filter(Boolean))];
    categoryContainer.innerHTML = '';
    
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `category-chip ${cat === activeCategory ? 'active' : ''}`;
        btn.textContent = cat;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = cat;
            renderGrid();
        });
        categoryContainer.appendChild(btn);
    });
}

// Search
function setupSearch() {
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderGrid();
    });
}

// Grid
function renderGrid() {
    let filtered = itemsData;
    
    if (activeCategory !== 'All') {
        filtered = filtered.filter(item => item.category === activeCategory);
    }
    
    if (searchQuery) {
        filtered = filtered.filter(item => item.name && item.name.toLowerCase().includes(searchQuery));
    }
    
    itemsGrid.innerHTML = '';
    
    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="card-header">
                <span>${item.category || 'Uncategorized'}</span>
            </div>
            <div class="card-title">${item.name || 'Unnamed Item'}</div>
            <img src="${item.image || 'https://placehold.co/150x100/111/444?text=No+Image'}" alt="${item.name}" class="card-image">
            <div class="card-stats">
                <div style="display:flex; flex-direction:column; gap:0.2rem;">
                    <span class="stat-label">Value</span>
                    <span class="stat-value money">${formatMoney(item.value)}</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:0.2rem; align-items:flex-end;">
                    <span class="stat-label">Duped</span>
                    <span class="stat-value money">${formatMoney(item.dupedValue || item.value)}</span>
                </div>
            </div>
            <div class="card-stats" style="margin-bottom:0">
                <div style="display:flex; flex-direction:column; gap:0.2rem;">
                    <span class="stat-label">Demand</span>
                    <span class="stat-value" style="color:var(--text-primary)">${item.demand || 'N/A'}</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:0.2rem; align-items:flex-end;">
                    <span class="stat-label">Rarity</span>
                    <span class="stat-value" style="color:var(--text-secondary)">${item.rarity || 'N/A'}</span>
                </div>
            </div>
        `;
        itemsGrid.appendChild(card);
    });
}

// Calculator logic
function openModal(side) {
    currentTargetSide = side;
    modalSearch.value = '';
    renderModalItems('');
    modal.style.display = 'flex';
}

function closeModal() {
    modal.style.display = 'none';
    currentTargetSide = null;
}

function renderModalItems(query) {
    let filtered = itemsData;
    if (query) {
        const q = query.toLowerCase();
        filtered = filtered.filter(item => item.name && item.name.toLowerCase().includes(q));
    }
    
    modalBody.innerHTML = '';
    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'modal-item';
        div.innerHTML = `
            <div style="display:flex; align-items:center;">
                <img src="${item.image || 'https://placehold.co/150x100/111/444?text=No+Image'}" alt="${item.name}">
                <span style="color:white; font-weight:600;">${item.name || 'Unnamed Item'}</span>
            </div>
            <span class="format-money">${formatMoney(item.value)}</span>
        `;
        div.addEventListener('click', () => {
            addItemToCalc(item);
            closeModal();
        });
        modalBody.appendChild(div);
    });
}

function addItemToCalc(item) {
    if (currentTargetSide === 'your') {
        yourOffer.push({...item, calcId: Date.now() + Math.random()});
    } else if (currentTargetSide === 'their') {
        theirOffer.push({...item, calcId: Date.now() + Math.random()});
    }
    updateCalculator();
}

function removeItemFromCalc(side, calcId) {
    if (side === 'your') {
        yourOffer = yourOffer.filter(i => i.calcId !== calcId);
    } else {
        theirOffer = theirOffer.filter(i => i.calcId !== calcId);
    }
    updateCalculator();
}

function renderCalcItem(item, side) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.style.width = '180px';
    card.style.position = 'relative';
    
    // Delete button
    const delBtn = document.createElement('button');
    delBtn.innerHTML = '×';
    delBtn.style.position = 'absolute';
    delBtn.style.top = '5px';
    delBtn.style.right = '5px';
    delBtn.style.background = 'rgba(0,0,0,0.5)';
    delBtn.style.color = 'white';
    delBtn.style.border = 'none';
    delBtn.style.borderRadius = '50%';
    delBtn.style.width = '24px';
    delBtn.style.height = '24px';
    delBtn.style.cursor = 'pointer';
    delBtn.addEventListener('click', () => removeItemFromCalc(side, item.calcId));
    
    card.innerHTML = `
        <div class="card-title" style="font-size:1rem; margin-bottom:0.5rem; text-align:center;">${item.name}</div>
        <img src="${item.image || 'https://placehold.co/150x100/111/444?text=No+Image'}" alt="${item.name}" class="card-image" style="height:80px; margin-bottom:0.5rem;">
        <div class="card-stats" style="margin-bottom:0; justify-content:center;">
            <span class="stat-value money" style="font-size:1rem;">${formatMoney(item.value)}</span>
        </div>
    `;
    card.appendChild(delBtn);
    return card;
}

function updateCalculator() {
    // Totals
    const yourTotal = yourOffer.reduce((acc, item) => acc + (item.value || 0), 0);
    const theirTotal = theirOffer.reduce((acc, item) => acc + (item.value || 0), 0);
    
    yourTotalEl.textContent = formatMoney(yourTotal);
    theirTotalEl.textContent = formatMoney(theirTotal);
    diffYouEl.textContent = formatMoney(yourTotal);
    diffThemEl.textContent = formatMoney(theirTotal);
    
    // Render items
    yourItemsEl.innerHTML = '';
    yourOffer.forEach(item => yourItemsEl.appendChild(renderCalcItem(item, 'your')));
    const addYourBtn = document.createElement('button');
    addYourBtn.className = 'add-item-btn';
    addYourBtn.innerHTML = '+';
    addYourBtn.onclick = () => openModal('your');
    yourItemsEl.appendChild(addYourBtn);
    
    theirItemsEl.innerHTML = '';
    theirOffer.forEach(item => theirItemsEl.appendChild(renderCalcItem(item, 'their')));
    const addTheirBtn = document.createElement('button');
    addTheirBtn.className = 'add-item-btn';
    addTheirBtn.innerHTML = '+';
    addTheirBtn.onclick = () => openModal('their');
    theirItemsEl.appendChild(addTheirBtn);
    
    // Math
    const diff = theirTotal - yourTotal; // Positive means you gain
    if (yourTotal === 0 && theirTotal === 0) {
        diffTextEl.textContent = '$0';
        diffTextEl.className = 'diff-text';
        diffFillEl.style.width = '50%';
        diffFillEl.style.backgroundColor = 'var(--primary-color)';
    } else {
        const totalValue = yourTotal + theirTotal;
        const fillPercentage = (yourTotal / totalValue) * 100;
        diffFillEl.style.width = fillPercentage + '%';
        
        if (diff > 0) {
            diffTextEl.textContent = '+' + formatMoney(diff);
            diffTextEl.className = 'diff-text diff-win';
            diffFillEl.style.backgroundColor = 'var(--loss-color)'; 
        } else if (diff < 0) {
            diffTextEl.textContent = formatMoney(diff);
            diffTextEl.className = 'diff-text diff-loss';
            diffFillEl.style.backgroundColor = 'var(--primary-color)'; 
        } else {
            diffTextEl.textContent = 'Fair';
            diffTextEl.className = 'diff-text';
            diffFillEl.style.backgroundColor = 'var(--primary-color)';
        }
    }
}

// Start
init();
