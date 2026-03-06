import { useState, useEffect, useCallback } from 'react';
import { request } from '../api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Loader2, Edit2, User, Phone, ClipboardList, CheckCircle, Clock, Search, DoorOpen } from 'lucide-react';

export default function History() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState<any>(null);
    const [formData, setFormData] = useState({
        room_id: '',
        person_name: '',
        phone: '',
        check_in: '',
        check_out: '',
        status: ''
    });

    const [searchTerm, setSearchTerm] = useState('');

    // fetchData is used for manual refreshes after edits
    const fetchData = useCallback(async () => {
        try {
            const [bookingsData, roomsData] = await Promise.all([
                request('/bookings'),
                request('/rooms')
            ]);
            setBookings(bookingsData);
            setRooms(roomsData);
        } catch (err: any) {
            if (err?.name !== 'AbortError') {
                toast.error('Failed to load history', { id: 'history-fetch-error' });
            }
        }
    }, []);

    // Initial load — AbortController survives React StrictMode double-mount
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        Promise.all([request('/bookings'), request('/rooms')])
            .then(([bookingsData, roomsData]) => {
                setBookings(bookingsData);
                setRooms(roomsData);
            })
            .catch(err => {
                if (err?.name !== 'AbortError') {
                    toast.error('Failed to load history', { id: 'history-fetch-error' });
                }
            })
            .finally(() => setLoading(false));
        return () => controller.abort(); // StrictMode cleanup
    }, []);

    const handleEdit = (booking: any) => {
        setIsEditing(booking);
        setFormData({
            room_id: booking.room_id.toString(),
            person_name: booking.person_name,
            phone: booking.phone,
            check_in: new Date(new Date(booking.check_in).getTime() - new Date(booking.check_in).getTimezoneOffset() * 60000).toISOString().slice(0, 16),
            check_out: booking.check_out ? new Date(new Date(booking.check_out).getTime() - new Date(booking.check_out).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
            status: booking.status
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                check_in: new Date(formData.check_in).toISOString(),
                check_out: formData.check_out ? new Date(formData.check_out).toISOString() : null
            };
            await request(`/bookings/${isEditing.id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            toast.success('Record updated successfully');
            setIsEditing(null);
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const filteredBookings = bookings.filter(b =>
        b.person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.room_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.phone.includes(searchTerm)
    );

    return (
        <div className="history-page">
            <div className="page-header">
                <h2>Booking History</h2>
                {loading && <Loader2 size={20} className="spinner" />}
            </div>

            {isEditing && (
                <div className="card mb-4 border-primary">
                    <div className="card-header bg-primary-soft">
                        <h3 className="flex items-center gap-2"><Edit2 size={18} /> Edit History Record</h3>
                    </div>
                    <form onSubmit={handleSubmit} className="p-4">
                        <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <label><DoorOpen size={14} /> Room</label>
                                <select
                                    required
                                    value={formData.room_id}
                                    onChange={e => setFormData({ ...formData, room_id: e.target.value })}
                                >
                                    {rooms.map(r => (
                                        <option key={r.id} value={r.id}>{r.room_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label><User size={14} /> Guest Name</label>
                                <input
                                    required
                                    value={formData.person_name}
                                    onChange={e => setFormData({ ...formData, person_name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label><Phone size={14} /> Phone</label>
                                <input
                                    required
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label><Clock size={14} /> Check-in</label>
                                <input
                                    required
                                    type="datetime-local"
                                    value={formData.check_in}
                                    onChange={e => setFormData({ ...formData, check_in: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label><Clock size={14} /> Check-out</label>
                                <input
                                    type="datetime-local"
                                    value={formData.check_out}
                                    onChange={e => setFormData({ ...formData, check_out: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="Scheduled">Scheduled</option>
                                    <option value="Checked In">Checked In</option>
                                    <option value="Checked Out">Checked Out</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button type="button" className="btn-secondary" onClick={() => setIsEditing(null)}>Cancel</button>
                            <button type="submit" className="btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card mb-4">
                <div className="card-header">
                    <div className="flex items-center gap-2 w-full">
                        <Search size={18} className="text-muted" />
                        <input
                            type="text"
                            placeholder="Search by guest, room, or phone..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ border: 'none', padding: '0.5rem', width: '100%', outline: 'none' }}
                        />
                    </div>
                </div>
            </div>

            <div className="card">
                {filteredBookings.length === 0 && !loading ? (
                    <div className="empty-state">
                        <ClipboardList size={48} />
                        <p>No records found.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Room</th>
                                    <th>Guest</th>
                                    <th>Check-in</th>
                                    <th>Check-out</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBookings.map(b => (
                                    <tr key={b.id}>
                                        <td style={{ fontWeight: 600 }}>{b.room_name}</td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{b.person_name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.phone}</div>
                                        </td>
                                        <td>{format(new Date(b.check_in), 'MMM dd, p')}</td>
                                        <td>
                                            {b.check_out ? (
                                                format(new Date(b.check_out), 'MMM dd, p')
                                            ) : (
                                                <span className="text-muted italic">---</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${b.status?.toLowerCase().replace(' ', '-')}`}>
                                                {b.status === 'Checked In' ? <Clock size={12} style={{ marginRight: '4px' }} /> : <CheckCircle size={12} style={{ marginRight: '4px' }} />}
                                                {b.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn-secondary" style={{ padding: '6px 12px' }} onClick={() => handleEdit(b)}>
                                                <Edit2 size={14} />
                                            </button>
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
