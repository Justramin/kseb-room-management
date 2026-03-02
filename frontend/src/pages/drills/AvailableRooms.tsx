import { useState, useEffect } from 'react';
import { request } from '../../api';
import { CheckCircle, Loader2, Users, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AvailableRooms() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        request('/rooms/available').then(setRooms).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-center"><Loader2 className="spinner mx-auto" /></div>;

    return (
        <div className="drill-down-page">
            <div className="page-header">
                <h2>Available Rooms (Today)</h2>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>Rooms ready for check-in</h3>
                </div>
                {rooms.length === 0 ? (
                    <div className="empty-state-compact">
                        <CheckCircle size={32} />
                        <p>No rooms available at the moment.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Room Number</th>
                                    <th>Capacity</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rooms.map((room: any) => (
                                    <tr key={room.id}>
                                        <td style={{ fontWeight: 600 }}>{room.room_name}</td>
                                        <td><Users size={14} /> {room.capacity} Persons</td>
                                        <td>
                                            <span className="status-badge available">Available</span>
                                        </td>
                                        <td>
                                            <div className="flex justify-end">
                                                <Link to={`/bookings?room=${room.id}`} className="btn-primary">
                                                    <Plus size={14} /> Check-in Now
                                                </Link>
                                            </div>
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
