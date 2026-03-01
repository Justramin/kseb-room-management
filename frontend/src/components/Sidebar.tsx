import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Calendar, DoorOpen, History } from 'lucide-react';

export function Sidebar() {
    const location = useLocation();
    const path = location.pathname;

    return (
        <aside className="sidebar">
            <Link to="/" className={path === '/' ? 'active' : ''}>
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
            </Link>
            <Link to="/bookings" className={path === '/bookings' ? 'active' : ''}>
                <ClipboardList size={20} />
                <span>Bookings</span>
            </Link>
            <Link to="/calendar" className={path === '/calendar' ? 'active' : ''}>
                <Calendar size={20} />
                <span>Calendar</span>
            </Link>
            <Link to="/rooms" className={path === '/rooms' ? 'active' : ''}>
                <DoorOpen size={20} />
                <span>Rooms</span>
            </Link>
            <Link to="/history" className={path === '/history' ? 'active' : ''}>
                <History size={20} />
                <span>History</span>
            </Link>
        </aside>
    );
}
