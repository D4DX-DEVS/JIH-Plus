# Frontend - Organization Expansion Portal

A React-based frontend application for the Organization Expansion Portal with secure authentication and form management.

## Features

- **Secure Authentication**: District-based access code login system
- **Professional Landing Page**: Modern UI with feature highlights
- **Form Management Dashboard**: View and manage form submissions
- **Responsive Design**: Works on desktop and mobile devices
- **Protected Routes**: Authentication-based route protection

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the frontend directory with the following variables:

```env
# Backend API URL (update this to match your backend server)
VITE_API_URL=http://localhost:5000
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
src/
├── pages/
│   ├── LandingPage.jsx          # Landing page with code entry
│   └── FormSubmissionPage.jsx   # Dashboard for form management
├── components/                  # Reusable UI components
├── App.jsx                     # Main app with routing
└── main.jsx                    # App entry point
```

## Authentication Flow

1. **Landing Page**: Users select their district and enter the district-specific access code
2. **District & Code Validation**: Backend validates the district and access code combination
3. **JWT Token**: Upon successful validation, a JWT token is issued with district information
4. **Dashboard Access**: Users are redirected to the form management dashboard
5. **Token Storage**: JWT token is stored in localStorage for session persistence

## API Integration

The frontend integrates with the following backend endpoints:

- `GET /api/user/districts` - Get list of available districts
- `POST /api/user/login` - User authentication with district and access code
- `GET /api/users/forms` - Retrieve user's form submissions
- `POST /api/users/forms` - Create new form submission
- `PUT /api/users/forms/:id` - Update existing form
- `DELETE /api/users/forms/:id` - Delete form submission

## Technologies Used

- **React 19** - UI framework
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client for API calls
- **Lucide React** - Icon library
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Build tool and dev server

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

The project uses ESLint for code quality. Run `npm run lint` to check for issues.

## Security Notes

- JWT tokens are stored in localStorage
- All API requests include Authorization headers
- Protected routes redirect unauthenticated users
- District-based access code validation is handled server-side

## Backend Requirements

Ensure your backend server is running and configured with:

- MongoDB connection
- JWT_SECRET environment variable
- District-based access codes (configured in backend)
- CORS enabled for frontend domain
