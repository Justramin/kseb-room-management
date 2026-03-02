import { useState, useEffect, useCallback } from 'react';
import { request } from '../api';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, Plus, Edit2, Trash2, Calendar, User, Phone, ClipboardList } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

export default function Bookings() {
    const [searchParams] = useSearchParams();
    const initialRoomId = searchParams.get('room') || '';

    const parseLocalParam = (param: string | null) => {
        if (!param) return '';
        try {
            return new Date(param).toISOString().slice(0, 16);
        } catch { return ''; }
    };

    const initialCheckIn = parseLocalParam(searchParams.get('checkIn'));

    const [bookings, setBookings] = useState<any[]>([]);
    const [availableRooms, setAvailableRooms] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState<any>(null);
    const [formData, setFormData] = useState({
        room_id: initialRoomId,
        person_name: '',
        phone: '',
        check_in: initialCheckIn || new Date().toISOString().slice(0, 16)
    });
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [bookingToDelete, setBookingToDelete] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const bookingsData = await request('/bookings');
            setBookings(bookingsData);
        } catch (err: any) {
            toast.error('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const fetchAvailability = async () => {
            try {
                // Now we just need to know which rooms are NOT 'Checked In'
                const data = await request('/rooms/availability');

                let finalData = data;
                if (isEditing) {
                    finalData = data.map((r: any) => {
                        if (r.id.toString() === isEditing.room_id.toString()) {
                            return { ...r, status: 'Available' };
                        }
                        return r;
                    });
                }

                setAvailableRooms(finalData.filter((r: any) => r.status === 'Available'));
            } catch (err) {
                console.error(err);
            }
        };
        fetchAvailability();
    }, [isEditing]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (isEditing) {
                await request(`/bookings/${isEditing.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
                toast.success('Booking updated successfully');
            } else {
                await request('/bookings', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                toast.success('Check-in recorded successfully');
            }

            setFormData({ room_id: '', person_name: '', phone: '', check_in: new Date().toISOString().slice(0, 16) });
            setIsEditing(null);
            fetchData();
        } catch (err: any) {
            toast.error(err.message === 'This room is currently occupied.' ? 'Room is already occupied.' : err.message);
        }
    };

    const handleEdit = (booking: any) => {
        setIsEditing(booking);
        setFormData({
            room_id: booking.room_id.toString(),
            person_name: booking.person_name,
            phone: booking.phone,
            check_in: new Date(booking.check_in).toISOString().slice(0, 16)
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteClick = (id: number) => {
        setBookingToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!bookingToDelete) return;
        try {
            await request(`/bookings/${bookingToDelete}`, { method: 'DELETE' });
            toast.success('Booking deleted successfully');
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsDeleteModalOpen(false);
            setBookingToDelete(null);
        }
    };

    return (
        <div className="bookings-page">
            <div className="page-header">
                <h2>Check-in Management</h2>
                {loading && <Loader2 size={20} className="spinner" />}
            </div>

            <div className="card mb-4">
                <div className="card-header">
                    <h3>{isEditing ? 'Edit Booking Record' : 'New Check-in'}</h3>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label><Calendar size={14} /> Check-in Time *</label>
                            <input
                                required
                                type="datetime-local"
                                value={formData.check_in}
                                onChange={e => setFormData({ ...formData, check_in: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Room *</label>
                            <select
                                required
                                value={formData.room_id}
                                onChange={e => setFormData({ ...formData, room_id: e.target.value })}
                            >
                                <option value="">Select Available Room</option>
                                {availableRooms.map(r => (
                                    <option key={r.id} value={r.id}>{r.room_name} (Cap: {r.capacity})</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label><User size={14} /> Guest Name *</label>
                            <input
                                required
                                value={formData.person_name}
                                onChange={e => setFormData({ ...formData, person_name: e.target.value })}
                                placeholder="Full name"
                            />
                        </div>
                        <div className="form-group">
                            <label><Phone size={14} /> Phone Number *</label>
                            <input
                                required
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="Contact number"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                        {isEditing && (
                            <button type="button" className="btn-secondary" onClick={() => { setIsEditing(null); setFormData({ room_id: '', person_name: '', phone: '', check_in: new Date().toISOString().slice(0, 16) }); }}>
                                Cancel
                            </button>
                        )}
                        <button type="submit" className="btn-primary">
                            {isEditing ? <><Edit2 size={16} /> Update Record</> : <><Plus size={16} /> Record Check-in</>}
                        </button>
                    </div>
                </form>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>Recent Activity</h3>
                </div>
                {bookings.length === 0 && !loading ? (
                    <div className="empty-state-compact">
                        <ClipboardList size={32} />
                        <p>No activity found.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Room</th>
                                    <th>Guest</th>
                                    <th>Check-in</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.slice(0, 20).map(b => (
                                    <tr key={b.id}>
                                        <td style={{ fontWeight: 600 }}>{b.room_name}</td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{b.person_name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.phone}</div>
                                        </td>
                                        <td>{format(new Date(b.check_in), 'MMM dd, p')}</td>
                                        <td>
                                            <span className={`status-badge ${b.status === 'Checked In' ? 'booked' : 'available'}`}>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex gap-2 justify-end">
                                                <button className="btn-secondary" style={{ padding: '6px 12px' }} onClick={() => handleEdit(b)}>
                                                    <Edit2 size={14} />
                                                </button>
                                                <button className="btn-danger" style={{ padding: '6px 12px' }} onClick={() => handleDeleteClick(b.id)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Delete Booking"
                message="Are you sure you want to delete this booking? This action cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText="Delete Booking"
                type="danger"
            />
        </div>
    );
}
