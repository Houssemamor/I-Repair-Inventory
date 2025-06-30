from flask import Flask, g, render_template, request, jsonify
import sqlite3
import os
import shutil
import threading
import time
import hashlib
from datetime import datetime

app = Flask(__name__)
DATABASE = 'inventory.db'

BACKUP_DIR = os.path.join(os.path.dirname(__file__), 'backups')
DB_PATH = os.path.join(os.path.dirname(__file__), DATABASE)
MAX_BACKUPS = 10
BACKUP_INTERVAL_SECONDS = 5 * 60  # 5 minutes

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db:
        db.close()

def init_db():
    conn = sqlite3.connect(DATABASE)
    conn.executescript('''
    CREATE TABLE IF NOT EXISTS lcd (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        manufacturer TEXT,
        model TEXT,
        buy_price REAL DEFAULT 0.0,
        sell_price REAL DEFAULT 0.0,
        quantity INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS battery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        manufacturer TEXT,
        model TEXT,
        buy_price REAL DEFAULT 0.0,
        sell_price REAL DEFAULT 0.0,
        quantity INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS back (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        manufacturer TEXT,
        model TEXT,
        buy_price REAL DEFAULT 0.0,
        sell_price REAL DEFAULT 0.0,
        quantity INTEGER DEFAULT 0
    );
    ''')
    conn.close()

@app.route('/')
def index():
    return render_template('index.html')

def handle_inventory(category):
    table = category
    db = get_db()
    if request.method == 'GET':
        rows = db.execute(f'SELECT * FROM {table}').fetchall()
        return jsonify([dict(row) for row in rows])
    data = request.json
    cur = db.execute(
        f'INSERT INTO {table} (manufacturer, model, buy_price, sell_price, quantity) VALUES (?, ?, ?, ?, ?)',
        (data['manufacturer'], data['model'], data['buy_price'], data.get('sell_price', 0.0), data['quantity'])
    )
    db.commit()
    new_id = cur.lastrowid
    row = db.execute(f'SELECT * FROM {table} WHERE id = ?', (new_id,)).fetchone()
    return jsonify(dict(row)), 201

def secure_inventory(category):
    table = category
    data = request.get_json()
    if data.get('password') != '1994':
        return jsonify({'error': 'Unauthorized'}), 403
    db = get_db()
    rows = db.execute(f'SELECT * FROM {table}').fetchall()
    return jsonify([dict(row) for row in rows])

def update_or_delete_item(category, id):
    table = category
    db = get_db()
    if request.method == 'PUT':
        data = request.json
        row = db.execute(f'SELECT * FROM {table} WHERE id = ?', (id,)).fetchone()
        if not row:
            return jsonify({'error': 'Not found'}), 404
        db.execute(
            f'UPDATE {table} SET manufacturer=?, model=?, buy_price=?, sell_price=?, quantity=? WHERE id=?',
            (data['manufacturer'], data['model'], data['buy_price'], data.get('sell_price', 0.0), data['quantity'], id)
        )
        db.commit()
        updated_row = db.execute(f'SELECT * FROM {table} WHERE id = ?', (id,)).fetchone()
        return jsonify(dict(updated_row))
    db.execute(f'DELETE FROM {table} WHERE id = ?', (id,))
    db.commit()
    return ('', 204)

def create_backup():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    # Read the database file and hash its contents
    with open(DB_PATH, 'rb') as f:
        db_bytes = f.read()
        db_hash = hashlib.sha256(db_bytes).hexdigest()[:16]
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_filename = f'inventory_backup_{timestamp}_{db_hash}.db'
    dst = os.path.join(BACKUP_DIR, backup_filename)
    # Only create backup if a file with this hash does not already exist
    if not any(db_hash in fname for fname in os.listdir(BACKUP_DIR)):
        with open(dst, 'wb') as out:
            out.write(db_bytes)
    # Remove old backups if more than MAX_BACKUPS
    backups = sorted([f for f in os.listdir(BACKUP_DIR) if f.startswith('inventory_backup_') and f.endswith('.db')])
    while len(backups) > MAX_BACKUPS:
        os.remove(os.path.join(BACKUP_DIR, backups.pop(0)))

def backup_scheduler():
    while True:
        time.sleep(BACKUP_INTERVAL_SECONDS)
        create_backup()

def start_backup_thread():
    # Create a backup at launch
    create_backup()
    # Start background thread for periodic backups
    t = threading.Thread(target=backup_scheduler, daemon=True)
    t.start()

# Call backup thread starter at app startup
start_backup_thread()

# Register unique view functions
for cat in ['lcd', 'battery', 'back']:
    def make_handler(c):
        return lambda: handle_inventory(c)

    def make_secure(c):
        return lambda: secure_inventory(c)

    def make_update_delete(c):
        return lambda id: update_or_delete_item(c, id)

    app.add_url_rule(f'/api/{cat}s', endpoint=f'{cat}_list', view_func=make_handler(cat), methods=['GET', 'POST'])
    app.add_url_rule(f'/api/{cat}s/secure', endpoint=f'{cat}_secure', view_func=make_secure(cat), methods=['POST'])
    app.add_url_rule(f'/api/{cat}s/<int:id>', endpoint=f'{cat}_item', view_func=make_update_delete(cat), methods=['PUT', 'DELETE'])

if __name__ == '__main__':
    init_db()
    app.run(debug=False)
