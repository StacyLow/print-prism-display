
from flask import Flask, request, jsonify
import psycopg2
import psycopg2.extras
import os

app = Flask(__name__)

# Use environment variables for database connection
PG_CONFIG = {
    'dbname': os.getenv('POSTGRES_DB', 'mydb'),
    'user': os.getenv('POSTGRES_USER', 'myuser'),
    'password': os.getenv('POSTGRES_PASSWORD', 'mysecurepassword'),
    'host': os.getenv('POSTGRES_HOST', 'postgres'),  # Use service name by default
    'port': int(os.getenv('POSTGRES_PORT', 5432))
}

def get_connection():
    try:
        conn = psycopg2.connect(**PG_CONFIG)
        return conn
    except psycopg2.Error as e:
        print(f"Database connection error: {e}")
        raise

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
        print(f"Error fetching print jobs: {e}")
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
        print(f"Error executing query: {e}")
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
        result = cursor.fetchone()
        conn.close()
        return jsonify({
            "database": "connected", 
            "config": {
                "host": PG_CONFIG['host'],
                "port": PG_CONFIG['port'],
                "database": PG_CONFIG['dbname'],
                "user": PG_CONFIG['user']
            }
        }), 200
    except Exception as e:
        print(f"Database connection test failed: {e}")
        return jsonify({
            "database": "error", 
            "detail": str(e),
            "config": {
                "host": PG_CONFIG['host'],
                "port": PG_CONFIG['port'],
                "database": PG_CONFIG['dbname'],
                "user": PG_CONFIG['user']
            }
        }), 500

if __name__ == '__main__':
    print("Starting Flask app...")
    print(f"Database config: {PG_CONFIG['user']}@{PG_CONFIG['host']}:{PG_CONFIG['port']}/{PG_CONFIG['dbname']}")
    app.run(host='0.0.0.0', port=4536, debug=True)
