# Vanguard Disaster Management System — Web Client

A modern, high-performance command center web application for disaster monitoring, situational intelligence, Search and Rescue (SAR) mission coordination, logistics management, and emergency public communications.

Built with **React 18/19**, **TypeScript**, **Vite**, **TailwindCSS**, and **TanStack React Query v5**.

---

## 🌟 Key Features

- **EOC Live Command Center**: Real-time situational overview with interactive GIS maps, live KPI sparklines, dynamic network graph topology, and chronological activity feed.
- **Incident & Disaster Intelligence**: Multi-stage severity tracking (Critical, High, Medium, Low), multi-level disaster classification (District, State, Federal), sensor telemetry, and impact progression timeline.
- **Interactive GIS Mapping**: Leaflet-powered GIS mapping displaying disaster zones, SAR team locations, emergency shelters, hospitals, critical infrastructure, and road closures.
- **SAR Operations & Mission Dispatch**: Live team deployment tracking across national agencies (SMART, BOMBA, APM, PDRM, ATM), team status monitoring, and mission dispatch workflows.
- **Emergency Logistics & Resource Management**: Warehouse inventory levels, low-stock threshold triggers, multi-district resource requests, and one-click approval/rejection workflows.
- **Public Safety Broadcast Alerts**: Multi-channel emergency announcements, evacuation orders, and targeted district broadcasts.
- **Deep Analytics & Reports**: Monthly incident trends, disaster type distributions, agency response latency benchmarks, and state-by-state heatmaps.
- **Multi-Role RBAC Simulation**: Instant persona switching between Disaster Management Officer, Rescue Coordinator, Resource Manager, and Government Administrator.
- **Optimized Data Layer**: TanStack Query caching with background synchronization, sub-millisecond route transitions, and responsive dark/light theme styling.

---

## 🏗️ Project Structure

```
vanguard-frontend/
├── src/
│   ├── components/                     # Reusable UI components
│   │   ├── common/                     # StatCard, Badge, Modal, Form Controls
│   │   ├── layout/                     # Sidebar, Header, NotificationCenter
│   │   ├── map/                        # Leaflet GIS Map & custom markers
│   │   └── network/                    # Interactive SVG Network Topology Graph
│   │
│   ├── pages/                          # Feature pages & views
│   │   ├── dashboard/                  # EOC Command Center
│   │   ├── incidents/                  # Incident Intelligence & Logging
│   │   ├── operations/                 # Rescue Teams & Tactical Missions
│   │   ├── resources/                  # Inventory & Aid Requests
│   │   ├── communication/              # Public Safety Broadcasts
│   │   ├── analytics/                  # Reports & Deep Analytics
│   │   └── admin/                      # User Management & System Logs
│   │
│   ├── hooks/                          # TanStack React Query custom hooks
│   │   ├── useIncidents.ts
│   │   ├── useMissions.ts
│   │   ├── useResources.ts
│   │   ├── useAnnouncements.ts
│   │   ├── useAnalytics.ts
│   │   └── useUsers.ts
│   │
│   ├── services/                       # Axios API client & endpoint definitions
│   │   ├── apiClient.ts
│   │   └── ...
│   │
│   ├── types/                          # TypeScript interfaces & domain models
│   ├── context/                        # Auth & App State Contexts
│   ├── utils/                          # Formatting & helper utilities
│   ├── App.tsx                         # Main Router & layout shell
│   └── main.tsx                        # React Root & QueryClient setup
│
├── public/                             # Static assets & icons
├── tailwind.config.js                  # TailwindCSS theme configuration
├── vite.config.ts                      # Vite build & bundler configuration
└── package.json
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18.0.0 or higher)
- npm or pnpm or yarn

### 2. Environment Configuration
Create a `.env.development` or `.env` file in the `vanguard-frontend/` directory:

```ini
# Backend API Base URL
VITE_API_BASE_URL="http://localhost:8000/api/v1"

# Map Tile Configuration (Optional)
VITE_MAP_TILE_URL="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```

The application will be accessible at [http://localhost:5173](http://localhost:5173).

---

## 🛠️ Available Scripts

- `npm run dev`: Starts Vite local development server with Hot Module Replacement (HMR).
- `npm run build`: Compiles TypeScript and creates optimized production build in `dist/`.
- `npm run preview`: Previews the production build locally.
- `npm run lint`: Runs code quality checks and linter.

---

## 🎨 Tech Stack Highlights

- **Framework**: React (with React Router DOM v6)
- **Tooling**: Vite
- **Styling**: TailwindCSS & Lucide React Icons
- **Data Management**: TanStack React Query v5
- **Charts & Visualization**: Recharts & Framer Motion
- **Maps**: Leaflet & React-Leaflet
- **HTTP Client**: Axios with Bearer token interceptor
