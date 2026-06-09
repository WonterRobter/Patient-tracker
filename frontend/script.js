const API_URL = 'http://localhost:5000/api';
let huidigeSessies = []; // Globale variabele voor de CSV download

// Laad data zodra de pagina opent
document.addEventListener('DOMContentLoaded', () => {
    laadPatienten();
    laadTherapeuten();
    laadSessies();
});

// --- TABBLADEN WISSELEN ---
function wisselTab(tab) {
    document.getElementById('tab-home').classList.add('hidden');
    document.getElementById('tab-admin').classList.add('hidden');
    document.getElementById('btn-home').classList.remove('actief');
    document.getElementById('btn-admin').classList.remove('actief');

    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    document.getElementById(`btn-${tab}`).classList.add('actief');
}

// --- OPHALEN DATA (GET) ---
async function laadPatienten() {
    const res = await fetch(`${API_URL}/patienten`);
    const data = await res.json();
    
    const selectSessie = document.getElementById('select-patient-sessie');
    const selectFilter = document.getElementById('filter-patient');
    
    let optionsRegistratie = '<option value="" disabled selected>Kies een patiënt...</option>';
    let optionsFilter = '<option value="">-- Toon alle recente sessies van iedereen --</option>';

    data.forEach(p => {
        const datum = new Date(p.geboortedatum).toLocaleDateString('nl-BE');
        const naam = `${p.voornaam} ${p.achternaam}`;
        optionsRegistratie += `<option value="${p.id}">${naam} (${datum})</option>`;
        optionsFilter += `<option value="${p.id}">${naam}</option>`;
    });

    selectSessie.innerHTML = optionsRegistratie;
    selectFilter.innerHTML = optionsFilter;
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

// Tabel vullen (en filteren)
async function laadSessies() {
    const patientId = document.getElementById('filter-patient').value;
    const url = patientId ? `${API_URL}/sessies?patient_id=${patientId}` : `${API_URL}/sessies`;

    const res = await fetch(url);
    const data = await res.json();
    huidigeSessies = data; // Sla op voor de CSV download
    
    const tbody = document.querySelector('#tabel-sessies tbody');
    tbody.innerHTML = '';
    
    const tellerVak = document.getElementById('sessie-teller');
    const downloadBtn = document.getElementById('btn-download');

    if(patientId && data.length > 0) {
        tellerVak.classList.remove('hidden');
        document.getElementById('teller-getal').innerText = data.length;
        downloadBtn.classList.remove('hidden'); 
    } else {
        tellerVak.classList.add('hidden');
        downloadBtn.classList.add('hidden'); 
    }
    
    data.forEach(s => {
        const bedrag = parseFloat(s.bedrag).toFixed(2);
        const datum = new Date(s.datum_tijd).toLocaleDateString('nl-BE', {day: '2-digit', month: '2-digit', year: 'numeric'});
        
        let statusHtml = '';
        if(s.betaald) {
            statusHtml = `<span class="badge-betaald">Betaald (${s.betaalmethode})</span>`;
        } else {
            // Dropdown en knop om alsnog te betalen
            statusHtml = `
                <span class="badge-open">Open</span>
                <select id="update-methode-${s.id}" style="padding: 2px; font-size: 12px; margin-left: 5px;">
                    <option value="Cash">Cash</option>
                    <option value="Bancontact">Bancontact</option>
                </select>
                <button onclick="updateBetaling(${s.id})" style="padding: 3px 6px; font-size: 12px; margin-top: 0;">Vink af</button>
            `;
        }

        tbody.innerHTML += `<tr>
            <td>${datum}</td>
            <td>${s.voornaam} ${s.achternaam}</td>
            <td>€ ${bedrag}</td>
            <td>${statusHtml}</td>
        </tr>`;
    });
}

// --- UPDATEN BETALING (PUT) ---
async function updateBetaling(sessieId) {
    const methode = document.getElementById(`update-methode-${sessieId}`).value;
    
    const res = await fetch(`${API_URL}/sessies/${sessieId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betaalmethode: methode })
    });

    if(res.ok) {
        laadSessies(); // Ververs tabel voor de groene badge
    }
}

// --- CSV RAPPORT DOWNLOADEN ---
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
    link.download = `SessieRapport_${huidigeSessies[0].voornaam}_${huidigeSessies[0].achternaam}.csv`;
    link.click();
}

// --- FORMULIEREN OPSLAAN (POST) ---

// Nieuwe sessie opslaan
document.getElementById('form-sessie').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
        patient_id: document.getElementById('select-patient-sessie').value,
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
        laadSessies();
        setTimeout(() => document.getElementById('msg-sessie').innerText = "", 3000);
    }
});

// Nieuwe patiënt opslaan
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
    
    const data = await res.json();

    if(res.ok) {
        document.getElementById('msg-patient').innerText = data.bericht;
        document.getElementById('form-patient').reset();
        laadPatienten();
        setTimeout(() => document.getElementById('msg-patient').innerText = "", 3000);
    } else {
        document.getElementById('err-patient').innerText = data.error; 
    }
});