# Camunda BPMN Engine

Location-aware workflow system: GPS-tracked workflows with WebSocket real-time tracking and geofencing.

## Setup & Start

```bash
mvn clean install
mvn spring-boot:run
```

**Access (after starting):**
- **Camunda Cockpit:** http://localhost:8082/camunda
- **GPS Tracker:** http://localhost:8082/gps.html

## Login

**Available Users:**

| User | Password | Role | Email |
|------|----------|------|-------|
| `nkhelifa` | `a` | Student | nabilmohamme.khelifa@studenti.unicam.it |
| `lmozzoni` | `a` | Tutor | luca.mozzoni@unicam.it |
| `a` | `a` | Admin | - |

## Start the GPS Process

### 1. Open Camunda Cockpit
- Go to: http://localhost:8082/camunda
- Login: `nkhelifa` / `a`

### 2. Start Process Instance
1. Click **Cockpit** → **Processes**
2. Deploy from Camunda Modeler
3. Click **Start Instance**
4. Start processes with same Business Key

### 3. Simulate Coordinate Sending (GPS Tracker)
1. Open **GPS Tracker:** http://localhost:8082/gps.html
2. **Connect to process:** User ID `nkhelifa` (matches participantId), Business Key (matches process businessKey), then **Connect**
3. **Send location (manual):** Set coordinates for a specific place
4. **Send location (automatic):** Click **Start Tracking** (server polls every 5s), use **Randomize** to simulate movement, **Stop Tracking** when done

