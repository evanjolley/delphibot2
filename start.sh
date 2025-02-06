#!/bin/bash
echo "Starting Delphi Twitter Demo..."

# Start backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py &

# Start frontend
cd ../frontend
npm install
npm run dev &

echo "Servers starting..."
echo "Frontend will be available at http://localhost:3000"