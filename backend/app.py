from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import os
import pymysql

app = Flask(__name__)
CORS(app)

# ==========================================
# DATABASE CONNECTIE
# ==========================================
def get_db_connection():
    return pymysql.connect(
        host=os.environ.get('DB_HOST', 'db'),
        user=os.environ.get('DB_USER'),
        password=os.environ.get('DB_PASSWORD'),
        database=os.environ.get('DB_NAME'),
        cursorclass=pymysql.cursors.DictCursor
    )

# ==========================================
# WEBSITE ROUTE
# ==========================================
@app.route('/')
def home():
    return render_template('index.html')

# ==========================================
# THERAPEUTEN ROUTES
# ==========================================
@app.route('/api/therapeuten', methods=['GET'])
def get_therapeuten():
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM therapeuten WHERE actief = TRUE ORDER BY voornaam, achternaam")
            therapeuten = cursor.fetchall()
        connection.close()
        return jsonify(therapeuten)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/therapeuten', methods=['POST'])
def add_therapeut():
    try:
        data = request.get_json()
        voornaam, achternaam, discipline = data['voornaam'], data['achternaam'], data['discipline']

        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("INSERT INTO therapeuten (voornaam, achternaam, discipline) VALUES (%s, %s, %s)", 
                           (voornaam, achternaam, discipline))
        connection.commit()
        connection.close()
        return jsonify({"bericht": "Therapeut succesvol toegevoegd!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/therapeuten/<int:id>', methods=['PUT'])
def update_therapeut(id):
    try:
        data = request.get_json()
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("UPDATE therapeuten SET voornaam=%s, achternaam=%s, discipline=%s WHERE id=%s", 
                           (data['voornaam'], data['achternaam'], data['discipline'], id))
        connection.commit()
        connection.close()
        return jsonify({"bericht": "Therapeut gewijzigd!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/therapeuten/<int:id>/archive', methods=['PUT'])
def archive_therapeut(id):
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("UPDATE therapeuten SET actief=FALSE WHERE id=%s", (id,))
        connection.commit()
        connection.close()
        return jsonify({"bericht": "Therapeut gearchiveerd!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# PATIËNTEN ROUTES
# ==========================================
@app.route('/api/patienten', methods=['GET'])
def get_patienten():
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM patienten WHERE actief = TRUE ORDER BY voornaam, achternaam")
            patienten = cursor.fetchall()
        connection.close()
        return jsonify(patienten)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/patienten', methods=['POST'])
def add_patient():
    try:
        data = request.get_json()
        voornaam, achternaam, geboortedatum = data['voornaam'], data['achternaam'], data['geboortedatum']

        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM patienten WHERE voornaam = %s AND achternaam = %s AND geboortedatum = %s", (voornaam, achternaam, geboortedatum))
            if cursor.fetchone():
                connection.close()
                return jsonify({"error": "Deze patiënt staat al in het systeem!"}), 400

            cursor.execute("INSERT INTO patienten (voornaam, achternaam, geboortedatum) VALUES (%s, %s, %s)", (voornaam, achternaam, geboortedatum))
        connection.commit() 
        connection.close()
        return jsonify({"bericht": "Patiënt succesvol toegevoegd!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/patienten/<int:id>', methods=['PUT'])
def update_patient(id):
    try:
        data = request.get_json()
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("UPDATE patienten SET voornaam=%s, achternaam=%s, geboortedatum=%s WHERE id=%s", 
                           (data['voornaam'], data['achternaam'], data['geboortedatum'], id))
        connection.commit()
        connection.close()
        return jsonify({"bericht": "Patiënt gewijzigd!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/patienten/<int:id>/archive', methods=['PUT'])
def archive_patient(id):
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("UPDATE patienten SET actief=FALSE WHERE id=%s", (id,))
        connection.commit()
        connection.close()
        return jsonify({"bericht": "Patiënt gearchiveerd!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# SESSIES ROUTES
# ==========================================

@app.route('/api/sessies', methods=['GET'])
def get_sessies():
    try:
        patient_id = request.args.get('patient_id')
        status = request.args.get('status')
        
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
                SELECT s.id, s.patient_id, p.voornaam, p.achternaam, 
                       CONCAT(t.voornaam, ' ', t.achternaam) as therapeut, 
                       s.datum_tijd, s.bedrag, s.betaald, s.betaalmethode
                FROM sessies s
                JOIN patienten p ON s.patient_id = p.id
                JOIN therapeuten t ON s.therapeut_id = t.id
                WHERE 1=1
            """
            params = []
            if patient_id:
                sql += " AND s.patient_id = %s"
                params.append(patient_id)
            if status == 'onbetaald':
                sql += " AND s.betaald = FALSE"
            elif status == 'betaald':
                sql += " AND s.betaald = TRUE"
                
            sql += " ORDER BY s.datum_tijd DESC"
            
            if not patient_id:
                sql += " LIMIT 20"

            cursor.execute(sql, tuple(params))
            sessies = cursor.fetchall()
        connection.close()
        return jsonify(sessies)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sessies', methods=['POST'])
def add_sessie():
    try:
        data = request.get_json()
        patient_id, therapeut_id, datum_tijd = data['patient_id'], data['therapeut_id'], data['datum_tijd']
        bedrag = data.get('bedrag', 0.00)
        status = data.get('betaal_status', 'onbetaald')
        betaald = status in ['Cash', 'Bancontact']
        betaalmethode = status if betaald else None

        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("INSERT INTO sessies (patient_id, therapeut_id, datum_tijd, bedrag, betaald, betaalmethode) VALUES (%s, %s, %s, %s, %s, %s)", 
                           (patient_id, therapeut_id, datum_tijd, bedrag, betaald, betaalmethode))
        connection.commit()
        connection.close()
        return jsonify({"bericht": "Sessie succesvol geregistreerd!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sessies/<int:sessie_id>', methods=['PUT'])
def update_sessie(sessie_id):
    try:
        data = request.get_json()
        betaalmethode = data.get('betaalmethode')
        connection = get_db_connection()
        with connection.cursor() as cursor:
            if betaalmethode == 'onbetaald':
                sql = "UPDATE sessies SET betaald = FALSE, betaalmethode = NULL WHERE id = %s"
                cursor.execute(sql, (sessie_id,))
            else:
                sql = "UPDATE sessies SET betaald = TRUE, betaalmethode = %s WHERE id = %s"
                cursor.execute(sql, (betaalmethode, sessie_id))
        connection.commit()
        connection.close()
        return jsonify({"bericht": "Status succesvol bijgewerkt!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sessies/<int:sessie_id>', methods=['DELETE'])
def delete_sessie(sessie_id):
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM sessies WHERE id = %s", (sessie_id,))
        connection.commit()
        connection.close()
        return jsonify({"bericht": "Sessie verwijderd!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)