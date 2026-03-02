import React, { useState, useEffect } from 'react';
import { request } from '../api';
import toast from 'react-hot-toast';
import ConfirmationModal from './ConfirmationModal';
import { Trash2, X } from 'lucide-react';

interface BookingModalProps {
    isOpen: boolean;
    isEdit: boolean;
    initialData: any;
    onClose: () => void;
    onSaveSuccess: (msg: string) => void;
}

export default function BookingModal({ isOpen, isEdit, initialData, onClose, onSaveSuccess }: BookingModalProps) {
    const [formData, setFormData] = useState({
        facility_id: '',
        type: 'room' as 'room' | 'hall',
        date: '',
        start_time: '09:00',
        end_time: '10:00',
        person_name: '',
        phone: '',
        notes: ''
    });
    const [availableOptions, setAvailableOptions] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        setError('');
        const d = initialData || {};
        const checkInObj = d.check_in ? new Date(d.check_in) : new Date();
        const checkOutObj = d.check_out ? new Date(d.check_out) : new Date(checkInObj.getTime() + 60 * 60 * 1000);

        setFormData({
            facility_id: (d.room_id || d.hall_id || '').toString(),
            type: d.type || 'room',
            date: checkInObj.toISOString().slice(0, 10),
            start_time: checkInObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            end_time: checkOutObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            person_name: d.person_name || '',
            phone: d.phone || '',
            notes: d.notes || ''
        });

    }, [isOpen, initialData]);

    useEffect(() => {
        if (!formData.date || !formData.start_time || !formData.end_time || !isOpen) return;

        let startIso = '';
        let endIso = '';
        try {
            startIso = new Date(`${formData.date}T${formData.start_time}:00`).toISOString();
            endIso = new Date(`${formData.date}T${formData.end_time}:00`).toISOString();
            if (new Date(startIso) >= new Date(endIso)) return;
        } catch { return; }

        const fetchAvailability = async () => {
            try {
                const endpoint = formData.type === 'room' ? '/rooms/availability' : '/halls/availability';
                const params = new URLSearchParams({ check_in: startIso, check_out: endIso });
                const data = await request(`${endpoint}?${params.toString()}`);

                let finalData = data;
                if (isEdit && formData.type === initialData?.type) {
                    const currentId = initialData.room_id || initialData.hall_id;
                    finalData = data.map((r: any) => {
                        if (r.id.toString() === currentId?.toString()) return { ...r, status: 'Available' };
                        return r;
                    });
                }
                setAvailableOptions(finalData.filter((r: any) => r.status === 'Available'));
            } catch (err) {
                console.error(err);
            }
        };
        fetchAvailability();
    }, [formData.date, formData.start_time, formData.end_time, formData.type, isOpen, isEdit, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSaving(true);
        try {
            const startIso = new Date(`${formData.date}T${formData.start_time}:00`).toISOString();
            const endIso = new Date(`${formData.date}T${formData.end_time}:00`).toISOString();

            if (new Date(startIso) >= new Date(endIso)) {
                setIsSaving(false);
                toast.error('Check-out time must be after check-in time');
                return;
            }

            const isRoom = formData.type === 'room';
            const payload = {
                [isRoom ? 'room_id' : 'hall_id']: formData.facility_id,
                person_name: formData.person_name,
                phone: formData.phone,
                check_in: startIso,
                check_out: endIso
            };

            const endpoint = isRoom ? '/bookings' : '/halls/bookings';

            if (isEdit) {
                await request(`${endpoint}/${initialData.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                toast.success('Booking updated successfully');
            } else {
                await request(endpoint, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                toast.success('Booking created successfully');
            }
            onSaveSuccess('Success');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = async () => {
        setIsSaving(true);
        setIsDeleteModalOpen(false);
        try {
            const endpoint = initialData.type === 'room' ? `/bookings/${initialData.id}` : `/halls/bookings/${initialData.id}`;
            await request(endpoint, { method: 'DELETE' });
            toast.success('Booking deleted successfully');
            onSaveSuccess('Deleted');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{isEdit ? 'Edit Booking' : 'Create Booking'}</h3>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                {error && <div className="error-alert">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {!isEdit && (
                        <div className="form-group">
                            <label>Facility Type *</label>
                            <div className="flex bg-gray-100 p-1 rounded-lg" style={{ background: '#f3f4f6', padding: '4px', marginBottom: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'room', facility_id: '' })}
                                    className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${formData.type === 'room' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                                    style={formData.type === 'room' ? { background: 'white', border: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', color: 'var(--primary)' } : { background: 'transparent', border: 'none' }}
                                >
                                    Room
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'hall', facility_id: '' })}
                                    className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${formData.type === 'hall' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                                    style={formData.type === 'hall' ? { background: 'white', border: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', color: 'var(--primary)' } : { background: 'transparent', border: 'none' }}
                                >
                                    Hall
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Date *</label>
                        <input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                    </div>

                    <div className="form-row">
                        <div className="form-group flex-1">
                            <label>Check-in *</label>
                            <input required type="time" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} />
                        </div>
                        <div className="form-group flex-1">
                            <label>Check-out *</label>
                            <input required type="time" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>{formData.type === 'room' ? 'Room' : 'Hall'} *</label>
                        {isEdit ? (
                            <select disabled value={formData.facility_id} className="disabled-input">
                                <option value={initialData.room_id || initialData.hall_id}>{initialData.room_name}</option>
                            </select>
                        ) : (
                            <select required value={formData.facility_id} onChange={e => setFormData({ ...formData, facility_id: e.target.value })}>
                                <option value="">Select {formData.type === 'room' ? 'Room' : 'Hall'} (Available Only)</option>
                                {availableOptions.map(r => (
                                    <option key={r.id} value={r.id}>{r.room_name || r.hall_name} (Cap: {r.capacity}){r.attached_bathroom ? ' - Attached' : ''}</option>
                                ))}
                                {availableOptions.length === 0 && <option disabled>No {formData.type}s available</option>}
                            </select>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Guest Name *</label>
                        <input required value={formData.person_name} placeholder="Enter full name" onChange={e => setFormData({ ...formData, person_name: e.target.value })} />
                    </div>

                    <div className="form-group">
                        <label>Phone Number</label>
                        <input value={formData.phone} placeholder="Contact number" onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    </div>

                    <div className="modal-footer">
                        {isEdit && (
                            <button type="button" disabled={isSaving} className="btn-danger" onClick={() => setIsDeleteModalOpen(true)}>
                                <Trash2 size={16} /> Delete
                            </button>
                        )}
                        <div className="footer-actions">
                            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                            <button type="submit" disabled={isSaving} className="btn-primary">
                                {isSaving ? 'Processing...' : (isEdit ? 'Update' : 'Confirm Booking')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Delete Booking"
                message="Are you sure you want to delete this booking? This action cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText="Delete"
                type="danger"
            />
        </div>
    );
}
