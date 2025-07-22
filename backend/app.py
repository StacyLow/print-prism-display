from flask import Flask, request, jsonify
import psycopg2
import psycopg2.extras
import os

app = Flask(__name__)

# Update with your Postgres connection info
PG_CONFIG = {
    'dbname': 'mydb',
    'user': 'myuser',
    'password': 'mysecurepassword',
    'host': 'localhost',
    'port': 5432
}

def get_connection():
    return psycopg2.connect(**PG_CONFIG)

@app.route('/api/print-jobs', methods=['GET'])
def get_print_jobs():
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute("SELECT * FROM print_data")
        rows = cursor.fetchall()
        conn.close()
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/query', methods=['POST'])
def run_query():
    sql = request.json.get('query', '')
    if not sql.strip().lower().startswith('select'):
        return jsonify({"error": "Only SELECT queries are allowed."}), 400
    try:
        conn = get_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(sql)
        rows = cursor.fetchall()
        conn.close()
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200

@app.route('/test-connection', methods=['GET'])
def test_connection():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        conn.close()
        return jsonify({"database": "connected"}), 200
    except Exception as e:
        return jsonify({"database": "error", "detail": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=4536)