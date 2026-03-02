import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Bookings from './pages/Bookings';
import Calendar from './pages/Calendar';
import History from './pages/History';
import RoomSummary from './pages/drills/RoomSummary';
import AvailableRooms from './pages/drills/AvailableRooms';
import BookingsToday from './pages/drills/BookingsToday';
import UpcomingBookings from './pages/drills/UpcomingBookings';
import BookingDetail from './pages/drills/BookingDetail';

import { Toaster } from 'react-hot-toast';
import Header from './components/Header';

const ProtectedRoute = ({ children }: { children: any }) => {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
  if (!isAuthenticated) return <Navigate to="/login" />;
  return (
    <div className="app-container">
      <Header />
      <div className="container">
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/rooms" element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/rooms/summary" element={<ProtectedRoute><RoomSummary /></ProtectedRoute>} />
        <Route path="/rooms/available" element={<ProtectedRoute><AvailableRooms /></ProtectedRoute>} />
        <Route path="/bookings/today" element={<ProtectedRoute><BookingsToday /></ProtectedRoute>} />
        <Route path="/bookings/upcoming" element={<ProtectedRoute><UpcomingBookings /></ProtectedRoute>} />
        <Route path="/bookings/:id" element={<ProtectedRoute><BookingDetail /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}
