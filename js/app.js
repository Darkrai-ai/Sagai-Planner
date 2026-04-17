const dict = {
    en: {
        title: "Raj & Brinda Sagai",
        tabGuests: "Guest List",
        tabExpenses: "Expenses",
        invitesTotal: "Invites / Total",
        addBtn: "Add",
        addGuestBtn: "Add Guest",
        totalExpenses: "Total Spent",
        expenseName: "Expense name...",
        amount: "Amount (₹)",
        addExpenseBtn: "Add Expense",
        editGuest: "Edit Guest",
        guestModalTitle: "Guest Details",
        guestNameLabel: "Name",
        headCountLabel: "Head Count",
        phoneLabel: "Phone Number",
        cancel: "Cancel",
        saveBtn: "Save",
        manageCategories: "Manage Categories",
        newCatName: "New category...",
        doneBtn: "Done",
        emptyGuests: "No guests added yet. Add someone above!",
        emptyExpenses: "No expenses in this category."
    },
    gu: {
        title: "રાજ અને વૃંદા સગાઈ",
        tabGuests: "મહેમાન યાદી",
        tabExpenses: "ખર્ચ",
        invitesTotal: "કાર્ડ / કુલ",
        addBtn: "ઉમેરો",
        addGuestBtn: "મહેમાન ઉમેરો",
        totalExpenses: "કુલ ખર્ચ",
        expenseName: "ખર્ચની વિગત...",
        amount: "રકમ (₹)",
        addExpenseBtn: "ખર્ચ ઉમેરો",
        editGuest: "માહિતી બદલો",
        guestModalTitle: "મહેમાન વિગતો",
        guestNameLabel: "નામ",
        headCountLabel: "વ્યક્તિઓની સંખ્યા",
        phoneLabel: "ફોન નંબર",
        cancel: "રદ કરો",
        saveBtn: "સાચવો",
        manageCategories: "વર્ગો મેનેજ કરો",
        newCatName: "નવો વર્ગ...",
        doneBtn: "પૂર્ણ",
        emptyGuests: "કોઈ મહેમાનો નથી. ઉપરથી ઉમેરો!",
        emptyExpenses: "કોઈ ખર્ચ નથી."
    }
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDsFOW5llxg2S1Z9xj2UCaPPrW-ER9W5l0",
  authDomain: "sagai-planner.firebaseapp.com",
  projectId: "sagai-planner",
  storageBucket: "sagai-planner.firebasestorage.app",
  messagingSenderId: "49081190324",
  appId: "1:49081190324:web:1bbf0e3b75f4461c7514e1",
  measurementId: "G-QWZ49YEYCW"
};

let app, db, analytics;
try {
    app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    db = getFirestore(app);
} catch (e) {
    console.warn("Firebase initialization failed (check config). Falling back to local storage.", e);
}

const PLANNER_DOC_ID = "document-raj-brinda";

// Global State
let state = {
    lang: 'en',
    theme: 'light',
    guests: [],
    expenses: [],
    categories: ['Decorations', 'Catering', 'Location', 'Clothing', 'Miscellaneous']
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadLocalSettings();
    initTheme();
    initTabs();
    initLanguage();
    initModals();
    initGuests();
    initExpenses();
    renderAll(); // Initial optimistic render
    loadSharedData(); // Followed by Firestore sync
});

function loadLocalSettings() {
    const savedLocal = localStorage.getItem('sagaiLocalSettings');
    if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        if (parsed.theme) state.theme = parsed.theme;
        if (parsed.lang) state.lang = parsed.lang;
    } else {
        // Fallback map migrating legacy settings
        const oldSaved = localStorage.getItem('sagaiState');
        if (oldSaved) {
            const parsed = JSON.parse(oldSaved);
            if (parsed.theme) state.theme = parsed.theme;
            if (parsed.lang) state.lang = parsed.lang;
        }
    }
}

function saveLocalSettings() {
    localStorage.setItem('sagaiLocalSettings', JSON.stringify({
        theme: state.theme,
        lang: state.lang
    }));
}

function loadSharedData() {
    loadLegacyFallback(); // Immediately load local data first

    if (db) {
        try {
            const docRef = doc(db, "planners", PLANNER_DOC_ID);
            onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    let updated = false;
                    if(data.guests) { state.guests = data.guests; updated = true; }
                    if(data.expenses) { state.expenses = data.expenses; updated = true; }
                    if(data.categories) { state.categories = data.categories; updated = true; }
                    if(updated) {
                        localStorage.setItem('sagaiState', JSON.stringify(state));
                        renderAll();
                    }
                } else {
                    // Seed server with local data if document doesn't exist locally
                    saveSharedData();
                }
            }, (error) => {
                console.error("Firestore sync error (likely permission denied). Relying on local storage.", error);
            });
        } catch(e) {
            console.error("Firestore listener error:", e);
        }
    }
}

function loadLegacyFallback() {
    const saved = localStorage.getItem('sagaiState');
    if (saved) {
        const parsed = JSON.parse(saved);
        if(parsed.guests) state.guests = parsed.guests;
        if(parsed.expenses) state.expenses = parsed.expenses;
        if(parsed.categories) state.categories = parsed.categories;
        renderAll();
    }
}

let fsErrorAlerted = false;

function saveSharedData() {
    if (db) {
        try {
            const docRef = doc(db, "planners", PLANNER_DOC_ID);
            setDoc(docRef, {
                guests: state.guests,
                expenses: state.expenses,
                categories: state.categories
            }, { merge: true }).catch(err => {
                console.error("Error saving to Firestore:", err);
                if (!fsErrorAlerted) {
                    alert("⚠️ Real-time Sync blocked by Firebase Rules!\n\nYour data is saved safely on this device, but won't sync to others until you open your Firebase Console and change the Firestore Rules to allow read and write.");
                    fsErrorAlerted = true;
                }
            });
        } catch (e) {
            console.error("Firebase save failed:", e);
        }
    }
    localStorage.setItem('sagaiState', JSON.stringify(state)); // Legacy fallback
}

function saveState() {
    saveSharedData();
    renderAll();
}

function renderAll() {
    renderGuests();
    renderExpenses();
    updateTranslations();
}

// --- THEME TOGGLE ---
function initTheme() {
    const btn = document.getElementById('theme-toggle');
    if (state.theme === 'dark') document.body.classList.add('dark-theme');
    
    btn.addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        document.body.classList.toggle('dark-theme', state.theme === 'dark');
        saveLocalSettings();
    });
}

// --- LANGUAGE TOGGLE ---
function initLanguage() {
    const toggle = document.getElementById('lang-toggle');
    toggle.checked = state.lang === 'gu';
    updateLangLabels();
    
    toggle.addEventListener('change', (e) => {
        state.lang = e.target.checked ? 'gu' : 'en';
        updateLangLabels();
        saveLocalSettings();
        renderAll();
    });
}

function updateLangLabels() {
    document.getElementById('lang-en').classList.toggle('active', state.lang === 'en');
    document.getElementById('lang-gu').classList.toggle('active', state.lang === 'gu');
}

function updateTranslations() {
    const langDict = dict[state.lang];
    
    // Update texts
    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.getAttribute('data-lang-key');
        if (langDict[key]) {
            el.textContent = langDict[key];
        }
    });

    // Update placeholders
    document.querySelectorAll('[data-lang-ph]').forEach(el => {
        const key = el.getAttribute('data-lang-ph');
        if (langDict[key]) {
            el.placeholder = langDict[key];
        }
    });
}

// --- TABS ---
function initTabs() {
    const buttons = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    const indicator = document.querySelector('.tab-indicator');

    buttons.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            // Update active btn
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Move indicator (50% width per tab)
            indicator.style.transform = `translateX(${index * 100}%)`;

            // Update active content
            const tabId = btn.getAttribute('data-tab');
            contents.forEach(c => {
                c.classList.remove('active');
                if (c.id === `sec-${tabId}`) {
                    c.classList.add('active');
                }
            });
        });
    });
}

// --- MODALS ---
function initModals() {
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal-backdrop').classList.remove('show');
        });
    });
}

function showModal(id) {
    document.getElementById(id).classList.add('show');
}

function hideModal(id) {
    document.getElementById(id).classList.remove('show');
}

// --- GUESTS ---
function initGuests() {
    const btnOpenAdd = document.getElementById('btn-open-add-guest');
    const saveBtn = document.getElementById('btn-save-guest');

    btnOpenAdd.addEventListener('click', () => {
        // Clear modal for new guest
        document.getElementById('edit-g-id').value = '';
        document.getElementById('edit-g-name').value = '';
        document.getElementById('edit-g-headcount').value = 1;
        document.getElementById('edit-g-phone').value = '';
        showModal('modal-edit-guest');
    });

    saveBtn.addEventListener('click', () => {
        const id = document.getElementById('edit-g-id').value;
        const nameVal = document.getElementById('edit-g-name').value.trim();
        const headCountVal = parseInt(document.getElementById('edit-g-headcount').value) || 1;
        const phoneVal = document.getElementById('edit-g-phone').value.trim();

        if (!nameVal) {
            alert('Name is mandatory!');
            return;
        }

        if (id) {
            // Edit existing
            const guest = state.guests.find(g => g.id === id);
            if (guest) {
                guest.name = nameVal;
                guest.headcount = headCountVal;
                guest.phone = phoneVal;
            }
        } else {
            // Add new
            state.guests.unshift({
                id: Date.now().toString(),
                name: nameVal,
                called: false,
                headcount: headCountVal,
                phone: phoneVal
            });
        }
        
        saveState();
        hideModal('modal-edit-guest');
    });
}

// Global functions for guests embedded in HTML
window.toggleGuest = function(id) {
    const guest = state.guests.find(g => g.id === id);
    if (guest) {
        guest.called = !guest.called;
        saveState();
    }
}

window.deleteGuest = function(id) {
    if(confirm('Are you sure you want to delete this guest?')) {
        state.guests = state.guests.filter(g => g.id !== id);
        saveState();
    }
}

window.openEditGuest = function(id) {
    const guest = state.guests.find(g => g.id === id);
    if (guest) {
        document.getElementById('edit-g-id').value = guest.id;
        document.getElementById('edit-g-name').value = guest.name;
        document.getElementById('edit-g-headcount').value = guest.headcount;
        document.getElementById('edit-g-phone').value = guest.phone;
        showModal('modal-edit-guest');
    }
}

function renderGuests() {
    const container = document.getElementById('guest-list');
    
    // Total calculation
    const totalCount = state.guests.reduce((sum, g) => sum + g.headcount, 0);
    const totalInvites = state.guests.length;
    document.getElementById('total-guests-count').textContent = `${totalInvites} / ${totalCount}`;

    if (state.guests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="material-symbols-rounded">group_off</div>
                <p data-lang-key="emptyGuests">${dict[state.lang].emptyGuests}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = state.guests.map(g => `
        <div class="list-item">
            <div class="checkbox-container">
                <div class="custom-checkbox ${g.called ? 'checked' : ''}" onclick="toggleGuest('${g.id}')">
                    <span class="material-symbols-rounded">${g.called ? 'check' : ''}</span>
                </div>
            </div>
            <div class="item-details" onclick="openEditGuest('${g.id}')" style="cursor: pointer;">
                <div class="item-name">${g.name}</div>
                <div class="item-meta">
                    <span title="Head count"><span class="material-symbols-rounded">person</span> ${g.headcount}</span>
                    ${g.phone ? `<span title="Phone"><span class="material-symbols-rounded">phone</span> ${g.phone}</span>` : ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="btn-icon" onclick="openEditGuest('${g.id}')"><span class="material-symbols-rounded">edit</span></button>
                <button class="btn-icon danger-text" onclick="deleteGuest('${g.id}')"><span class="material-symbols-rounded">delete</span></button>
            </div>
        </div>
    `).join('');
}


// --- EXPENSES ---
function initExpenses() {
    document.getElementById('btn-add-expense').addEventListener('click', () => {
        const nameInput = document.getElementById('new-exp-name');
        const amountInput = document.getElementById('new-exp-amount');
        const catSelect = document.getElementById('new-exp-category');
        
        const name = nameInput.value.trim();
        const amount = parseFloat(amountInput.value);
        
        if (name && !isNaN(amount)) {
            state.expenses.push({
                id: Date.now().toString(),
                name: name,
                amount: amount,
                category: catSelect.value || state.categories[0]
            });
            nameInput.value = '';
            amountInput.value = '';
            saveState();
        }
    });

    document.getElementById('btn-manage-cat').addEventListener('click', () => {
        renderCatEditList();
        showModal('modal-manage-cat');
    });

    document.getElementById('btn-add-cat').addEventListener('click', () => {
        const input = document.getElementById('new-category-input');
        const val = input.value.trim();
        if (val && !state.categories.includes(val)) {
            state.categories.push(val);
            input.value = '';
            saveState();
            renderCatEditList();
        }
    });
}

window.deleteExpense = function(id) {
    if(confirm('Delete this expense?')) {
        state.expenses = state.expenses.filter(e => e.id !== id);
        saveState();
    }
}

window.deleteCategory = function(cat) {
    if(confirm(`Delete category '${cat}'? (Expenses will not be deleted but may be uncategorized)`)) {
        state.categories = state.categories.filter(c => c !== cat);
        saveState();
        renderCatEditList();
    }
}

function renderCatEditList() {
    const list = document.getElementById('cat-edit-list');
    list.innerHTML = state.categories.map(c => `
        <li class="cat-edit-item">
            <span>${c}</span>
            <button class="btn-icon danger-text" onclick="deleteCategory('${c}')"><span class="material-symbols-rounded">delete</span></button>
        </li>
    `).join('');
}

function renderExpenses() {
    // Populate select
    const select = document.getElementById('new-exp-category');
    // Save current selection to restore if possible
    const currentVal = select.value;
    select.innerHTML = state.categories.map(c => `<option value="${c}">${c}</option>`).join('');
    if(state.categories.includes(currentVal)) {
        select.value = currentVal;
    }

    // Calc total
    const total = state.expenses.reduce((sum, e) => sum + e.amount, 0);
    document.getElementById('total-expenses-amount').innerHTML = `&#8377;${total.toLocaleString('en-IN')}`;

    // Group expenses
    const listContainer = document.getElementById('expense-categories-list');
    
    if (state.expenses.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <div class="material-symbols-rounded">receipt_long</div>
                <p data-lang-key="emptyExpenses">${dict[state.lang].emptyExpenses}</p>
            </div>
        `;
        return;
    }

    let html = '';

    // Create groups for valid categories + handle unknown categories gracefully
    const catSet = new Set(state.categories);
    state.expenses.forEach(e => {
        if(!catSet.has(e.category)) catSet.add(e.category);
    });

    catSet.forEach(cat => {
        const groupExps = state.expenses.filter(e => e.category === cat);
        if (groupExps.length === 0) return; // Completely hide empty categories

        const groupTotal = groupExps.reduce((sum, e) => sum + e.amount, 0);
        
        let expsHtml = groupExps.map(e => `
            <div class="list-item">
                <div class="item-details">
                    <div class="item-name">${e.name}</div>
                </div>
                <div class="expense-amount">&#8377;${e.amount.toLocaleString('en-IN')}</div>
                <div class="item-actions">
                    <button class="btn-icon danger-text" onclick="deleteExpense('${e.id}')"><span class="material-symbols-rounded">delete</span></button>
                </div>
            </div>
        `).join('');

        html += `
            <div class="category-group">
                <div class="category-header">
                    <h3 class="category-title">${cat}</h3>
                    <div class="category-total">&#8377;${groupTotal.toLocaleString('en-IN')}</div>
                </div>
                <div class="list-container">
                    ${expsHtml}
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;
}
