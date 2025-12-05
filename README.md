# Safety Observer Pro

A comprehensive full-stack safety observation tracking application for Saudi Safety Group (Aramco CAT Project). Designed for field safety officers in construction/industrial environments.

![Version](https://img.shields.io/badge/version-3.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![License](https://img.shields.io/badge/license-Proprietary-red)

## Features

- **Safety Observations** - Track and manage safety observations with photo evidence
- **Work Permits** - Digital permit management system
- **Heavy Equipment** - Equipment registry with inspection tracking
- **Incident Reporting** - Log incidents and near-misses
- **PDF Export** - Export reports with company logo and photos
- **Multi-Language** - English, Arabic, and Urdu with RTL support
- **Emergency Contacts** - Quick-dial emergency numbers
- **Daily Inspections** - Checklist-based inspections
- **Shift Handovers** - Digital shift handover notes
- **Contractor Sign-In** - Track contractor access
- **Analytics Dashboard** - Visual safety metrics

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **PDF**: jsPDF + jsPDF-AutoTable
- **Charts**: Chart.js
- **Icons**: Font Awesome 6

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/safety-observer-pro.git
cd safety-observer-pro
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env file
cp .env.example .env

# Edit .env with your database credentials
DATABASE_URL=postgresql://username:password@host:5432/database
PORT=5000
```

4. Start the server:
```bash
npm start
```

5. Open your browser and navigate to `http://localhost:5000`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `PORT` | Server port | 5000 |

## Project Structure

```
.
├── server/
│   ├── index.js          # Express server entry point
│   ├── db.js             # Database connection & schema
│   ├── routes.js         # API endpoints
│   └── upload.js         # File upload handling
├── public/
│   ├── index.html        # Main HTML
│   ├── css/styles.css    # Styling
│   ├── js/
│   │   ├── app.js        # Application logic
│   │   └── translations.js
│   └── img/              # Static images
├── uploads/              # Uploaded evidence photos
├── package.json
└── README.md
```

## API Endpoints

### Core
- `GET/POST /api/observations` - Safety observations
- `GET/POST /api/permits` - Work permits
- `GET/POST /api/equipment` - Heavy equipment
- `GET/POST /api/incidents` - Incident reports
- `GET /api/stats` - Dashboard statistics

### Operations
- `GET/POST /api/inspections` - Daily inspections
- `GET/POST /api/handovers` - Shift handovers
- `GET/POST /api/contractors` - Contractor sign-in
- `GET/POST /api/certifications` - Training records

### Auth
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

## Default Login

- **Employee ID**: `ADMIN001`
- **Password**: `admin123`

## Color Code System

Monthly scaffold inspection color rotation:
- **Green**: January, May, September
- **Red**: February, June, October
- **Blue**: March, July, November
- **Yellow**: April, August, December

## Screenshots

The application features a modern, mobile-first design with:
- Dashboard with KPI cards
- Color-coded risk levels
- Photo evidence gallery
- PDF export with logo


## Deploying to Render.com

1. Push this project to a GitHub repository (for example, `safety-project-v6`).
2. In the Render dashboard, create a **PostgreSQL** database and copy its **Internal Database URL** (it will look like `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`).
3. In Render, create a new **Web Service** connected to your GitHub repo:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Under the service **Environment** settings, add:
   - `DATABASE_URL` = the internal database URL from step 2.
5. Deploy the service. Render will install dependencies and start `server/index.js`. Your Safety Observer Pro webapp will be available at your Render URL.

> This reflects general deployment best practice. Always double-check your database credentials, security settings, and company policies before using this app for real safety operations.


## Contributing

This is a proprietary project for Saudi Safety Group. For inquiries, contact:
- **Email**: Catproject404@gmail.com

## License

Proprietary - Saudi Safety Group (CAT Project)

## Credits

- **Developer**: Abdulrahman Alanazi [8222802]
- **Supervisor**: Abdullah Alkaluf [8230855]
- **Organization**: Saudi Safety Group
