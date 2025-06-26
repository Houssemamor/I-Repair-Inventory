# LCD Amin Project Setup (No venv)

## Requirements
- Python 3.x (system-wide, not a virtual environment)
- Packages: flask, openpyxl

## Install dependencies globally
Open PowerShell and run:

    python -m pip install flask openpyxl

## Running the App
From your project directory, run:

    python app.py

## Notes
- You do NOT need to create or activate a virtual environment.
- If you previously created a `.venv` folder, you can delete it:

      Remove-Item -Recurse -Force .venv

- All dependencies will be installed globally for your system Python.
