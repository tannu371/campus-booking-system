# 🏫 Campus Room & Facility Booking System

A centralized web application for booking campus facilities — classrooms, seminar halls, and meeting rooms — with real-time availability, calendar views, and admin management.

## ✨ Features

### User Features
- 🔍 Browse and search available rooms with filters
- 📅 Interactive calendar view for room availability
- 📝 Book rooms for specific time slots
- ✏️ Modify or cancel existing bookings
- ✅ Receive booking confirmations

### Admin Features
- 🏢 Manage rooms (add, edit, delete)
- ✅ Approve or reject special booking requests
- 📊 Monitor facility usage with analytics

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite) |
| Styling | Vanilla CSS (glassmorphism, gradients, animations) |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt |
| Calendar | FullCalendar.js |

## 📁 Project Structure

```
campus-booking-system/
├── frontend/           # React + Vite frontend
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Route-level pages
│   │   ├── context/    # Auth & app context
│   │   └── services/   # API helpers
│   └── package.json
├── backend/
│   ├── config/         # DB config
│   ├── middleware/      # Auth middleware
│   ├── models/         # Mongoose schemas
│   ├── routes/         # Express routes
│   ├── controllers/    # Route handlers
│   ├── server.js
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/tannu371/campus-booking-system.git
   cd campus-booking-system
   ```

2. **Backend setup**
   ```bash
   cd backend
   npm install
   # Create .env file with:
   # MONGO_URI=mongodb://localhost:27017/campus-booking
   # JWT_SECRET=your_secret_key
   # PORT=5000
   npm run dev
   ```

3. **Frontend setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser.

## 📄 License

MIT
