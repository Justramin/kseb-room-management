import { useEffect, useState, useCallback } from 'react';
import { request } from '../api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Home, CheckCircle, XCircle, Building2 } from 'lucide-react';

export default function Dashboard() {
    const [stats, setStats] = useState<any>(null);
    const [availableRooms, setAvailableRooms] = useState<any[]>([]);
    const [availableHalls, setAvailableHalls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [dashboardStats, availableRoomsData, availableHallsData] = await Promise.all([
                request('/dashboard'),
                request('/rooms/availability'),
                request('/halls/availability')
            ]);
            setStats(dashboardStats);
            setAvailableRooms(availableRoomsData.filter((r: any) => r.status === 'Available'));
            setAvailableHalls(availableHallsData.filter((h: any) => h.status === 'Available'));
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

    const handleCheckout = async (id: number, type: 'room' | 'hall') => {
        try {
            const endpoint = type === 'room' ? `/bookings/${id}/checkout` : `/halls/bookings/${id}/checkout`;
            await request(endpoint, { method: 'PATCH' });
            toast.success(`${type === 'room' ? 'Room' : 'Hall'} checked out successfully`);
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

            {/* Room Metrics */}
            <div style={{ marginBottom: '1rem' }}>
                <h3 className="flex items-center gap-2 mb-4" style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
                    <Home size={18} /> ROOM METRICS
                </h3>
                <div className="grid-cards">
                    <Link to="/rooms" className="stat-card">
                        <div className="stat-icon rooms-icon"><Home size={24} /></div>
                        <div className="stat-content">
                            <h3>Total Rooms</h3>
                            <div className="value">{stats.rooms.totalRooms}</div>
                        </div>
                    </Link>
                    <Link to="/rooms" className="stat-card">
                        <div className="stat-icon available-icon"><CheckCircle size={24} /></div>
                        <div className="stat-content">
                            <h3>Available Rooms</h3>
                            <div className="value">{stats.rooms.availableRoomsCountToday}</div>
                        </div>
                    </Link>
                    <div className="stat-card">
                        <div className="stat-icon booked-icon"><XCircle size={24} /></div>
                        <div className="stat-content">
                            <h3>Occupied Rooms</h3>
                            <div className="value">{stats.rooms.occupiedRoomsCount}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hall Metrics */}
            <div style={{ marginBottom: '2rem' }}>
                <h3 className="flex items-center gap-2 mb-4" style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
                    <Building2 size={18} /> HALL METRICS
                </h3>
                <div className="grid-cards">
                    <Link to="/halls" className="stat-card">
                        <div className="stat-icon rooms-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}><Building2 size={24} /></div>
                        <div className="stat-content">
                            <h3>Total Halls</h3>
                            <div className="value">{stats.halls.totalHalls}</div>
                        </div>
                    </Link>
                    <Link to="/halls" className="stat-card">
                        <div className="stat-icon available-icon" style={{ background: '#ecfdf5', color: '#059669' }}><CheckCircle size={24} /></div>
                        <div className="stat-content">
                            <h3>Available Halls</h3>
                            <div className="value">{stats.halls.availableHallsCountToday}</div>
                        </div>
                    </Link>
                    <div className="stat-card">
                        <div className="stat-icon booked-icon" style={{ background: '#fff5f5', color: '#e53e3e' }}><XCircle size={24} /></div>
                        <div className="stat-content">
                            <h3>Occupied Halls</h3>
                            <div className="value">{stats.halls.occupiedHallsCount}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-content-grid">
                {/* Rooms Today */}
                <div className="card table-responsive">
                    <div className="card-header">
                        <h3 className="flex items-center gap-2">
                            <Home size={20} className="text-danger" />
                            Occupied Rooms
                        </h3>
                    </div>
                    {stats.rooms.currentlyBookedRooms.length === 0 ? (
                        <div className="empty-state-compact">
                            <p>No rooms currently occupied.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr><th>Room</th><th>Guest</th><th>Check-in</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {stats.rooms.currentlyBookedRooms.map((b: any) => (
                                    <tr key={b.id}>
                                        <td style={{ fontWeight: 600 }}>{b.room_name}</td>
                                        <td>{b.person_name}</td>
                                        <td>{format(new Date(b.check_in), 'dd MMM | HH:mm')}</td>
                                        <td>
                                            <button onClick={() => handleCheckout(b.id, 'room')} className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Checkout</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Halls Today */}
                <div className="card table-responsive">
                    <div className="card-header">
                        <h3 className="flex items-center gap-2">
                            <Building2 size={20} style={{ color: '#7c3aed' }} />
                            Occupied Halls
                        </h3>
                    </div>
                    {stats.halls.currentlyBookedHalls.length === 0 ? (
                        <div className="empty-state-compact">
                            <p>No halls currently occupied.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr><th>Hall</th><th>Guest</th><th>Check-in</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {stats.halls.currentlyBookedHalls.map((b: any) => (
                                    <tr key={b.id}>
                                        <td style={{ fontWeight: 600 }}>{b.room_name}</td>
                                        <td>{b.person_name}</td>
                                        <td>{format(new Date(b.check_in), 'dd MMM | HH:mm')}</td>
                                        <td>
                                            <button onClick={() => handleCheckout(b.id, 'hall')} className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Checkout</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Available Rooms grid */}
                <div className="card table-responsive">
                    <div className="card-header">
                        <h3>Available Rooms</h3>
                    </div>
                    {availableRooms.length === 0 ? (
                        <div className="empty-state-compact"><p>None available.</p></div>
                    ) : (
                        <table>
                            <thead><tr><th>Room</th><th>Cap</th><th>Action</th></tr></thead>
                            <tbody>
                                {availableRooms.map((r: any) => (
                                    <tr key={r.id}>
                                        <td style={{ fontWeight: 600 }}>{r.room_name}</td>
                                        <td>{r.capacity}</td>
                                        <td><Link to={`/bookings?room=${r.id}`} className="btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Check-in</Link></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Available Halls grid */}
                <div className="card table-responsive">
                    <div className="card-header">
                        <h3>Available Halls</h3>
                    </div>
                    {availableHalls.length === 0 ? (
                        <div className="empty-state-compact"><p>None available.</p></div>
                    ) : (
                        <table>
                            <thead><tr><th>Hall</th><th>Cap</th><th>Action</th></tr></thead>
                            <tbody>
                                {availableHalls.map((h: any) => (
                                    <tr key={h.id}>
                                        <td style={{ fontWeight: 600 }}>{h.hall_name}</td>
                                        <td>{h.capacity}</td>
                                        <td><Link to={`/bookings?hall=${h.id}`} className="btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Check-in</Link></td>
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
