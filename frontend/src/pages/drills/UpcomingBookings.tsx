import { useState, useEffect } from 'react';
import { request } from '../../api';
import { ClipboardList, Loader2, Phone, CalendarIcon, DoorOpen } from 'lucide-react';
import { format } from 'date-fns';

export default function UpcomingBookings() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        request('/bookings/upcoming').then(setBookings).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-center"><Loader2 className="spinner mx-auto" /></div>;

    return (
        <div className="drill-down-page">
            <div className="page-header">
                <h2>Upcoming Bookings</h2>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>Entries Scheduled for the Future</h3>
                </div>
                {bookings.length === 0 ? (
                    <div className="empty-state-compact">
                        <ClipboardList size={32} />
                        <p>No upcoming bookings scheduled at the moment.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Room</th>
                                    <th>Guest</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map((b: any) => (
                                    <tr key={b.id}>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <CalendarIcon size={14} />
                                                {format(new Date(b.check_in), 'MMM dd, p')}
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>
                                            <div className="flex items-center gap-1">
                                                <DoorOpen size={14} />
                                                {b.room_name}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{b.person_name}</div>
                                            <div className="text-muted" style={{ fontSize: '0.8rem' }}><Phone size={10} /> {b.phone}</div>
                                        </td>
                                        <td>
                                            <span className="status-badge scheduled">Scheduled</span>
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
