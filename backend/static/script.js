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

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

// Automatisch aanzetten als het al aan stond
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }
});

// ==========================================
// INLADEN DATA (Patiënten & Therapeuten)
// ==========================================
// ====== ZOEKBANK FUNCTIE (Verbeterd) ======
function zoekInAdminPatienten() {
    const input = document.getElementById('zoek-patient-admin').value.toLowerCase().trim();
    const rijen = document.querySelectorAll('#tabel-admin-patienten tbody tr');
    rijen.forEach(rij => {
        const naamSpan = rij.querySelector('td:first-child span');
        if (naamSpan) {
            const naam = naamSpan.innerText.toLowerCase();
            if (naam.includes(input)) {
                rij.style.display = '';
            } else {
                rij.style.display = 'none';
            }
        }
    });
}

// ====== OVERZICHT INLADEN MET CORRECTE KOLOMMEN ======
async function laadPatienten() {
    const res = await fetch(`${API_URL}/patienten`);
    allePatienten = await res.json();
    
    const tbody = document.querySelector('#tabel-admin-patienten tbody');
    tbody.innerHTML = '';
    
    allePatienten.forEach(p => {
        const datum = new Date(p.geboortedatum).toLocaleDateString('nl-BE');
        const rawDatum = new Date(p.geboortedatum).toISOString().split('T')[0];
        
        const trajectUren = p.traject_uren || 0;
        const trajectVerval = p.traject_vervaldatum ? new Date(p.traject_vervaldatum).toISOString().split('T')[0] : '';
        
        tbody.innerHTML += `
        <tr>
            <!-- Kolom 1: Naam -->
            <td>
                <span id="view-p-naam-${p.id}">${p.voornaam} ${p.achternaam}</span>
                <div id="edit-p-naam-${p.id}" class="hidden" style="display: flex; gap: 5px;">
                    <input id="upd-p-vnaam-${p.id}" value="${p.voornaam}" style="width: 80px; padding: 2px;">
                    <input id="upd-p-anaam-${p.id}" value="${p.achternaam}" style="width: 80px; padding: 2px;">
                </div>
            </td>
            <!-- Kolom 2: Geboortedatum -->
            <td>
                <span id="view-p-geb-${p.id}">${datum}</span>
                <input type="date" id="edit-p-geb-${p.id}" class="hidden" value="${rawDatum}" style="padding: 2px; width: 110px;">
            </td>
            <!-- Kolom 3: Traject -->
            <td>
                <span id="view-p-traj-${p.id}">${trajectUren > 0 ? trajectUren + ' u' : 'Geen'}</span>
                <div id="edit-p-traj-${p.id}" class="hidden" style="display: flex; flex-direction: column; gap: 2px;">
                    <input type="number" id="upd-p-uren-${p.id}" value="${trajectUren}" style="width: 80px; padding: 2px;" placeholder="Uren">
                    <input type="date" id="upd-p-verval-${p.id}" value="${trajectVerval}" style="width: 110px; padding: 2px; font-size:11px;" title="Geldig tot">
                </div>
            </td>
            <!-- Kolom 4: Acties -->
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
    laadSessies();
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
    archiefType = type; 
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
                
                if (isFilter) {
                    laadSessies();
                } else {
                    checkGratisLimiet(p.id);
                }
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
    const tellerDiv = document.getElementById('info-gratis-limiet');
    if (tellerDiv) tellerDiv.remove();
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
        // Aangepast naar colspan 6 wegens de nieuwe Duur kolom
        document.querySelector('#tabel-sessies tbody').innerHTML = '<tr><td colspan="6">Geen patiënt gevonden met deze exacte naam.</td></tr>';
        document.getElementById('sessie-teller').classList.add('hidden');
        return;
    }

    try {
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
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nog geen sessies gevonden.</td></tr>';
            return;
        }

        data.forEach(s => {
            const bedrag = parseFloat(s.bedrag).toFixed(2);
            
            // FIX: Gebruik direct de database tekst. Nooit meer +2 uur tijdzone bugs!
            const datum = s.weergave_datum;
            
            // Bereken de duur mooi naar tekst (bijv. 90 minuten -> 1u 30m)
            const duurMin = s.duur_minuten || 0;
            const dUur = Math.floor(duurMin / 60);
            const dMin = duurMin % 60;
            const duurTekst = dUur > 0 ? `${dUur}u ${dMin > 0 ? dMin+'m' : ''}` : `${dMin}m`;

            let statusKlasse = 'status-onbetaald';
            let statusTekstLable = 'Nog betalen';

            if (s.betaalmethode === 'Gratis traject') {
                statusKlasse = 'status-gratis';
                statusTekstLable = 'Gratis traject (Vergoed)';
            } else if (s.betaald) {
                statusKlasse = 'status-betaald';
                statusTekstLable = `Betaald (${s.betaalmethode})`;
            }

            const statusTekst = `<span class="${statusKlasse}" style="${s.betaalmethode === 'Gratis traject' ? 'color: #3498db; font-weight: bold;' : ''}">${statusTekstLable}</span>`;    
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
                        <option value="onbetaald" ${!s.betaald && s.betaalmethode !== 'Gratis traject' ? 'selected' : ''}>Nog betalen</option>
                        <option value="Cash" ${s.betaald && s.betaalmethode === 'Cash' ? 'selected' : ''}>Cash</option>
                        <option value="Bancontact" ${s.betaald && s.betaalmethode === 'Bancontact' ? 'selected' : ''}>Bancontact</option>
                        <option value="Gratis traject" ${s.betaalmethode === 'Gratis traject' ? 'selected' : ''}>Gratis traject</option>
                    </select>
                    <button onclick="opslaanBetaling(${s.id})" style="padding: 4px 8px; font-size: 12px; background-color: #27ae60; margin-top: 0;">Opslaan</button>
                    <button onclick="annuleerBewerkStatus(${s.id})" style="padding: 4px 8px; font-size: 12px; background-color: #7f8c8d; margin-top: 0;">Annuleer</button>
                </div>
            `;

            // DEZE REGEL IS CRUCIAAL: Hij voegt de rij inclusief duurTekst toe (6 kolommen totaal!)
            tbody.innerHTML += `<tr>
                <td>${datum}</td>
                <td>${patientNaam}</td>
                <td>${s.therapeut}</td>
                <td><strong>${duurTekst}</strong></td>
                <td>€ ${bedrag}</td>
                <td style="min-width: 250px;">${statusHtml}</td>
            </tr>`;
        });
    } catch (err) {
        console.error("Fout bij laden van de sessies:", err);
    }
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
    const uren = parseInt(document.getElementById('sessie-u').value) || 0;
    const minuten = parseInt(document.getElementById('sessie-min').value) || 0;
    const totaalMinuten = (uren * 60) + minuten;

    if (!patient_id) {
        alert("Selecteer a.u.b. een geldige patiënt uit de voorgestelde lijst.");
        return;
    }

    const body = {
        patient_id: patient_id,
        therapeut_id: document.getElementById('select-therapeut').value,
        datum_tijd: document.getElementById('datum-tijd').value, // Zuivere string sturen i.v.m. tijdzones
        duur_minuten: totaalMinuten,
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
        geboortedatum: document.getElementById('geboortedatum').value,
        traject_uren: document.getElementById('traject-uren') ? document.getElementById('traject-uren').value : 0,
        traject_vervaldatum: document.getElementById('traject-vervaldatum') ? (document.getElementById('traject-vervaldatum').value || null) : null
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

    const ctx = document.getElementById('betaalChart').getContext('2d');
    if (betaalGrafiek) {
        betaalGrafiek.destroy();
    }
    
    let cashAantal = 0;
    let bancAantal = 0;
    
    data.betalingen.forEach(b => {
        if (b.betaalmethode === 'Cash') cashAantal = b.aantal;
        if (b.betaalmethode === 'Bancontact') bancAantal = b.aantal;
    });

    betaalGrafiek = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Bancontact', 'Cash'],
            datasets: [{
                data: [bancAantal, cashAantal],
                backgroundColor: ['#3498db', '#2ecc71'],
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

// ==========================================
// GRATIS TRAJECT / LIMIET TELLER
// ==========================================
async function checkGratisLimiet(patientId) {
    if (!patientId) return;
    try {
        // 1. Haal patiëntgegevens op voor hun traject-limiet
        const pRes = await fetch(`${API_URL}/patienten`);
        const allePat = await pRes.json();
        const patient = allePat.find(p => p.id === patientId);
        
        const maxUren = patient.traject_uren || 0;
        const maxMinuten = maxUren * 60;

        // 2. Haal de verbruikte gratis sessies op
        const sRes = await fetch(`${API_URL}/sessies?patient_id=${patientId}&status=Gratis traject`);
        const sessies = await sRes.json();
        
        // Tel alle minuten van de gratis sessies bij elkaar op
        let verbruikteMinuten = 0;
        sessies.forEach(s => { verbruikteMinuten += (s.duur_minuten || 60); });

        // Reken terug naar uren en minuten voor weergave
        const verbruiktU = Math.floor(verbruikteMinuten / 60);
        const verbruiktM = verbruikteMinuten % 60;
        
        const overMinuten = maxMinuten - verbruikteMinuten;
        const overU = Math.floor(overMinuten / 60);
        const overM = overMinuten % 60;

        let tellerDiv = document.getElementById('info-gratis-limiet');
        if (!tellerDiv) {
            tellerDiv = document.createElement('div');
            tellerDiv.id = 'info-gratis-limiet';
            tellerDiv.style.fontSize = '14px';
            tellerDiv.style.marginTop = '8px';
            document.getElementById('input-patient-sessie').parentNode.appendChild(tellerDiv);
        }
        
        if (maxUren === 0) {
            tellerDiv.innerText = `💡 Deze patiënt heeft geen actief gratis traject geregistreerd.`;
            tellerDiv.style.color = '#7f8c8d';
        } else {
            tellerDiv.innerText = `💡 Gratis Traject (${maxUren}u): Al ${verbruiktU}u ${verbruiktM}min verbruikt. Nog ${overU}u ${overM}min over.`;
            
            if (overMinuten <= 0) {
                tellerDiv.style.color = '#e74c3c';
                tellerDiv.innerText = `⚠️ Gratis Traject (${maxUren}u): Limiet is bereikt of overschreden!`;
            } else if (overMinuten <= 120) {
                tellerDiv.style.color = '#f39c12'; // Oranje als ze bijna aan de limiet zitten
            } else {
                tellerDiv.style.color = '#27ae60';
            }
        }
    } catch (err) {
        console.error("Kon gratis limiet niet berekenen:", err);
    }
}