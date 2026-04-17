const dict = {
    en: {
        title: "Raj & Brinda Sagai",
        tabGuests: "Guest List",
        invitesTotal: "Confirmed / Total",
        addBtn: "Add",
        addGuestBtn: "Add Guest",
        editGuest: "Edit Guest",
        guestModalTitle: "Guest Details",
        guestNameLabel: "Name",
        headCountLabel: "Head Count",
        phoneLabel: "Phone Number",
        cancel: "Cancel",
        saveBtn: "Save",
        emptyGuests: "No guests added yet. Add someone above!"
    },
    gu: {
        title: "રાજ અને વૃંદા સગાઈ",
        tabGuests: "મહેમાન યાદી",
        invitesTotal: "કન્ફર્મ / કુલ",
        addBtn: "ઉમેરો",
        addGuestBtn: "મહેમાન ઉમેરો",
        editGuest: "માહિતી બદલો",
        guestModalTitle: "મહેમાન વિગતો",
        guestNameLabel: "નામ",
        headCountLabel: "વ્યક્તિઓની સંખ્યા",
        phoneLabel: "ફોન નંબર",
        cancel: "રદ કરો",
        saveBtn: "સાચવો",
        emptyGuests: "કોઈ મહેમાનો નથી. ઉપરથી ઉમેરો!"
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
    guests: []
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadLocalSettings();
    initTheme();
    initLanguage();
    initModals();
    initGuests();
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
        renderAll();
    }
}

let fsErrorAlerted = false;

function saveSharedData() {
    if (db) {
        try {
            const docRef = doc(db, "planners", PLANNER_DOC_ID);
            setDoc(docRef, {
                guests: state.guests
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
        document.getElementById('edit-g-headcount').value = 2;
        document.getElementById('edit-g-phone').value = '';
        showModal('modal-edit-guest');
    });

    saveBtn.addEventListener('click', () => {
        const id = document.getElementById('edit-g-id').value;
        const nameVal = document.getElementById('edit-g-name').value.trim();
        const headCountVal = parseInt(document.getElementById('edit-g-headcount').value) || 2;
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

    const btnFetchContact = document.getElementById('btn-fetch-contact');
    if (btnFetchContact) {
        btnFetchContact.addEventListener('click', async () => {
            try {
                if ('contacts' in navigator && 'ContactsManager' in window) {
                    const props = ['name', 'tel'];
                    const opts = { multiple: false };
                    const contacts = await navigator.contacts.select(props, opts);
                    if (contacts.length > 0) {
                        const contact = contacts[0];
                        if (contact.tel && contact.tel.length > 0) {
                            document.getElementById('edit-g-phone').value = contact.tel[0].replace(/\s+/g, '');
                        }
                        const nameInput = document.getElementById('edit-g-name');
                        if (contact.name && contact.name.length > 0 && !nameInput.value.trim()) {
                            nameInput.value = contact.name[0];
                        }
                    }
                } else {
                    alert('Contact Picker API is not supported on this browser or device.');
                }
            } catch (err) {
                console.error("Error fetching contact:", err);
            }
        });
    }
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
    const confirmedCount = state.guests.filter(g => g.called).reduce((sum, g) => sum + g.headcount, 0);
    document.getElementById('total-guests-count').textContent = `${confirmedCount} / ${totalCount}`;

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
                ${g.phone ? `<a href="tel:${g.phone}" class="btn-icon" style="color: var(--primary); text-decoration: none;" title="Call"><span class="material-symbols-rounded">call</span></a>` : ''}
                <button class="btn-icon" onclick="openEditGuest('${g.id}')"><span class="material-symbols-rounded">edit</span></button>
                <button class="btn-icon danger-text" onclick="deleteGuest('${g.id}')"><span class="material-symbols-rounded">delete</span></button>
            </div>
        </div>
    `).join('');
}



