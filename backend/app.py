from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import psycopg2.extras
import os
from datetime import datetime
import traceback

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://192.168.1.139:3000"}})

def get_db_connection(config):
    """Create database connection from config"""
    try:
        conn = psycopg2.connect(
            host=config['host'],
            port=config['port'],
            database=config['database'],
            user=config['username'],
            password=config['password'],
            sslmode='require' if config.get('ssl', False) else 'prefer'
        )
        return conn
    except Exception as e:
        raise Exception(f"Database connection failed: {str(e)}")

@app.route('/api/test-connection', methods=['POST'])
def test_connection():
    """Test database connection"""
    try:
        config = request.json
        conn = get_db_connection(config)
        conn.close()
        response = jsonify({"success": True})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
    except Exception as e:
        response = jsonify({"success": False, "error": str(e)}), 400
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

@app.route('/api/print-jobs', methods=['GET'])
def get_print_jobs():
    """Fetch print jobs with optional filtering"""
    try:
        config = request.headers.get('X-DB-Config')
        if not config:
            return jsonify({"error": "Database configuration required"}), 400
        
        import json
        config = json.loads(config)
        
        conn = get_db_connection(config)
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Build query with filters
        query = "SELECT * FROM print_jobs"
        params = []
        conditions = []
        
        # Add filters from query parameters
        if request.args.get('printer_name'):
            conditions.append("printer_name = %s")
            params.append(request.args.get('printer_name'))
        
        if request.args.get('filament_type'):
            conditions.append("filament_type = %s")
            params.append(request.args.get('filament_type'))
        
        if request.args.get('status'):
            conditions.append("status = %s")
            params.append(request.args.get('status'))
        
        if request.args.get('date_from'):
            conditions.append("print_start >= %s")
            params.append(float(request.args.get('date_from')))
        
        if request.args.get('date_to'):
            conditions.append("print_start <= %s")
            params.append(float(request.args.get('date_to')))
        
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        query += " ORDER BY print_start DESC"
        
        cursor.execute(query, params)
        jobs = cursor.fetchall()
        
        # Convert to list of dicts
        result = [dict(job) for job in jobs]
        
        cursor.close()
        conn.close()
        
        return jsonify({"data": result, "error": None})
        
    except Exception as e:
        return jsonify({"data": None, "error": str(e)}), 500

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    """Calculate and return metrics"""
    try:
        config = request.headers.get('X-DB-Config')
        if not config:
            return jsonify({"error": "Database configuration required"}), 400
        
        import json
        config = json.loads(config)
        
        conn = get_db_connection(config)
        cursor = conn.cursor()
        
        # Calculate metrics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_jobs,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
                SUM(CASE WHEN status IN ('cancelled', 'interrupted', 'server_exit', 'klippy_shutdown') THEN 1 ELSE 0 END) as failed_jobs,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_jobs,
                SUM(COALESCE(total_duration, 0)) as total_print_time,
                SUM(COALESCE(filament_total, 0)) as total_filament_length,
                SUM(COALESCE(filament_weight, 0)) as total_filament_weight,
                AVG(COALESCE(total_duration, 0)) as avg_print_time
            FROM print_jobs
        """)
        
        metrics = cursor.fetchone()
        
        # Get most used filament
        cursor.execute("""
            SELECT filament_type, COUNT(*) as count
            FROM print_jobs 
            WHERE filament_type IS NOT NULL AND filament_type != ''
            GROUP BY filament_type 
            ORDER BY count DESC 
            LIMIT 1
        """)
        
        most_used = cursor.fetchone()
        
        # Calculate success rate
        total_jobs = metrics[0] or 0
        completed_jobs = metrics[1] or 0
        success_rate = (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0
        
        result = {
            "totalJobs": total_jobs,
            "totalPrintTime": (metrics[4] or 0) / 60,  # Convert to minutes
            "totalFilamentLength": (metrics[5] or 0) / 1000,  # Convert to meters
            "totalFilamentWeight": metrics[6] or 0,
            "avgPrintTime": (metrics[7] or 0) / 60,  # Convert to minutes
            "successRate": round(success_rate, 1),
            "statusBreakdown": {
                "completed": metrics[1] or 0,
                "cancelled": 0,  # Will be calculated from failed_jobs
                "interrupted": 0,
                "server_exit": 0,
                "klippy_shutdown": 0,
                "in_progress": metrics[3] or 0
            },
            "mostUsedFilament": {
                "type": most_used[0] if most_used else "PLA",
                "count": most_used[1] if most_used else 0,
                "percentage": round((most_used[1] / total_jobs * 100) if most_used and total_jobs > 0 else 0, 1)
            }
        }
        
        # Get detailed status breakdown
        cursor.execute("""
            SELECT status, COUNT(*) as count
            FROM print_jobs 
            WHERE status IN ('cancelled', 'interrupted', 'server_exit', 'klippy_shutdown')
            GROUP BY status
        """)
        
        status_breakdown = cursor.fetchall()
        for status, count in status_breakdown:
            if status in result["statusBreakdown"]:
                result["statusBreakdown"][status] = count
        
        cursor.close()
        conn.close()
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/filament-types', methods=['GET'])
def get_filament_types():
    """Get unique filament types"""
    try:
        config = request.headers.get('X-DB-Config')
        if not config:
            return jsonify({"error": "Database configuration required"}), 400
        
        import json
        config = json.loads(config)
        
        conn = get_db_connection(config)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT DISTINCT filament_type 
            FROM print_jobs 
            WHERE filament_type IS NOT NULL AND filament_type != ''
            ORDER BY filament_type
        """)
        
        types = [row[0] for row in cursor.fetchall()]
        
        cursor.close()
        conn.close()
        
        return jsonify(types)
        
    except Exception as e:
        return jsonify([]), 500

@app.route('/api/printers', methods=['GET'])
def get_printers():
    """Get unique printer names"""
    try:
        config = request.headers.get('X-DB-Config')
        if not config:
            return jsonify({"error": "Database configuration required"}), 400
        
        import json
        config = json.loads(config)
        
        conn = get_db_connection(config)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT DISTINCT printer_name 
            FROM print_jobs 
            WHERE printer_name IS NOT NULL AND printer_name != ''
            ORDER BY printer_name
        """)
        
        printers = [{"name": row[0], "emoji": "🖨️"} for row in cursor.fetchall()]
        
        cursor.close()
        conn.close()
        
        return jsonify(printers)
        
    except Exception as e:
        return jsonify([]), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
