-- Create Therapeuten table
CREATE TABLE IF NOT EXISTS therapeuten (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voornaam VARCHAR(100) NOT NULL,
    achternaam VARCHAR(100) NOT NULL,
    discipline VARCHAR(100) NOT NULL,
    actief BOOLEAN DEFAULT TRUE
);

-- Create Patienten table
CREATE TABLE IF NOT EXISTS patienten (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voornaam VARCHAR(100) NOT NULL,
    achternaam VARCHAR(100) NOT NULL,
    geboortedatum DATE NOT NULL,
    actief BOOLEAN DEFAULT TRUE
);

-- Create Sessies table (de tracker)
CREATE TABLE IF NOT EXISTS sessies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    therapeut_id INT NOT NULL,
    datum_tijd DATETIME NOT NULL,
    bedrag DECIMAL(6,2) DEFAULT 0.00,
    betaald BOOLEAN DEFAULT FALSE,
    betaalmethode VARCHAR(20) DEFAULT NULL,
    FOREIGN KEY (patient_id) REFERENCES patienten(id) ON DELETE CASCADE,
    FOREIGN KEY (therapeut_id) REFERENCES therapeuten(id) ON DELETE CASCADE
);

 -- dummy data
 INSERT INTO therapeuten (voornaam, achternaam, discipline) VALUES 
('Mama', 'De Eetstudio', 'Diëtist'), ('Lotte', 'Janssens', 'Diëtist'), ('Emma', 'Smet', 'Psycholoog'), 
('Tom', 'Willems', 'Klinisch Psycholoog'), ('Sarah', 'Peeters', 'Eetstoornis Coach'), 
('Jeroen', 'Maes', 'Voedingsdeskundige'), ('Annelies', 'Claes', 'Diëtist'), 
('David', 'Mertens', 'Psychotherapeut'), ('Sofie', 'Hermans', 'Mindfulness Coach'), 
('Bart', 'Jacobs', 'Gezinstherapeut');

-- 80 Patiënten
INSERT INTO patienten (voornaam, achternaam, geboortedatum) VALUES 
('Aagje','Hermans','1990-05-12'),('Aaron','Peeters','1985-11-20'),('Babs','Smit','2001-02-15'),('Bart','Janssens','1995-07-30'),
('Celine','Willems','1988-09-10'),('Chris','Claes','1975-04-22'),('Daan','Maes','1999-12-05'),('Daphne','Jacobs','1992-08-18'),
('Eline','Mertens','2005-01-25'),('Elise','Thys','1980-03-14'),('Emma','Goossens','1997-10-08'),('Eva','Wouters','1983-06-19'),
('Ferre','De Smet','2000-05-02'),('Fien','Vermeulen','1991-11-11'),('Floris','Pauwels','1986-02-28'),('Gitte','Hendriks','1994-09-04'),
('Hanne','De Clercq','1989-12-15'),('Hans','Desmet','1978-07-21'),('Helena','Callens','1996-04-09'),('Ilias','Martens','2003-10-31'),
('Ina','Vandamme','1982-01-17'),('Janne','Devos','1998-08-25'),('Jens','Verhoeven','1993-05-07'),('Jolien','Michiels','1987-03-03'),
('Jonas','Stevens','1995-11-29'),('Julie','Lemmens','2002-06-12'),('Kobe','De Backer','1984-09-20'),('Laura','Goris','1990-02-08'),
('Lennert','De Wolf','1981-12-22'),('Lien','Simoens','1997-07-16'),('Lisa','Vandenberghe','1988-04-05'),('Lotte','Baert','1992-10-14'),
('Lucas','Declercq','2004-01-09'),('Maaike','De Vos','1985-08-01'),('Maarten','Coppens','1979-05-26'),('Margot','Van Damme','1996-11-18'),
('Marie','Lauwers','2001-03-07'),('Mathias','De Meyer','1994-09-24'),('Mats','Segers','1983-12-10'),('Maxime','Smets','1989-06-03'),
('Merel','Vanderstappen','1999-02-19'),('Milan','Diels','1991-07-11'),('Nina','Van den Broeck','1986-10-27'),('Noa','De Ridder','2006-05-15'),
('Olivier','Bogaerts','1980-01-29'),('Paulien','Van Hoof','1993-08-21'),('Pieter','Vermeiren','1977-04-12'),('Robbe','Somers','1998-11-06'),
('Roel','Geerts','1984-06-30'),('Roos','Huybrechts','1995-02-23'),('Ruben','Verbeke','1990-09-17'),('Sam','Cools','1987-05-09'),
('Sander','Dillen','2000-12-28'),('Sara','De Weerdt','1982-07-04'),('Senne','Verheyen','1997-03-26'),('Seppe','De Pauw','1992-10-19'),
('Simon','Van Dyck','1985-01-13'),('Sofie','De Groote','1979-08-07'),('Stijn','De Volder','1994-04-01'),('Tess','Luyten','2003-11-24'),
('Thibault','Baelus','1988-06-16'),('Thomas','Sterckx','1991-02-05'),('Tibo','Dumon','1996-09-12'),('Tijl','Van de Velde','1981-05-21'),
('Tom','De Cock','1986-12-14'),('Toon','Hermans','1999-07-08'),('Tuur','Verstraete','2005-03-02'),('Vic','Geyskens','1990-10-25'),
('Victor','Meyers','1983-04-18'),('Ward','Nuyts','1995-12-10'),('Wout','Roels','1989-08-03'),('Yana','Van Roy','1993-01-27'),
('Yarne','Smits','1998-06-20'),('Yasmine','Wyns','1984-11-13'),('Yentl','Rombouts','1987-07-06'),('Yoran','Saelens','1992-02-28'),
('Yousra','Tack','2001-09-22'),('Zita','Gielis','1980-05-16'),('Zoe','Schoofs','1997-12-09'),('Zoran','De Winne','1985-03-04');

-- 2000 Random Sessies
INSERT INTO sessies (patient_id, therapeut_id, datum_tijd, bedrag, betaald, betaalmethode)
SELECT 
    (MOD(id, 80) + 1) AS patient_id, 
    (MOD(id, 10) + 1) AS therapeut_id, 
    DATE_ADD('2024-01-01 09:00:00', INTERVAL MOD(id * 10, 21600) HOUR) AS datum_tijd,
    65.00 AS bedrag,
    IF(MOD(id, 3) = 0, FALSE, TRUE) AS betaald,
    IF(MOD(id, 3) = 0, NULL, IF(MOD(id, 2) = 0, 'Bancontact', 'Cash')) AS betaalmethode
FROM (
    -- Subquery om voldoende getallen te genereren (0 tot 2999)
    SELECT a.i + b.i*10 + c.i*100 + d.i*1000 AS id
    FROM (SELECT 0 AS i UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
         (SELECT 0 AS i UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b,
         (SELECT 0 AS i UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) c,
         (SELECT 0 AS i UNION SELECT 1 UNION SELECT 2) d
) n WHERE id > 0 AND id <= 2000;