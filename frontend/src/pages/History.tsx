import { useState, useEffect } from 'react';
import { request } from '../api';
import { format } from 'date-fns';
import { Filter, History as HistoryIcon, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';

export default function History() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [filterRoomId, setFilterRoomId] = useState('');
    const [filterDate, setFilterDate] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [bookingsData, roomsData] = await Promise.all([
                request('/bookings'),
                request('/rooms')
            ]);
            setBookings(bookingsData.sort((a: any, b: any) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime()));
            setRooms(roomsData);
        } catch (err: any) {
            toast.error('Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredBookings = bookings.filter(b => {
        let match = true;
        if (filterRoomId && b.room_id.toString() !== filterRoomId) {
            match = false;
        }
        if (filterDate) {
            const checkInDate = new Date(b.check_in).toISOString().slice(0, 10);
            const checkOutDate = new Date(b.check_out).toISOString().slice(0, 10);
            if (checkInDate > filterDate || checkOutDate < filterDate) {
                match = false;
            }
        }
        return match;
    });

    return (
        <div className="history-page">
            <div className="page-header">
                <h2>Booking History</h2>
                {loading && <div className="spinner"></div>}
            </div>

            <div className="card mb-4 border-primary-soft">
                <div className="card-header">
                    <h3 className="flex items-center gap-2"><Filter size={18} /> Filters</h3>
                </div>
                <div className="form-row">
                    <div className="form-group flex-1">
                        <label>Filter by Room</label>
                        <select value={filterRoomId} onChange={e => setFilterRoomId(e.target.value)}>
                            <option value="">All Rooms</option>
                            {rooms.map(r => (
                                <option key={r.id} value={r.id}>{r.room_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group flex-1">
                        <label>Filter by Date</label>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                        />
                    </div>
                    <div className="flex items-end mb-4">
                        <button className="btn-secondary" onClick={() => { setFilterRoomId(''); setFilterDate(''); }}>
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3 className="flex items-center gap-2"><HistoryIcon size={18} /> All Records</h3>
                </div>
                {filteredBookings.length === 0 && !loading ? (
                    <div className="empty-state-compact">
                        <ClipboardList size={32} />
                        <p>No records found matching your filters.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Room</th>
                                    <th>Guest</th>
                                    <th>Phone</th>
                                    <th>Check-in</th>
                                    <th>Check-out</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBookings.map(b => (
                                    <tr key={b.id}>
                                        <td style={{ fontWeight: 600 }}>{b.room_name}</td>
                                        <td>{b.person_name}</td>
                                        <td>{b.phone}</td>
                                        <td>{format(new Date(b.check_in), 'PP p')}</td>
                                        <td>{format(new Date(b.check_out), 'PP p')}</td>
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
