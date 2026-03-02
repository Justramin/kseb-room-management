import { useState, useEffect } from 'react';
import { request } from '../../api';
import { Loader2, Users } from 'lucide-react';

export default function RoomSummary() {
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        request('/rooms/summary').then(setSummary).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-center"><Loader2 className="spinner mx-auto" /></div>;

    return (
        <div className="drill-down-page">
            <div className="page-header">
                <h2>Room Summary</h2>
            </div>

            <div className="grid-cards mb-6">
                <div className="stat-card">
                    <div className="stat-content">
                        <h3>Total Rooms</h3>
                        <div className="value">{summary.total}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <h3>Currently Occupied</h3>
                        <div className="value text-danger">{summary.checkedIn}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <h3>Available</h3>
                        <div className="value text-success">{summary.available}</div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>Room List</h3>
                </div>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Room Name</th>
                                <th>Capacity</th>
                                <th>Current Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.rooms.map((room: any) => {
                                const isActive = summary.activeBookings.some((b: any) => b.room_id === room.id);
                                return (
                                    <tr key={room.id}>
                                        <td style={{ fontWeight: 600 }}>{room.room_name}</td>
                                        <td><Users size={14} /> {room.capacity}</td>
                                        <td>
                                            <span className={`status-badge ${isActive ? 'checked-in' : 'available'}`}>
                                                {isActive ? 'Occupied' : 'Vacant'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
