const API_URL = '/api';
let huidigeSessies = [];
let allePatienten = []; 
let sessieTeVerwijderen = null; 

let archiefType = null; // 'patient' of 'therapeut'
let archiefId = null;

document.addEventListener('DOMContentLoaded', () => {
    laadPatienten();
    laadTherapeuten();
    laadSessies();
    stelAutocompleteIn();
});

let betaalGrafiek = null; // Variabele om de grafiek te bewaren

function wisselTab(tab) {
    document.querySelectorAll('.tab-sectie').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-knoppen button').forEach(el => el.classList.remove('actief'));
    
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    document.getElementById(`btn-${tab}`).classList.add('actief');
    
    // Als we naar statistieken gaan, laden we direct de verse data in
    if (tab === 'stats') {
        laadStatistieken();
    }
}

// ==========================================
// INLADEN DATA (Patiënten & Therapeuten)
// ==========================================
async function laadPatienten() {
    const res = await fetch(`${API_URL}/patienten`);
    allePatienten = await res.json();
    
    // Vul de Admin Tabel
    const tbody = document.querySelector('#tabel-admin-patienten tbody');
    tbody.innerHTML = '';
    
    allePatienten.forEach(p => {
        const datum = new Date(p.geboortedatum).toLocaleDateString('nl-BE');
        // Let op: value voor <input type="date"> MOET in YYYY-MM-DD formaat zijn
        const rawDatum = new Date(p.geboortedatum).toISOString().split('T')[0];
        
        tbody.innerHTML += `
        <tr>
            <td>
                <span id="view-p-naam-${p.id}">${p.voornaam} ${p.achternaam}</span>
                <div id="edit-p-naam-${p.id}" class="hidden" style="display: flex; gap: 5px;">
                    <input id="upd-p-vnaam-${p.id}" value="${p.voornaam}" style="width: 80px; padding: 2px;">
                    <input id="upd-p-anaam-${p.id}" value="${p.achternaam}" style="width: 80px; padding: 2px;">
                </div>
            </td>
            <td>
                <span id="view-p-geb-${p.id}">${datum}</span>
                <input type="date" id="edit-p-geb-${p.id}" class="hidden" value="${rawDatum}" style="padding: 2px; width: 110px;">
            </td>
            <td style="min-width: 100px;">
                <div id="view-p-acties-${p.id}" class="actie-knoppen" style="display: flex; gap: 5px;">
                    <button onclick="toonBewerkAdmin('p', ${p.id})" style="padding: 4px 8px; font-size: 15px; background-color: #f39c12; border: none; border-radius: 4px; cursor: pointer; color: white;" title="Bewerken">✎</button>
                    <button onclick="openArchiveModal('patienten', ${p.id}, '${p.voornaam} ${p.achternaam}')" style="padding: 4px 8px; font-size: 15px; background-color: #e74c3c; border: none; border-radius: 4px; cursor: pointer; color: white;" title="Archiveren">🗑</button>
                </div>
                <div id="edit-p-acties-${p.id}" class="hidden" style="display: flex; gap: 5px;">
                    <button onclick="opslaanPatient(${p.id})" style="padding: 4px 8px; font-size: 12px; background-color: #27ae60;">Opslaan</button>
                    <button onclick="annuleerBewerkAdmin('p', ${p.id})" style="padding: 4px 8px; font-size: 12px; background-color: #7f8c8d;">Annuleer</button>
                </div>
            </td>
        </tr>`;
    });
}

async function laadTherapeuten() {
    const res = await fetch(`${API_URL}/therapeuten`);
    const data = await res.json();
    
    const select = document.getElementById('select-therapeut');
    select.innerHTML = '<option value="" disabled selected>Kies een therapeut...</option>';
    
    const tbody = document.querySelector('#tabel-admin-therapeuten tbody');
    tbody.innerHTML = '';

    data.forEach(t => {
        const volleNaam = `${t.voornaam} ${t.achternaam}`;
        select.innerHTML += `<option value="${t.id}">${volleNaam} (${t.discipline})</option>`;
        
        tbody.innerHTML += `
        <tr>
            <td>
                <span id="view-t-naam-${t.id}">${volleNaam}</span>
                <div id="edit-t-naam-${t.id}" class="hidden" style="display: flex; gap: 5px;">
                    <input id="upd-t-vnaam-${t.id}" value="${t.voornaam}" style="width: 80px; padding: 2px;">
                    <input id="upd-t-anaam-${t.id}" value="${t.achternaam}" style="width: 80px; padding: 2px;">
                </div>
            </td>
            <td>
                <span id="view-t-disc-${t.id}">${t.discipline}</span>
                <input id="edit-t-disc-${t.id}" class="hidden" value="${t.discipline}" style="padding: 2px; width: 100px;">
            </td>
            <td style="min-width: 100px;">
                <div id="view-t-acties-${t.id}" class="actie-knoppen" style="display: flex; gap: 5px;">
                    <button onclick="toonBewerkAdmin('t', ${t.id})" style="padding: 4px 8px; font-size: 15px; background-color: #f39c12; border: none; border-radius: 4px; cursor: pointer; color: white;" title="Bewerken">✎</button>
                    <button onclick="openArchiveModal('therapeuten', ${t.id}, '${volleNaam}')" style="padding: 4px 8px; font-size: 15px; background-color: #e74c3c; border: none; border-radius: 4px; cursor: pointer; color: white;" title="Archiveren">🗑</button>
                </div>
                <div id="edit-t-acties-${t.id}" class="hidden" style="display: flex; gap: 5px;">
                    <button onclick="opslaanTherapeut(${t.id})" style="padding: 4px 8px; font-size: 12px; background-color: #27ae60;">Opslaan</button>
                    <button onclick="annuleerBewerkAdmin('t', ${t.id})" style="padding: 4px 8px; font-size: 12px; background-color: #7f8c8d;">Annuleer</button>
                </div>
            </td>
        </tr>`;
    });
}

// ==========================================
// ADMIN EDIT LOGICA
// ==========================================
function toonBewerkAdmin(prefix, id) {
    document.getElementById(`view-${prefix}-naam-${id}`).classList.add('hidden');
    document.getElementById(`edit-${prefix}-naam-${id}`).classList.remove('hidden');
    document.getElementById(`view-${prefix}-${prefix === 'p' ? 'geb' : 'disc'}-${id}`).classList.add('hidden');
    document.getElementById(`edit-${prefix}-${prefix === 'p' ? 'geb' : 'disc'}-${id}`).classList.remove('hidden');
    document.getElementById(`view-${prefix}-acties-${id}`).classList.add('hidden');
    document.getElementById(`edit-${prefix}-acties-${id}`).classList.remove('hidden');
}

function annuleerBewerkAdmin(prefix, id) {
    document.getElementById(`view-${prefix}-naam-${id}`).classList.remove('hidden');
    document.getElementById(`edit-${prefix}-naam-${id}`).classList.add('hidden');
    document.getElementById(`view-${prefix}-${prefix === 'p' ? 'geb' : 'disc'}-${id}`).classList.remove('hidden');
    document.getElementById(`edit-${prefix}-${prefix === 'p' ? 'geb' : 'disc'}-${id}`).classList.add('hidden');
    document.getElementById(`view-${prefix}-acties-${id}`).classList.remove('hidden');
    document.getElementById(`edit-${prefix}-acties-${id}`).classList.add('hidden');
}

async function opslaanPatient(id) {
    const body = {
        voornaam: document.getElementById(`upd-p-vnaam-${id}`).value,
        achternaam: document.getElementById(`upd-p-anaam-${id}`).value,
        geboortedatum: document.getElementById(`edit-p-geb-${id}`).value
    };
    await fetch(`${API_URL}/patienten/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    laadPatienten();
    laadSessies(); // Ververs sessies omdat de naam kan zijn gewijzigd
}

async function opslaanTherapeut(id) {
    const body = {
        voornaam: document.getElementById(`upd-t-vnaam-${id}`).value,
        achternaam: document.getElementById(`upd-t-anaam-${id}`).value,
        discipline: document.getElementById(`edit-t-disc-${id}`).value
    };
    await fetch(`${API_URL}/therapeuten/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    laadTherapeuten();
    laadSessies();
}

// ==========================================
// ARCHIVEER LOGICA (Soft Delete)
// ==========================================
function openArchiveModal(type, id, naam) {
    archiefType = type; // 'patienten' of 'therapeuten'
    archiefId = id;
    document.getElementById('archive-info').innerText = naam;
    document.getElementById('archive-modal').classList.remove('hidden');
}

function sluitArchiveModal() {
    archiefId = null;
    archiefType = null;
    document.getElementById('archive-modal').classList.add('hidden');
}

async function bevestigArchiveren() {
    if (!archiefId || !archiefType) return;
    await fetch(`${API_URL}/${archiefType}/${archiefId}/archive`, {
        method: 'PUT'
    });
    sluitArchiveModal();
    if (archiefType === 'patienten') laadPatienten();
    if (archiefType === 'therapeuten') laadTherapeuten();
}

// ==========================================
// AUTOCOMPLETE & ZOEKEN
// ==========================================
function stelAutocompleteIn() {
    const inputRegistratie = document.getElementById('input-patient-sessie');
    const inputFilter = document.getElementById('input-filter-patient');

    inputRegistratie.addEventListener('input', (e) => bouwDropdown(e.target.value, 'dropdown-patient-sessie', false));
    inputRegistratie.addEventListener('focus', (e) => bouwDropdown(e.target.value, 'dropdown-patient-sessie', false));
    inputFilter.addEventListener('input', (e) => bouwDropdown(e.target.value, 'dropdown-filter-patient', true));
    inputFilter.addEventListener('focus', (e) => bouwDropdown(e.target.value, 'dropdown-filter-patient', true));

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-wrapper')) {
            document.getElementById('dropdown-patient-sessie').classList.add('hidden');
            document.getElementById('dropdown-filter-patient').classList.add('hidden');
        }
    });
}

function bouwDropdown(zoekterm, dropdownId, isFilter) {
    const dropdown = document.getElementById(dropdownId);
    dropdown.innerHTML = '';
    const term = zoekterm.toLowerCase();
    
    const gefilterd = allePatienten.filter(p => {
        const weergaveNaam = `${p.voornaam} ${p.achternaam}`.toLowerCase();
        return weergaveNaam.includes(term);
    });

    if (gefilterd.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-item" style="color: #999;">Geen patiënten gevonden...</div>';
    } else {
        gefilterd.forEach(p => {
            const datum = new Date(p.geboortedatum).toLocaleDateString('nl-BE');
            const uniekeNaam = `${p.voornaam} ${p.achternaam} (${datum})`;
            const weergaveNaam = `${p.voornaam} ${p.achternaam}`;
            
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.innerText = isFilter ? weergaveNaam : uniekeNaam;
            
            div.onclick = () => {
                const inputId = isFilter ? 'input-filter-patient' : 'input-patient-sessie';
                document.getElementById(inputId).value = div.innerText;
                dropdown.classList.add('hidden');
                
                if (isFilter) laadSessies();
            };
            dropdown.appendChild(div);
        });
    }
    dropdown.classList.remove('hidden');
}

function wisInputRegistratie() {
    const input = document.getElementById('input-patient-sessie');
    input.value = '';
    document.getElementById('dropdown-patient-sessie').classList.add('hidden');
    input.focus();
}

function wisInputFilter() {
    const input = document.getElementById('input-filter-patient');
    input.value = '';
    document.getElementById('dropdown-filter-patient').classList.add('hidden');
    laadSessies();
}

function vindPatientId(getypteTekst, isFilter = false) {
    if (!getypteTekst) return null;
    const gevonden = allePatienten.find(p => {
        const datum = new Date(p.geboortedatum).toLocaleDateString('nl-BE');
        const uniekeNaam = `${p.voornaam} ${p.achternaam} (${datum})`;
        const weergaveNaam = `${p.voornaam} ${p.achternaam}`;
        return isFilter ? weergaveNaam === getypteTekst : uniekeNaam === getypteTekst;
    });
    return gevonden ? gevonden.id : null;
}

// ==========================================
// SESSIES (VUILBAK, TABEL & VERWERKEN)
// ==========================================
function openDeleteModal(id, datum, patient, therapeut) {
    sessieTeVerwijderen = id;
    document.getElementById('delete-sessie-info').innerText = `${datum} | ${patient} (Therapeut: ${therapeut})`;
    document.getElementById('delete-modal').classList.remove('hidden');
}

function sluitModal() {
    sessieTeVerwijderen = null;
    document.getElementById('delete-modal').classList.add('hidden');
}

async function bevestigVerwijderen() {
    if (!sessieTeVerwijderen) return;
    await fetch(`${API_URL}/sessies/${sessieTeVerwijderen}`, { method: 'DELETE' });
    sluitModal();
    document.getElementById('input-filter-patient').value = '';
    document.getElementById('filter-status').value = 'alle';
    laadSessies();
}

async function laadSessies() {
    const getypteFilter = document.getElementById('input-filter-patient').value;
    const patientId = vindPatientId(getypteFilter, true); 
    const statusFilter = document.getElementById('filter-status').value;
    
    let url = `${API_URL}/sessies?status=${statusFilter}`;
    if (patientId) {
        url += `&patient_id=${patientId}`;
    } else if (getypteFilter !== "") {
        document.querySelector('#tabel-sessies tbody').innerHTML = '<tr><td colspan="5">Geen patiënt gevonden met deze exacte naam.</td></tr>';
        document.getElementById('sessie-teller').classList.add('hidden');
        return;
    }

    const res = await fetch(url);
    const data = await res.json();
    huidigeSessies = data; 
    
    const tbody = document.querySelector('#tabel-sessies tbody');
    tbody.innerHTML = '';
    
    const tellerVak = document.getElementById('sessie-teller');
    const downloadKnoppen = document.getElementById('download-knoppen');

    if((patientId || statusFilter !== 'alle') && data.length > 0) {
        tellerVak.classList.remove('hidden');
        document.getElementById('teller-getal').innerText = data.length;
        downloadKnoppen.classList.remove('hidden'); 
    } else {
        tellerVak.classList.add('hidden');
        downloadKnoppen.classList.add('hidden'); 
    }
    
    data.forEach(s => {
        const bedrag = parseFloat(s.bedrag).toFixed(2);
        const datum = new Date(s.datum_tijd).toLocaleDateString('nl-BE', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit'});
        const statusTekst = s.betaald ? `Betaald (${s.betaalmethode})` : 'Nog betalen';
        const patientNaam = `${s.voornaam} ${s.achternaam}`;
        
        const statusHtml = `
            <div id="view-status-${s.id}" style="display: flex; align-items: center; justify-content: space-between;">
                <span>${statusTekst}</span>
                <div class="actie-knoppen" style="display: flex; gap: 5px;">
                    <button onclick="toonBewerkStatus(${s.id})" style="padding: 4px 8px; font-size: 15px; background-color: #f39c12; border: none; border-radius: 4px; cursor: pointer; color: white;" title="Bewerk de betaalstatus">✎</button>
                    <button onclick="openDeleteModal(${s.id}, '${datum}', '${patientNaam}', '${s.therapeut}')" style="padding: 4px 8px; font-size: 15px; background-color: #e74c3c; border: none; border-radius: 4px; cursor: pointer; color: white;" title="Verwijder sessie">🗑</button>
                </div>
            </div>
            <div id="edit-status-${s.id}" class="hidden" style="display: flex; gap: 5px; align-items: center;">
                <select id="update-methode-${s.id}" style="padding: 4px; font-size: 12px; width: auto;">
                    <option value="onbetaald" ${!s.betaald ? 'selected' : ''}>Nog betalen</option>
                    <option value="Cash" ${s.betaald && s.betaalmethode === 'Cash' ? 'selected' : ''}>Cash</option>
                    <option value="Bancontact" ${s.betaald && s.betaalmethode === 'Bancontact' ? 'selected' : ''}>Bancontact</option>
                </select>
                <button onclick="opslaanBetaling(${s.id})" style="padding: 4px 8px; font-size: 12px; background-color: #27ae60; margin-top: 0;">Opslaan</button>
                <button onclick="annuleerBewerkStatus(${s.id})" style="padding: 4px 8px; font-size: 12px; background-color: #7f8c8d; margin-top: 0;">Annuleer</button>
            </div>
        `;

        tbody.innerHTML += `<tr>
            <td>${datum}</td>
            <td>${patientNaam}</td>
            <td>${s.therapeut}</td>
            <td>€ ${bedrag}</td>
            <td style="min-width: 250px;">${statusHtml}</td>
        </tr>`;
    });
}

function toonBewerkStatus(id) {
    document.getElementById(`view-status-${id}`).classList.add('hidden');
    document.getElementById(`edit-status-${id}`).classList.remove('hidden');
}
function annuleerBewerkStatus(id) {
    document.getElementById(`view-status-${id}`).classList.remove('hidden');
    document.getElementById(`edit-status-${id}`).classList.add('hidden');
}

async function opslaanBetaling(sessieId) {
    const methode = document.getElementById(`update-methode-${sessieId}`).value;
    await fetch(`${API_URL}/sessies/${sessieId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betaalmethode: methode })
    });
    laadSessies();
}

function downloadRapport() {
    if(huidigeSessies.length === 0) return;
    let csvContent = "Datum;Patient;Therapeut;Bedrag;Status;Betaalmethode\n";
    huidigeSessies.forEach(s => {
        const datum = new Date(s.datum_tijd).toLocaleDateString('nl-BE');
        const naam = `${s.voornaam} ${s.achternaam}`;
        const bedrag = s.bedrag.replace('.', ','); 
        const status = s.betaald ? "Betaald" : "Openstaand";
        const methode = s.betaalmethode || "-";
        csvContent += `${datum};${naam};${s.therapeut};€ ${bedrag};${status};${methode}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `SessieRapport.csv`;
    link.click();
}

// ==========================================
// FORMULIEREN (Nieuw Toevoegen)
// ==========================================
document.getElementById('form-sessie').addEventListener('submit', async (e) => {
    e.preventDefault();
    const getypteNaam = document.getElementById('input-patient-sessie').value;
    const patient_id = vindPatientId(getypteNaam, false);
    
    if (!patient_id) {
        alert("Selecteer a.u.b. een geldige patiënt uit de voorgestelde lijst.");
        return;
    }

    const body = {
        patient_id: patient_id,
        therapeut_id: document.getElementById('select-therapeut').value,
        datum_tijd: document.getElementById('datum-tijd').value,
        bedrag: document.getElementById('bedrag').value,
        betaal_status: document.getElementById('betaal-status').value
    };
    
    const res = await fetch(`${API_URL}/sessies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    
    if(res.ok) {
        document.getElementById('msg-sessie').innerText = "Sessie opgeslagen!";
        document.getElementById('form-sessie').reset();
        wisInputRegistratie();
        laadSessies();
        setTimeout(() => document.getElementById('msg-sessie').innerText = "", 3000);
    }
});

document.getElementById('form-patient').addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('msg-patient').innerText = "";
    document.getElementById('err-patient').innerText = "";

    const body = {
        voornaam: document.getElementById('voornaam').value,
        achternaam: document.getElementById('achternaam').value,
        geboortedatum: document.getElementById('geboortedatum').value
    };
    
    const res = await fetch(`${API_URL}/patienten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    
    if(res.ok) {
        document.getElementById('msg-patient').innerText = "Patiënt succesvol toegevoegd!";
        document.getElementById('form-patient').reset();
        laadPatienten(); 
        setTimeout(() => document.getElementById('msg-patient').innerText = "", 3000);
    } else {
        const data = await res.json();
        document.getElementById('err-patient').innerText = data.error; 
    }
});

document.getElementById('form-therapeut').addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('msg-therapeut').innerText = "";

    const body = {
        voornaam: document.getElementById('therapeut-voornaam').value,
        achternaam: document.getElementById('therapeut-achternaam').value,
        discipline: document.getElementById('therapeut-discipline').value
    };
    
    const res = await fetch(`${API_URL}/therapeuten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    
    if(res.ok) {
        document.getElementById('msg-therapeut').innerText = "Therapeut toegevoegd!";
        document.getElementById('form-therapeut').reset();
        laadTherapeuten(); 
        setTimeout(() => document.getElementById('msg-therapeut').innerText = "", 3000);
    }
});

// ==========================================
// STATISTIEKEN LOGICA
// ==========================================
async function laadStatistieken() {
    const res = await fetch(`${API_URL}/statistieken`);
    const data = await res.json();
    
    // 1. Bouw de lijst voor Therapeuten (Deze maand)
    const tbody = document.querySelector('#tabel-stats-therapeuten tbody');
    tbody.innerHTML = '';
    
    if (data.therapeuten_deze_maand.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#7f8c8d;">Nog geen sessies gedraaid deze maand.</td></tr>';
    } else {
        data.therapeuten_deze_maand.forEach(t => {
            tbody.innerHTML += `
            <tr>
                <td style="font-weight: bold;">${t.voornaam} ${t.achternaam}</td>
                <td>${t.aantal} sessie(s)</td>
            </tr>`;
        });
    }

    // 2. Teken de Chart.js Taartdiagram voor betaalmethodes
    const ctx = document.getElementById('betaalChart').getContext('2d');
    
    // Verwijder de oude grafiek als hij bestaat (om zweef-bugs te voorkomen)
    if (betaalGrafiek) {
        betaalGrafiek.destroy();
    }
    
    // Haal de waardes op (standaard op 0 als er nog niets is)
    let cashAantal = 0;
    let bancAantal = 0;
    
    data.betalingen.forEach(b => {
        if (b.betaalmethode === 'Cash') cashAantal = b.aantal;
        if (b.betaalmethode === 'Bancontact') bancAantal = b.aantal;
    });

    betaalGrafiek = new Chart(ctx, {
        type: 'doughnut', // Doughnut is een moderne taartdiagram met een gat in het midden
        data: {
            labels: ['Bancontact', 'Cash'],
            datasets: [{
                data: [bancAantal, cashAantal],
                backgroundColor: ['#3498db', '#2ecc71'], // Blauw voor Bancontact, Groen voor Cash
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}