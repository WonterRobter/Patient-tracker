-- Create Therapeuten table
CREATE TABLE IF NOT EXISTS therapeuten (
    id INT AUTO_INCREMENT PRIMARY KEY,
    naam VARCHAR(100) NOT NULL,
    discipline VARCHAR(50) NOT NULL
);

-- Create Patienten table
CREATE TABLE IF NOT EXISTS patienten (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voornaam VARCHAR(100) NOT NULL,
    achternaam VARCHAR(100) NOT NULL,
    geboortedatum DATE NOT NULL
);

-- Create Sessies table (de tracker)
CREATE TABLE IF NOT EXISTS sessies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    therapeut_id INT NOT NULL,
    datum_tijd DATETIME NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patienten(id) ON DELETE CASCADE,
    FOREIGN KEY (therapeut_id) REFERENCES therapeuten(id) ON DELETE CASCADE
);

-- Voeg optioneel alvast wat testdata toe zodat we straks meteen resultaat zien
INSERT INTO therapeuten (naam, discipline) VALUES ('Mama', 'Diëtist'), ('Collega X', 'Psycholoog');