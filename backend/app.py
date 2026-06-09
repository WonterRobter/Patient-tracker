from flask import Flask, jsonify, request
import os
import pymysql

app = Flask(__name__)

def get_db_connection():
    return pymysql.connect(
        host=os.environ.get('DB_HOST'),         # docker-compose.yml
        user=os.environ.get('DB_USER'),         # .env
        password=os.environ.get('DB_PASSWORD'), # .env
        database=os.environ.get('DB_NAME'),     # .env
        cursorclass=pymysql.cursors.DictCursor
    )

@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({
        "status": "online",
        "bericht": "De Eetstudio API draait succesvol!"
    })

@app.route('/api/therapeuten', methods=['GET'])
def get_therapeuten():
    try:
        # 1. Maak verbinding met MariaDB
        connection = get_db_connection()
        
        # 2. Voer een SQL-query uit
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM therapeuten")
            therapeuten_lijst = cursor.fetchall()
            
        # 3. Sluit de verbinding netjes af
        connection.close()
        
        # 4. Stuur de data terug naar de browser
        return jsonify(therapeuten_lijst)
        
    except Exception as e:
        # Als er iets misgaat, stuur dan de foutmelding terug
        return jsonify({"error": str(e)}), 500
    
# Route om alle patiënten op te halen
@app.route('/api/patienten', methods=['GET'])
def get_patienten():
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM patienten")
            patienten_lijst = cursor.fetchall()
        connection.close()
        return jsonify(patienten_lijst)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Route om een nieuwe patiënt toe te voegen
@app.route('/api/patienten', methods=['POST'])
def add_patient():
    try:
        # We vangen de JSON data op die de website straks opstuurt
        data = request.get_json()
        voornaam = data['voornaam']
        achternaam = data['achternaam']
        geboortedatum = data['geboortedatum']

        connection = get_db_connection()
        with connection.cursor() as cursor:
            # We gebruiken %s om SQL-injecties te voorkomen (veiligheid voorop!)
            sql = "INSERT INTO patienten (voornaam, achternaam, geboortedatum) VALUES (%s, %s, %s)"
            cursor.execute(sql, (voornaam, achternaam, geboortedatum))
        
        # Bij een INSERT of UPDATE moet je altijd committen, anders slaat hij niks op
        connection.commit() 
        connection.close()
        
        return jsonify({"bericht": "Patiënt succesvol toegevoegd!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# NIEUW: Route om alle sessies op te halen
@app.route('/api/sessies', methods=['GET'])
def get_sessies():
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # We maken de output wat mooier door de namen er direct bij te zoeken met een JOIN
            sql = """
                SELECT s.id, p.voornaam, p.achternaam, t.naam as therapeut, s.datum_tijd
                FROM sessies s
                JOIN patienten p ON s.patient_id = p.id
                JOIN therapeuten t ON s.therapeut_id = t.id
                ORDER BY s.datum_tijd DESC
            """
            cursor.execute(sql)
            sessies_lijst = cursor.fetchall()
        connection.close()
        return jsonify(sessies_lijst)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# NIEUW: Route om een sessie toe te voegen én puur het aantal te tellen
@app.route('/api/sessies', methods=['POST'])
def add_sessie():
    try:
        data = request.get_json()
        patient_id = data['patient_id']
        therapeut_id = data['therapeut_id']
        datum_tijd = data['datum_tijd']

        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 1. Voeg de nieuwe sessie toe aan het logboek
            sql_insert = "INSERT INTO sessies (patient_id, therapeut_id, datum_tijd) VALUES (%s, %s, %s)"
            cursor.execute(sql_insert, (patient_id, therapeut_id, datum_tijd))
            
            # 2. Tel direct het totaal aantal sessies voor deze patiënt
            sql_count = "SELECT COUNT(*) as totaal FROM sessies WHERE patient_id = %s"
            cursor.execute(sql_count, (patient_id,))
            result = cursor.fetchone()
            aantal_sessies = result['totaal']
            
        connection.commit()
        connection.close()

        # Stuur het antwoord terug met uitsluitend het kale getal
        return jsonify({
            "bericht": "Sessie succesvol geregistreerd!",
            "aantal_sessies": aantal_sessies
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)