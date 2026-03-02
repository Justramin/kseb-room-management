import { useEffect, useState, useCallback } from 'react';
import { request } from '../api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Home, CheckCircle, XCircle, Calendar as CalendarIcon, ArrowRight, ClipboardList, Plus } from 'lucide-react';

export default function Dashboard() {
    const [stats, setStats] = useState<any>(null);
    const [availableRooms, setAvailableRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [dashboardStats, availableRoomsData] = await Promise.all([
                request('/dashboard'),
                request('/rooms/available')
            ]);
            setStats(dashboardStats);
            setAvailableRooms(availableRoomsData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // 30 seconds
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleCheckout = async (id: number) => {
        try {
            await request(`/bookings/${id}/checkout`, { method: 'PATCH' });
            toast.success('Room checked out successfully');
            fetchData();
        } catch (err: any) {
            toast.error(err.message || 'Checkout failed');
        }
    };

    if (loading && !stats) return (
        <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading your dashboard...</p>
        </div>
    );

    if (!stats) return (
        <div className="error-state">
            <XCircle size={48} color="red" />
            <p>Error loading dashboard data. Please try again.</p>
            <button onClick={() => { setLoading(true); fetchData(); }}>Retry</button>
        </div>
    );

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <h2>Dashboard Overview</h2>
                <div className="live-indicator">
                    <span className="dot"></span>
                    Live Stats
                </div>
            </div>

            <div className="grid-cards" style={{ marginBottom: '2rem' }}>
                <Link to="/rooms/summary" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-icon rooms-icon"><Home size={24} /></div>
                    <div className="stat-content">
                        <h3>Total Rooms</h3>
                        <div className="value">{stats.totalRooms}</div>
                    </div>
                </Link>
                <Link to="/rooms/available" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-icon available-icon"><CheckCircle size={24} /></div>
                    <div className="stat-content">
                        <h3>Available Today</h3>
                        <div className="value">{stats.availableRoomsCountToday}</div>
                    </div>
                </Link>
                <Link to="/bookings/today" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-icon booked-icon"><XCircle size={24} /></div>
                    <div className="stat-content">
                        <h3>Booked Today</h3>
                        <div className="value">{stats.bookedRoomsCountToday}</div>
                    </div>
                </Link>
                <Link to={stats.nextUpcomingBooking ? `/bookings/${stats.nextUpcomingBooking.id}` : '/bookings/upcoming'} className="stat-card upcoming-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-icon next-icon"><CalendarIcon size={24} /></div>
                    <div className="stat-content">
                        <h3>Next Booking</h3>
                        <div className="next-booking-info">
                            {stats.nextUpcomingBooking ? (
                                <>
                                    <div className="next-room">{stats.nextUpcomingBooking.room_name}</div>
                                    <div className="next-time">
                                        {format(new Date(stats.nextUpcomingBooking.check_in), 'dd MMM yyyy | HH:mm')}
                                    </div>
                                </>
                            ) : (
                                <div className="no-upcoming">No upcoming entries</div>
                            )}
                        </div>
                    </div>
                </Link>
            </div>

            <div className="dashboard-content-grid">
                <div className="card table-responsive">
                    <div className="card-header">
                        <h3 className="flex items-center gap-2">
                            <XCircle size={20} className="text-danger" />
                            Currently Occupied
                        </h3>
                        <Link to="/bookings" className="view-all-link">New Check-in <Plus size={16} /></Link>
                    </div>
                    {!stats.currentlyBookedRooms || stats.currentlyBookedRooms.length === 0 ? (
                        <div className="empty-state-compact">
                            <CheckCircle size={32} className="text-success" />
                            <p>All rooms are currently vacant.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Room Name</th>
                                    <th>Guest</th>
                                    <th>Check-in</th>
                                    <th style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.currentlyBookedRooms.map((booking: any) => (
                                    <tr key={booking.id}>
                                        <td style={{ fontWeight: 600 }}>{booking.room_name}</td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{booking.person_name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{booking.phone}</div>
                                        </td>
                                        <td>{format(new Date(booking.check_in), 'dd MMM yyyy | HH:mm')}</td>
                                        <td>
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => handleCheckout(booking.id)}
                                                    className="btn-danger"
                                                    style={{ padding: '4px 12px', fontSize: '0.85rem' }}
                                                >
                                                    Checkout
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="card table-responsive">
                    <div className="card-header">
                        <h3 className="flex items-center gap-2">
                            <CheckCircle size={20} className="text-success" />
                            Available Rooms
                        </h3>
                        <Link to="/rooms" className="view-all-link">Manage Rooms <ArrowRight size={16} /></Link>
                    </div>
                    {availableRooms.length === 0 ? (
                        <div className="empty-state-compact">
                            <ClipboardList size={32} />
                            <p>No rooms are currently available.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Room Name</th>
                                    <th>Capacity</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {availableRooms.map((room: any) => (
                                    <tr key={room.id}>
                                        <td style={{ fontWeight: 600 }}>{room.name}</td>
                                        <td>{room.capacity} Persons</td>
                                        <td>
                                            <div className="flex justify-end">
                                                <Link
                                                    to={`/bookings?room=${room.id}`}
                                                    className="btn-primary"
                                                    style={{ padding: '4px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <Plus size={14} /> Check-in
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
