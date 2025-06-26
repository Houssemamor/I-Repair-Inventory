from flask import Flask, g, render_template, request, jsonify
import sqlite3

app = Flask(__name__)
DATABASE = 'inventory.db'

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
        model TEXT UNIQUE,
        buy_price REAL DEFAULT 0.0,
        sell_price REAL DEFAULT 0.0,
        quantity INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS battery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        manufacturer TEXT,
        model TEXT UNIQUE,
        buy_price REAL DEFAULT 0.0,
        sell_price REAL DEFAULT 0.0,
        quantity INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS back (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        manufacturer TEXT,
        model TEXT UNIQUE,
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
