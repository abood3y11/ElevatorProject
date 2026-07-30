# Elevator Management System (ELMS)

## Overview
ELMS is a comprehensive elevator management system that provides a unified platform for managing the entire lifecycle of elevators. It includes modules for customer management, site management, elevator asset management, maintenance planning and tracking, work order management, installation project tracking, compliance management, and reporting & analytics. The system also includes portals for clients, admins, and workers.

## Project Structure
    ELMS/
    ├── backend/                # FastAPI Backend (Python)
    ├── AdminPortal/            # React Admin Dashboard (TypeScript)
    ├── mobile-worker/          # React Native Mobile App (TypeScript)
    ├── shared/                 # Shared Types & Utilities (TypeScript)
    ├── scripts/                # Deployment & Utility Scripts
    ├── docs/                   # Documentation & Analysis
    └── .gitignore              # Git ignore file

## Getting Started

### Clone the Repository
```bash
git clone https://github.com/your-username/elevator-management-system.git
cd elevator-management-system
```

### Prerequisites



### Installation
backend:
```bash
cd backend
python -m pip install -r requirements.txt
```

AdminPortal:
```bash
cd AdminPortal
npm install
```

mobile-worker:
```bash
cd mobile-worker
npm install
```


### Running the Project

Windows local launcher:
```bat
ELMS-Setup-Local-Windows.cmd
ELMS-Launcher.cmd
```

Create a local Windows executable launcher:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\windows\build-elms-launcher.ps1
dist\ELMS-Launcher.exe
```

The Windows launcher uses the local `python` command directly for the backend.
It does not create or activate a backend virtual environment.

```bash
docker-compose up -d

docker-compose up -d --build

docker-compose up -d --build --force-recreate

docker compose logs -f backend

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

npm run dev
```
    
### Deployment

### Contributing

