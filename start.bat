@echo off
echo Starting Delphi Twitter Demo...

:: Start backend
cd backend
start cmd /k "python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && python main.py"

:: Start frontend
cd ../frontend
start cmd /k "npm install && npm run dev"

echo Servers starting...
echo Frontend will be available at http://localhost:3000