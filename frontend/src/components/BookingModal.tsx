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
        room_id: '',
        person_name: '',
        date: '',
        start_time: '09:00',
        end_time: '10:00',
        phone: '',
        notes: ''
    });
    const [availableRooms, setAvailableRooms] = useState<any[]>([]);
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
            room_id: d.room_id ? d.room_id.toString() : '',
            person_name: d.person_name || '',
            date: checkInObj.toISOString().slice(0, 10),
            start_time: checkInObj.toTimeString().slice(0, 5),
            end_time: checkOutObj.toTimeString().slice(0, 5),
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

        const fetchAvailableRooms = async () => {
            try {
                const params = new URLSearchParams({ check_in: startIso, check_out: endIso });
                const data = await request(`/rooms/availability?${params.toString()}`);

                let finalData = data;
                if (isEdit && initialData?.room_id) {
                    finalData = data.map((r: any) => {
                        if (r.id.toString() === initialData.room_id.toString()) return { ...r, status: 'Available' };
                        return r;
                    });
                }
                setAvailableRooms(finalData.filter((r: any) => r.status === 'Available'));
            } catch (err) {
                console.error(err);
            }
        };
        fetchAvailableRooms();
    }, [formData.date, formData.start_time, formData.end_time, isOpen, isEdit, initialData]);

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

            const payload = {
                room_id: formData.room_id,
                person_name: formData.person_name,
                phone: formData.phone,
                check_in: startIso,
                check_out: endIso
            };

            if (isEdit) {
                await request(`/bookings/${initialData.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                toast.success('Booking updated successfully');
            } else {
                await request('/bookings', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                toast.success('Booking created successfully');
            }
            onSaveSuccess('Success');
        } catch (err: any) {
            const msg = err.message === 'Overlapping booking exists for this room.' ? 'This room is already booked during this time.' : err.message;
            setError(msg);
            toast.error(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = async () => {
        setIsSaving(true);
        setIsDeleteModalOpen(false);
        try {
            await request(`/bookings/${initialData.id}`, { method: 'DELETE' });
            toast.success('Booking deleted successfully');
            onSaveSuccess('Deleted');
        } catch (err: any) {
            setError(err.message);
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
                    <div className="form-group">
                        <label>Date *</label>
                        <input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                    </div>

                    <div className="form-row">
                        <div className="form-group flex-1">
                            <label>Start Time *</label>
                            <input required type="time" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} />
                        </div>
                        <div className="form-group flex-1">
                            <label>End Time *</label>
                            <input required type="time" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Room *</label>
                        {isEdit ? (
                            <select disabled value={formData.room_id} className="disabled-input">
                                <option value={initialData.room_id}>{initialData.room_name}</option>
                            </select>
                        ) : (
                            <select required value={formData.room_id} onChange={e => setFormData({ ...formData, room_id: e.target.value })}>
                                <option value="">Select Room (Available Only)</option>
                                {availableRooms.map(r => (
                                    <option key={r.id} value={r.id}>{r.room_name} (Cap: {r.capacity})</option>
                                ))}
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
