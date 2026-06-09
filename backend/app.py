from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import pymysql

app = Flask(__name__)
CORS(app)

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
            cursor.execute("SELECT * FROM patienten ORDER BY achternaam, voornaam")
            patienten_lijst = cursor.fetchall()
        connection.close()
        return jsonify(patienten_lijst)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Route om een nieuwe patiënt toe te voegen
@app.route('/api/patienten', methods=['POST'])
def add_patient():
    try:
        data = request.get_json()
        voornaam = data['voornaam']
        achternaam = data['achternaam']
        geboortedatum = data['geboortedatum']

        connection = get_db_connection()
        with connection.cursor() as cursor:
            # CHECK: Bestaat deze patiënt al?
            cursor.execute(
                "SELECT id FROM patienten WHERE voornaam = %s AND achternaam = %s AND geboortedatum = %s", 
                (voornaam, achternaam, geboortedatum)
            )
            if cursor.fetchone():
                connection.close()
                return jsonify({"error": "Deze patiënt staat al in het systeem!"}), 400

            # Zo niet, voeg toe
            sql = "INSERT INTO patienten (voornaam, achternaam, geboortedatum) VALUES (%s, %s, %s)"
            cursor.execute(sql, (voornaam, achternaam, geboortedatum))
        
        connection.commit() 
        connection.close()
        
        return jsonify({"bericht": "Patiënt succesvol toegevoegd!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Route om alle sessies op te halen
@app.route('/api/sessies', methods=['GET'])
def get_sessies():
    try:
        patient_id = request.args.get('patient_id')
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # We halen nu ook de betaalmethode op
            sql = """
                SELECT s.id, s.patient_id, p.voornaam, p.achternaam, t.naam as therapeut, 
                       s.datum_tijd, s.bedrag, s.betaald, s.betaalmethode
                FROM sessies s
                JOIN patienten p ON s.patient_id = p.id
                JOIN therapeuten t ON s.therapeut_id = t.id
            """
            if patient_id:
                sql += " WHERE s.patient_id = %s ORDER BY s.datum_tijd DESC"
                cursor.execute(sql, (patient_id,))
            else:
                sql += " ORDER BY s.datum_tijd DESC"
                cursor.execute(sql)
                
            sessies_lijst = cursor.fetchall()
        connection.close()
        return jsonify(sessies_lijst)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sessies', methods=['POST'])
def add_sessie():
    try:
        data = request.get_json()
        patient_id = data['patient_id']
        therapeut_id = data['therapeut_id']
        datum_tijd = data['datum_tijd']
        bedrag = data.get('bedrag', 0.00)
        
        # We kijken of de status onbetaald, Cash of Bancontact is
        status = data.get('betaal_status', 'onbetaald')
        betaald = status in ['Cash', 'Bancontact']
        betaalmethode = status if betaald else None

        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql_insert = "INSERT INTO sessies (patient_id, therapeut_id, datum_tijd, bedrag, betaald, betaalmethode) VALUES (%s, %s, %s, %s, %s, %s)"
            cursor.execute(sql_insert, (patient_id, therapeut_id, datum_tijd, bedrag, betaald, betaalmethode))
            
            sql_count = "SELECT COUNT(*) as totaal FROM sessies WHERE patient_id = %s"
            cursor.execute(sql_count, (patient_id,))
            aantal_sessies = cursor.fetchone()['totaal']
            
        connection.commit()
        connection.close()

        return jsonify({"bericht": "Sessie succesvol geregistreerd!", "aantal_sessies": aantal_sessies}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# NIEUW: Route om een onbetaalde sessie achteraf te updaten naar betaald
@app.route('/api/sessies/<int:sessie_id>', methods=['PUT'])
def update_sessie(sessie_id):
    try:
        data = request.get_json()
        betaalmethode = data.get('betaalmethode') # Verwacht 'Cash' of 'Bancontact'

        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = "UPDATE sessies SET betaald = TRUE, betaalmethode = %s WHERE id = %s"
            cursor.execute(sql, (betaalmethode, sessie_id))
            
        connection.commit()
        connection.close()
        return jsonify({"bericht": "Betaling succesvol verwerkt!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)