import { useState, useEffect } from 'react';
import { request } from '../../api';
import { ClipboardList, Loader2, User, Phone, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function BookingsToday() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        request('/bookings/today').then(setBookings).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-center"><Loader2 className="spinner mx-auto" /></div>;

    return (
        <div className="drill-down-page">
            <div className="page-header">
                <h2>Today's Bookings</h2>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>Entries Scheduled or Checked-in Today</h3>
                </div>
                {bookings.length === 0 ? (
                    <div className="empty-state-compact">
                        <ClipboardList size={32} />
                        <p>No bookings found for today.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Guest</th>
                                    <th>Room</th>
                                    <th>Check-in Time</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map((b: any) => (
                                    <tr key={b.id}>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <User size={14} />
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{b.person_name}</div>
                                                    <div className="text-muted" style={{ fontSize: '0.8rem' }}><Phone size={10} /> {b.phone}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{b.room_name}</td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <Clock size={14} />
                                                {format(new Date(b.check_in), 'p')}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${b.status.toLowerCase().replace(' ', '-')}`}>
                                                {b.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
