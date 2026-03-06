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
    const initialHallId = searchParams.get('hall') || '';
    const initialType = initialHallId ? 'hall' : 'room';

    const parseLocalParam = (param: string | null) => {
        if (!param) return '';
        try {
            return new Date(new Date(param).getTime() - new Date(param).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        } catch { return ''; }
    };

    const initialCheckIn = parseLocalParam(searchParams.get('checkIn'));

    const [bookings, setBookings] = useState<any[]>([]);
    const [availableOptions, setAvailableOptions] = useState<any[]>([]);
    const [bookingType, setBookingType] = useState<'room' | 'hall'>(initialType as any);
    const [isEditing, setIsEditing] = useState<any>(null);
    const [formData, setFormData] = useState({
        facility_id: initialRoomId || initialHallId,
        person_name: '',
        phone: '',
        check_in: initialCheckIn || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
        check_out: ''
    });
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [bookingToDelete, setBookingToDelete] = useState<any>(null);

    // fetchData is used for manual refreshes (after submit/delete)
    const fetchData = useCallback(async () => {
        try {
            const bookingsData = await request('/bookings');
            setBookings(bookingsData);
        } catch (err: any) {
            // Ignore AbortErrors caused by React StrictMode cleanup
            if (err?.name !== 'AbortError') {
                toast.error('Failed to load bookings', { id: 'bookings-fetch-error' });
            }
        }
    }, []);

    // Initial load — uses AbortController to survive React StrictMode double-mount
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        request('/bookings')
            .then(data => setBookings(data))
            .catch(err => {
                // ← key check: silently ignore StrictMode cleanup aborts
                if (err?.name !== 'AbortError') {
                    toast.error('Failed to load bookings', { id: 'bookings-fetch-error' });
                }
            })
            .finally(() => setLoading(false));
        return () => controller.abort(); // cleanup on unmount
    }, []);


    useEffect(() => {
        const fetchAvailability = async () => {
            try {
                const endpoint = bookingType === 'room' ? '/rooms/availability' : '/halls/availability';
                const query = `?check_in=${formData.check_in}&check_out=${formData.check_out || ''}`;
                const data = await request(endpoint + query);

                let finalData = data;
                if (isEditing && isEditing.type === bookingType) {
                    const currentId = isEditing.room_id || isEditing.hall_id;
                    finalData = data.map((r: any) => {
                        if (r.id.toString() === currentId?.toString()) {
                            return { ...r, status: 'Available' };
                        }
                        return r;
                    });
                }

                setAvailableOptions(finalData.filter((r: any) => r.status === 'Available'));
            } catch (err) {
                console.error(err);
            }
        };
        fetchAvailability();
    }, [bookingType, formData.check_in, formData.check_out]); // Removed isEditing to prevent refetch on every modal open if not needed

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const payload = {
                facility_type: bookingType,
                facility_id: formData.facility_id,
                guest_name: formData.person_name, // User requested guest_name in payload
                person_name: formData.person_name, // Maintain person_name for backend insert
                phone: formData.phone,
                check_in: new Date(formData.check_in).toISOString(),
                check_out: formData.check_out ? new Date(formData.check_out).toISOString() : null
            };

            if (isEditing) {
                const endpoint = bookingType === 'room' ? `/bookings/${isEditing.id}` : `/halls/bookings/${isEditing.id}`;
                await request(endpoint, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                toast.success('Booking updated successfully');
            } else {
                await request('/bookings', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                toast.success('Booking recorded successfully');
            }

            setFormData({ facility_id: '', person_name: '', phone: '', check_in: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), check_out: '' });
            setIsEditing(null);
            fetchData();
        } catch (err: any) {
            toast.error(err.message.includes('occupied') ? 'Selected facility is already occupied.' : err.message);
        }
    };

    const handleCheckout = async (booking: any) => {
        try {
            const endpoint = booking.type === 'room' ? `/bookings/${booking.id}/checkout` : `/halls/bookings/${booking.id}/checkout`;
            await request(endpoint, { method: 'PATCH' });
            toast.success('Checked out successfully');
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleEdit = (booking: any) => {
        setIsEditing(booking);
        setBookingType(booking.type);
        setFormData({
            facility_id: (booking.room_id || booking.hall_id).toString(),
            person_name: booking.person_name,
            phone: booking.phone,
            check_in: new Date(new Date(booking.check_in).getTime() - new Date(booking.check_in).getTimezoneOffset() * 60000).toISOString().slice(0, 16),
            check_out: booking.check_out ? new Date(new Date(booking.check_out).getTime() - new Date(booking.check_out).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteClick = (booking: any) => {
        setBookingToDelete(booking);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!bookingToDelete) return;
        try {
            const endpoint = bookingToDelete.type === 'room' ? `/bookings/${bookingToDelete.id}` : `/halls/bookings/${bookingToDelete.id}`;
            await request(endpoint, { method: 'DELETE' });
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
                <h2>Booking Management</h2>
                {loading && <Loader2 size={20} className="spinner" />}
            </div>

            <div className="card mb-4">
                <div className="card-header flex justify-between items-center">
                    <h3>{isEditing ? 'Edit Booking Record' : 'New Booking'}</h3>
                    {!isEditing && (
                        <div className="flex bg-gray-100 p-1 rounded-lg" style={{ background: '#f3f4f6', padding: '4px' }}>
                            <button
                                onClick={() => { setBookingType('room'); setFormData({ ...formData, facility_id: '' }); }}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${bookingType === 'room' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                style={bookingType === 'room' ? { background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', color: 'var(--primary)' } : { background: 'transparent', color: '#6b7280', border: 'none' }}
                            >
                                Rooms
                            </button>
                            <button
                                onClick={() => { setBookingType('hall'); setFormData({ ...formData, facility_id: '' }); }}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${bookingType === 'hall' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                style={bookingType === 'hall' ? { background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', color: 'var(--primary)' } : { background: 'transparent', color: '#6b7280', border: 'none' }}
                            >
                                Halls
                            </button>
                        </div>
                    )}
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
                            <label><Calendar size={14} /> Check-out Time (Optional)</label>
                            <input
                                type="datetime-local"
                                value={formData.check_out}
                                onChange={e => setFormData({ ...formData, check_out: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>{bookingType === 'room' ? 'Room' : 'Hall'} *</label>
                            <select
                                required
                                value={formData.facility_id}
                                onChange={e => setFormData({ ...formData, facility_id: e.target.value })}
                            >
                                <option value="">Select {bookingType === 'room' ? 'Available Room' : 'Available Hall'}</option>
                                {availableOptions.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.room_name || r.hall_name} (Cap: {r.capacity}){r.attached_bathroom ? ' - Attached' : ''}
                                    </option>
                                ))}
                                {availableOptions.length === 0 && <option disabled>No {bookingType}s available for these dates</option>}
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
                            <button type="button" className="btn-secondary" onClick={() => { setIsEditing(null); setFormData({ facility_id: '', person_name: '', phone: '', check_in: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), check_out: '' }); }}>
                                Cancel
                            </button>
                        )}
                        <button type="submit" className="btn-primary">
                            {isEditing ? <><Edit2 size={16} /> Update Record</> : <><Plus size={16} /> Record Booking</>}
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
                                    <th>Type</th>
                                    <th>Facility</th>
                                    <th>Guest</th>
                                    <th>Check-in</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.slice(0, 30).map(b => (
                                    <tr key={`${b.type}-${b.id}`}>
                                        <td>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                background: b.type === 'room' ? '#f0f9ff' : '#f5f3ff',
                                                color: b.type === 'room' ? '#0369a1' : '#6d28d9'
                                            }}>
                                                {b.type}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{b.room_name}</td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{b.person_name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.phone}</div>
                                        </td>
                                        <td>{format(new Date(b.check_in), 'MMM dd, HH:mm')}</td>
                                        <td>
                                            <span className={`status-badge ${b.status?.toLowerCase().replace(' ', '-')}`}>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex gap-2 justify-end">
                                                {b.status === 'Checked In' && (
                                                    <button
                                                        className="btn-danger"
                                                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                                        onClick={() => handleCheckout(b)}
                                                    >
                                                        Checkout
                                                    </button>
                                                )}
                                                <button className="btn-secondary" style={{ padding: '6px 12px' }} onClick={() => handleEdit(b)}>
                                                    <Edit2 size={14} />
                                                </button>
                                                <button className="btn-danger" style={{ padding: '6px 12px' }} onClick={() => handleDeleteClick(b)}>
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
        </div >
    );
}
