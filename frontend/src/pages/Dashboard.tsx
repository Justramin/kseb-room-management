import { useEffect, useState, useCallback } from 'react';
import { request } from '../api';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Home, CheckCircle, XCircle, Calendar as CalendarIcon, ArrowRight, ClipboardList } from 'lucide-react';

export default function Dashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const dashboardData = await request('/dashboard');
            setData(dashboardData);
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

    if (loading && !data) return (
        <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading your dashboard...</p>
        </div>
    );

    if (!data) return (
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
                        <div className="value">{data.totalRooms}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon available-icon"><CheckCircle size={24} /></div>
                    <div className="stat-content">
                        <h3>Available Today</h3>
                        <div className="value">{data.availableRoomsCountToday}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon booked-icon"><XCircle size={24} /></div>
                    <div className="stat-content">
                        <h3>Booked Today</h3>
                        <div className="value">{data.bookedRoomsCountToday}</div>
                    </div>
                </div>
                <div className="stat-card upcoming-card">
                    <div className="stat-icon next-icon"><CalendarIcon size={24} /></div>
                    <div className="stat-content">
                        <h3>Next Booking</h3>
                        <div className="next-booking-info">
                            {data.nextUpcomingBooking ? (
                                <>
                                    <div className="next-room">{data.nextUpcomingBooking.room_name}</div>
                                    <div className="next-time">{format(new Date(data.nextUpcomingBooking.check_in), 'MMM dd, p')}</div>
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
                        <h3>Currently Occupied Rooms</h3>
                        <Link to="/bookings" className="view-all-link">View All Bookings <ArrowRight size={16} /></Link>
                    </div>
                    {data.currentlyBookedRooms && data.currentlyBookedRooms.length === 0 ? (
                        <div className="empty-state-compact">
                            <ClipboardList size={32} />
                            <p>No rooms are currently occupied.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Room Name</th>
                                    <th>Guest Name</th>
                                    <th>Check-out Time</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.currentlyBookedRooms?.map((b: any) => (
                                    <tr key={b.id}>
                                        <td>{b.room_name}</td>
                                        <td>{b.person_name}</td>
                                        <td>{format(new Date(b.check_out), 'PP p')}</td>
                                        <td><span className="status-badge occupied">Occupied</span></td>
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
