import { useEffect, useState, useCallback } from 'react';
import { request } from '../api';
import { Link } from 'react-router-dom';
import { Home, CheckCircle, XCircle, Calendar as CalendarIcon, ArrowRight, ClipboardList, MapPin, Users } from 'lucide-react';

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
                <div className="stat-card">
                    <div className="stat-icon rooms-icon"><Home size={24} /></div>
                    <div className="stat-content">
                        <h3>Total Rooms</h3>
                        <div className="value">{stats.totalRooms}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon available-icon"><CheckCircle size={24} /></div>
                    <div className="stat-content">
                        <h3>Available Today</h3>
                        <div className="value">{stats.availableRoomsCountToday}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon booked-icon"><XCircle size={24} /></div>
                    <div className="stat-content">
                        <h3>Booked Today</h3>
                        <div className="value">{stats.bookedRoomsCountToday}</div>
                    </div>
                </div>
                <div className="stat-card upcoming-card">
                    <div className="stat-icon next-icon"><CalendarIcon size={24} /></div>
                    <div className="stat-content">
                        <h3>Next Booking</h3>
                        <div className="next-booking-info">
                            {stats.nextUpcomingBooking ? (
                                <>
                                    <div className="next-room">{stats.nextUpcomingBooking.room_name}</div>
                                    <div className="next-time">
                                        {new Date(stats.nextUpcomingBooking.check_in).toLocaleDateString()} at {new Date(stats.nextUpcomingBooking.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </>
                            ) : (
                                <div className="no-upcoming">No upcoming bookings</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-content-grid">
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
                                    <th>Location</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {availableRooms.map((room: any) => (
                                    <tr key={room.id}>
                                        <td style={{ fontWeight: 600 }}>{room.name}</td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <Users size={14} className="text-muted" />
                                                {room.capacity} Persons
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <MapPin size={14} className="text-muted" />
                                                {room.location || 'Not Specified'}
                                            </div>
                                        </td>
                                        <td><span className="status-badge available">Available</span></td>
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
