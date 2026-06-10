const API_URL = '/api';
let huidigeSessies = [];
let allePatienten = []; 
let sessieTeVerwijderen = null; // Voor de vuilbak

document.addEventListener('DOMContentLoaded', () => {
    laadPatienten();
    laadTherapeuten();
    laadSessies();
    stelAutocompleteIn();
});

function wisselTab(tab) {
    document.querySelectorAll('.tab-sectie').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-knoppen button').forEach(el => el.classList.remove('actief'));
    
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    document.getElementById(`btn-${tab}`).classList.add('actief');
}

async function laadPatienten() {
    const res = await fetch(`${API_URL}/patienten`);
    allePatienten = await res.json();
}

async function laadTherapeuten() {
    const res = await fetch(`${API_URL}/therapeuten`);
    const data = await res.json();
    const select = document.getElementById('select-therapeut');
    select.innerHTML = '<option value="" disabled selected>Kies een therapeut...</option>';
    data.forEach(t => {
        select.innerHTML += `<option value="${t.id}">${t.naam} (${t.discipline})</option>`;
    });
}

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
// VUILBAK / MODAL LOGICA
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
    
    await fetch(`${API_URL}/sessies/${sessieTeVerwijderen}`, {
        method: 'DELETE'
    });
    
    sluitModal();
    
    // Wis de zoekfilters zodat de volledige, standaard tabel met 20 sessies weer verschijnt
    document.getElementById('input-filter-patient').value = '';
    document.getElementById('filter-status').value = 'alle';
    
    laadSessies(); // Ververs tabel
}

// ==========================================
// TABEL & DATA
// ==========================================
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
        
        // Het aangepaste "✎" icoon en "🗑" icoon met de klas .actie-knoppen voor de PDF
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
// FORMULIEREN (POST)
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
        naam: document.getElementById('therapeut-naam').value,
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