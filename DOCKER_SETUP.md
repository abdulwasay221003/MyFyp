# Docker Setup Guide - Health Sync

## STEP 1: Install Docker Desktop (Apne Laptop Par)

### Windows:
1. Download Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Install karo (Next, Next, Install)
3. Restart computer
4. Docker Desktop open karo aur wait karo jab tak "Docker is running" na dikhe

### Verify Installation:
```cmd
docker --version
docker-compose --version
```

---

## STEP 2: Project Folder Copy Karo

USB ya Google Drive se copy karo:
```
health-path-monitor-main
```

Apne Desktop par paste karo:
```
C:\Users\Chashma Laptop\Desktop\health-path-monitor-main
```

---

## STEP 3: Docker Start Karo (ONE COMMAND!)

Command Prompt (CMD) ya PowerShell open karo aur ye run karo:

```cmd
cd "C:\Users\Chashma Laptop\Desktop\health-path-monitor-main"
docker-compose up --build
```

**Pehli dafa 5-10 minute lagenge** (downloading images)

Jab ye dikhe toh ready hai:
```
health-sync-backend   | Starting Flask server at http://127.0.0.1:5000 ...
health-sync-frontend  | Local: http://localhost:8080/
```

---

## STEP 4: Open in Browser

- **Website:** http://localhost:8080
- **Backend API:** http://localhost:5000

---

## Common Commands

### Start Project:
```cmd
cd "C:\Users\Chashma Laptop\Desktop\health-path-monitor-main"
docker-compose up
```

### Start in Background:
```cmd
docker-compose up -d
```

### Stop Project:
```cmd
docker-compose down
```

### Rebuild (after code changes):
```cmd
docker-compose up --build
```

### See Logs:
```cmd
docker-compose logs -f
```

### See Running Containers:
```cmd
docker ps
```

---

## Troubleshooting

### "Docker daemon is not running"
- Docker Desktop open karo
- Wait for green icon in system tray

### "Port 5000 already in use"
```cmd
docker-compose down
docker-compose up
```

### "Build failed"
```cmd
docker-compose build --no-cache
docker-compose up
```

### Fresh Start (delete everything):
```cmd
docker-compose down -v --rmi all
docker-compose up --build
```

---

## Files Created for Docker

```
health-path-monitor-main/
├── Dockerfile              # Frontend image
├── docker-compose.yml      # Both services
├── .dockerignore           # Files to ignore
└── backend/
    ├── Dockerfile          # Backend image
    ├── requirements.txt    # Python packages
    └── .dockerignore       # Backend ignores
```

---

## Without Docker (Alternative)

Agar Docker nahi chahiye:

### Terminal 1 - Backend:
```cmd
cd backend
pip install -r requirements.txt
python app.py
```

### Terminal 2 - Frontend:
```cmd
npm install
npm run dev
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Start | `docker-compose up` |
| Stop | `docker-compose down` |
| Rebuild | `docker-compose up --build` |
| Logs | `docker-compose logs -f` |
| Status | `docker ps` |

---

*Docker makes transfer easy - ek command se poora project chal jayega!*
