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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)