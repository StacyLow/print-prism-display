
from flask import Flask, request, jsonify
import psycopg2
import psycopg2.extras
import os
import time
import sys

app = Flask(__name__)

# Use environment variables for database connection
PG_CONFIG = {
    'dbname': os.getenv('POSTGRES_DB', 'mydb'),
    'user': os.getenv('POSTGRES_USER', 'myuser'),
    'password': os.getenv('POSTGRES_PASSWORD', 'mysecurepassword'),
    'host': os.getenv('POSTGRES_HOST', 'postgres'),  # Use service name by default
    'port': int(os.getenv('POSTGRES_PORT', 5432))
}

def wait_for_database(max_retries=30, delay=2):
    """Wait for database to be available with retries"""
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(**PG_CONFIG)
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            conn.close()
            print(f"Database connection successful on attempt {attempt + 1}")
            return True
        except psycopg2.Error as e:
            print(f"Database connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(delay)
            else:
                print(f"Failed to connect to database after {max_retries} attempts")
                return False
    return False

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
        cursor.execute("SELECT * FROM print_data ORDER BY print_start DESC")
        rows = cursor.fetchall()
        conn.close()
        print(f"Successfully fetched {len(rows)} print jobs")
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
    """Basic health check that doesn't require database"""
    return jsonify({"status": "ok", "service": "backend"}), 200

@app.route('/health/db', methods=['GET'])
def health_db():
    """Database health check"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        return jsonify({"status": "ok", "database": "connected"}), 200
    except Exception as e:
        print(f"Database health check failed: {e}")
        return jsonify({"status": "error", "database": "disconnected", "error": str(e)}), 503

@app.route('/test-connection', methods=['GET'])
def test_connection():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        
        # Test if print_data table exists and has data
        cursor.execute("SELECT COUNT(*) FROM print_data")
        count = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "database": "connected", 
            "print_data_count": count,
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
    
    # Wait for database to be available before starting the app
    if not wait_for_database():
        print("Could not connect to database. Exiting.")
        sys.exit(1)
    
    print("Database is ready. Starting Flask application.")
    app.run(host='0.0.0.0', port=4536, debug=True)
