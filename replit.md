# Safety Observer Pro

## Overview
A comprehensive full-stack safety observation tracking application for Saudi Safety Group (Aramco CAT Project). Features complete gamification system to encourage safety compliance, multi-language support, incident reporting, inspection checklists, contractor management, and analytics dashboard. Designed for field safety officers in construction/industrial environments.

## Project Information
- **Developer**: Abdulrahman Alanazi [8222802]
- **Supervisor**: Abdullah Alkaluf [8230855]
- **Organization**: Saudi Safety Group (CAT Project)
- **Contact**: Catproject404@gmail.com
- **Version**: 3.0.0

## Project Structure
```
.
├── server/
│   ├── index.js          # Express server entry point
│   ├── db.js             # PostgreSQL database connection & 15+ table schema
│   ├── routes.js         # 40+ REST API endpoints
│   └── upload.js         # File upload handling with multer
├── public/
│   ├── index.html        # Main HTML with all UI components
│   ├── css/
│   │   └── styles.css    # 2000+ lines of modern CSS with gamification styles
│   ├── js/
│   │   ├── app.js        # Main application logic (gamification, forms, etc)
│   │   └── translations.js  # i18n translations (English, Arabic, Urdu)
│   └── img/
│       └── CAT.jpeg      # Company logo
├── uploads/              # Uploaded evidence photos
├── package.json          # Node.js dependencies
└── replit.md            # This file
```

## Technology Stack
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL (Replit hosted, 15+ tables)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Charting**: Chart.js for analytics
- **Styling**: CSS Variables for theming (dark/light mode)
- **Icons**: Font Awesome 6

## Database Schema (15+ Tables)
### Core Tables
- **observations**: Safety observations with risk levels, causes, corrective actions
- **permits**: Work permits with types, areas, descriptions
- **equipment**: Heavy equipment registry with inspection dates
- **incidents**: Incident/near-miss reports with severity levels

### Gamification Tables
- **users**: User accounts with roles (admin/safety_officer/supervisor/worker)
- **points_events**: Point transactions history
- **badges**: Available badges (First Observer, Safety Champion, etc)
- **user_badges**: Earned badges per user
- **achievements**: Achievement milestones
- **daily_challenges**: Daily challenges with photo requirements
- **user_challenges**: User challenge completions
- **employee_awards**: Monthly/yearly safety awards

### Operations Tables
- **news**: Announcements and alerts
- **inspection_templates**: Checklist templates
- **inspection_results**: Completed inspections
- **shift_handovers**: Shift handover notes
- **certifications**: Training and certification tracking
- **contractor_signins**: Contractor visitor log

## API Endpoints (40+)
### Core Operations
- `GET/POST /api/observations` - Observations CRUD
- `GET/POST /api/permits` - Permits CRUD
- `GET/POST /api/equipment` - Equipment CRUD
- `GET/POST /api/incidents` - Incident reports
- `GET /api/stats` - Dashboard statistics with alerts
- `GET /api/areas` - All unique areas
- `POST /api/upload` - Photo upload (max 5, 10MB each)

### Gamification
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/leaderboard` - Rankings (monthly/all-time)
- `GET /api/challenges` - Daily challenges
- `POST /api/challenges/complete` - Complete challenge with evidence
- `GET /api/badges` - Available badges
- `GET /api/users/:id/badges` - User's earned badges
- `GET /api/employee-of-month` - Current top performer

### Operations
- `GET/POST /api/inspections` - Daily checklists
- `GET /api/inspection-templates` - Checklist templates
- `GET/POST /api/handovers` - Shift handovers
- `GET/POST /api/contractors` - Contractor sign-in/out
- `GET/POST /api/certifications` - Training records
- `GET /api/news` - Announcements
- `GET /api/analytics/*` - Analytics data

## Key Features

### 1. Home Dashboard
- Monthly color code banner (Green/Red/Blue/Yellow)
- News/Alert slider for urgent messages
- Employee of the Month showcase
- 4 KPI cards (Observations, Permits, Equipment, Open Incidents)
- Daily Challenges preview with points
- Top Performers leaderboard mini-view
- Alerts for expiring certifications/inspections
- Quick action buttons for common tasks

### 2. Gamification System
- **Points System**: Earn points for safety activities
  - Observations: 10 pts
  - Permits: 8 pts
  - Inspections: 8 pts
  - Toolbox Talks: 12 pts
  - Challenges: 10-20 pts (bonus)
- **Level Progression**: Bronze → Silver → Gold → Platinum
- **Day Streak**: Consecutive days of activity
- **Daily Challenges**: 5 challenges per day requiring photo evidence
- **Badges**: Unlock for achievements (First Observer, Safety Champion, etc)
- **Leaderboard**: Monthly and all-time rankings
- **Safety Employee of the Month**: Top performer recognition

### 3. Observations Tab
- Add observations with photo evidence
- Filter by area, status, risk level
- Risk level badges (High/Medium/Low)
- Points awarded on submission (+10 pts)

### 4. Permits Tab
- Add work permits with details
- Filter by area, permit type
- Points awarded on submission (+8 pts)

### 5. Incidents Tab
- Report incidents and near-misses
- Severity levels: Critical/Major/Minor/Near-Miss
- Photo evidence support
- Status tracking (Open/Under Investigation/Closed)

### 6. Inspections Tab
- Daily inspection checklists
- Multiple templates available
- Pass/Partial/Fail status
- Points awarded on completion (+8 pts)

### 7. Shift Handovers
- Create handover notes between shifts
- Track pending tasks and safety concerns
- Acknowledgment tracking

### 8. Contractor Sign-In
- Sign in/out contractors
- Track on-site count
- Safety briefing verification
- PPE verification checkbox

### 9. Certifications
- Track training and certifications
- Expiry date monitoring
- Filter expiring certifications

### 10. Analytics Dashboard
- Observations trend chart
- Risk level breakdown (pie chart)
- Top causes analysis

### 11. Library Tab
- TBT (Toolbox Talk) documents
- JSA (Job Safety Analysis) documents
- CSM (Contractor Safety Manual) documents

### 12. Tools Tab
- Risk Matrix viewer
- GPS Location sharing
- Emergency Procedures
- Weather information
- Monthly Color Code reference
- Safety Responsibilities

### 13. Settings
- Language switcher (English/Arabic/Urdu)
- Theme toggle (Light/Dark)
- Admin tools (for admin users)

### 14. Multi-Language Support
- Full i18n support (English, Arabic, Urdu)
- RTL layout for Arabic and Urdu
- All UI elements translated

## Running the App
```bash
npm run dev
```
Server runs on http://0.0.0.0:5000

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `PORT` - Server port (defaults to 5000)

## Default Login (Admin)
- Employee ID: `ADMIN001`
- Password: `admin123`

## Color Code System
Monthly rotating scaffold inspection colors:
- **Green**: January, May, September
- **Red**: February, June, October
- **Blue**: March, July, November
- **Yellow**: April, August, December

## Recent Changes
- **2025-12-05**: Navigation & UI Enhancement
  - Added logout button to header (red door icon)
  - Updated navigation tabs: Home, Observe, Permits, Equipment, More
  - Removed Ranking/Challenges tabs for professional focus
  - PDF exports now include CAT Project logo on all pages
  - Observation PDF includes photo evidence gallery
  - Added parseEvidenceUrls helper for robust URL parsing

- **2025-12-05**: Professional Features Enhancement
  - PDF Export functionality (jsPDF + autotable)
    - Export observations to PDF with logo and photos
    - Export permits to PDF with logo
    - Export dashboard report to PDF with logo
  - Google Sheets data import (264 observations, 11 permits)
  - Clickable photo evidence with full-screen lightbox
  - Emergency contacts grid on home page with click-to-call
  - Fixed evidence_urls JSON parsing for frontend display
  - Export buttons added to Observations and Permits tabs

- **2025-12-05**: Complete Gamification System
  - User authentication (login/register)
  - Points system with level progression
  - Daily challenges with photo evidence
  - Badges and achievements
  - Leaderboard (monthly/all-time)
  - Safety Employee of the Month
  - Profile page with stats
  - News/announcements system
  - Incident reporting
  - Daily inspection checklists
  - Shift handover notes
  - Contractor sign-in/out
  - Certifications tracking
  - Analytics dashboard with charts
  - Points bar in header
  - 15+ new database tables
  - 40+ new API endpoints

- **2025-12-05**: Complete i18n Localization
  - Full multi-language support
  - RTL layout support
  - All UI elements translated

- **2025-12-05**: Complete Architecture Rebuild
  - Migrated from Google Sheets to PostgreSQL
  - Full-stack Node.js/Express backend
  - Modern professional UI

## Notes
- Data stored in PostgreSQL database
- Photo evidence uploaded to server
- Mobile-first responsive design
- Works offline for viewing (PWA planned)
- Designed for Aramco construction sites
