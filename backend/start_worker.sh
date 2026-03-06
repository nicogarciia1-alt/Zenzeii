#!/bin/bash
# Start the translation worker in the background
cd /app/backend
nohup /root/.venv/bin/python translation_worker.py > /var/log/supervisor/translation_worker.log 2>&1 &
echo "Translation worker started with PID $!"
