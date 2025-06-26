# I-Repair Inventory Management

A simple inventory management system for LCDs, batteries, and backs, built with Flask and SQLite. Includes CSV import/export, dark mode, and automatic database backups.

## Features
- Manage inventory for LCDs, batteries, and backs
- Add, edit, delete, and search items
- Import/export inventory as CSV
- Toggle buy price visibility (password protected)
- Dark mode support
- Automatic database backups every 5 minutes (max 10 backups)

## Requirements
- Python 3.x
- Flask
- openpyxl

## Installation
Install dependencies globally (no virtual environment required):

```powershell
python -m pip install flask openpyxl
```

## Usage
Run the app from your project directory:

```powershell
python app.py
```

Then open your browser and go to: [http://localhost:5000](http://localhost:5000)

## Notes
- No need to create or activate a virtual environment.
- If you previously created a `.venv` folder, you can delete it:
  ```powershell
  Remove-Item -Recurse -Force .venv
  ```
- All dependencies are installed globally for your system Python.
- Backups are stored in the `backups/` folder and rotated automatically.

## License
This project is provided as-is for educational and internal use.
