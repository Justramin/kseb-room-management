import { useState, useEffect } from 'react';
import { request } from '../api';
import toast from 'react-hot-toast';
import { Building2, Plus, Edit2, Trash2, Users, Loader2 } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

export default function Halls() {
    const [halls, setHalls] = useState<any[]>([]);
    const [availability, setAvailability] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState<any>(null);
    const [formData, setFormData] = useState({ hall_name: '', capacity: 1, attached_bathroom: false });
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [hallToDelete, setHallToDelete] = useState<number | null>(null);

    const fetchHalls = async () => {
        setLoading(true);
        try {
            const [data, availData] = await Promise.all([
                request('/halls'),
                request('/halls/availability')
            ]);
            setHalls(data);
            setAvailability(availData);
        } catch (err: any) {
            toast.error('Failed to load halls');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHalls();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await request(`/halls/${isEditing.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
                toast.success('Hall updated successfully');
            } else {
                await request('/halls', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                toast.success('Hall created successfully');
            }
            setFormData({ hall_name: '', capacity: 1, attached_bathroom: false });
            setIsEditing(null);
            fetchHalls();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleEdit = (hall: any) => {
        setIsEditing(hall);
        setFormData({
            hall_name: hall.hall_name,
            capacity: hall.capacity,
            attached_bathroom: hall.attached_bathroom || false
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteClick = (id: number) => {
        setHallToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!hallToDelete) return;
        try {
            await request(`/halls/${hallToDelete}`, { method: 'DELETE' });
            toast.success('Hall deleted successfully');
            fetchHalls();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsDeleteModalOpen(false);
            setHallToDelete(null);
        }
    };

    return (
        <div className="rooms-page">
            <div className="page-header">
                <h2 className="flex items-center gap-2"><Building2 size={24} /> Halls Management</h2>
                {loading && <Loader2 size={20} className="spinner" />}
            </div>

            <div className="card mb-4">
                <div className="card-header">
                    <h3>{isEditing ? 'Edit Hall' : 'Add New Hall'}</h3>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-row" style={{ flexWrap: 'wrap', gap: '1.5rem' }}>
                        <div className="form-group flex-1" style={{ minWidth: '200px' }}>
                            <label>Hall Name</label>
                            <input
                                required
                                value={formData.hall_name}
                                onChange={e => setFormData({ ...formData, hall_name: e.target.value })}
                                placeholder="E.g. Main Hall, Conference Hall"
                            />
                        </div>
                        <div className="form-group" style={{ width: '120px' }}>
                            <label>Capacity</label>
                            <input
                                required
                                type="number"
                                min="1"
                                value={formData.capacity}
                                onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                            />
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.8rem' }}>
                            <input
                                type="checkbox"
                                id="attached_bathroom"
                                style={{ width: 'auto' }}
                                checked={formData.attached_bathroom}
                                onChange={e => setFormData({ ...formData, attached_bathroom: e.target.checked })}
                            />
                            <label htmlFor="attached_bathroom" style={{ marginBottom: 0, cursor: 'pointer' }}>Attached Bathroom</label>
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end" style={{ marginTop: '1rem' }}>
                        {isEditing && (
                            <button type="button" className="btn-secondary" onClick={() => { setIsEditing(null); setFormData({ hall_name: '', capacity: 1, attached_bathroom: false }); }}>
                                Cancel
                            </button>
                        )}
                        <button type="submit" className="btn-primary">
                            {isEditing ? <><Edit2 size={16} /> Update Hall</> : <><Plus size={16} /> Add Hall</>}
                        </button>
                    </div>
                </form>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>All Halls</h3>
                </div>
                {halls.length === 0 && !loading ? (
                    <div className="empty-state-compact">
                        <Building2 size={32} />
                        <p>No halls found. Add some halls to get started.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Hall Name</th>
                                    <th>Capacity</th>
                                    <th>Status Now</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {halls.map(hall => {
                                    const availHall = availability.find(h => h.id === hall.id);
                                    const isAvailable = availHall ? (availHall.status === 'Available') : true;
                                    return (
                                        <tr key={hall.id}>
                                            <td style={{ fontWeight: 600 }}>
                                                <div className="flex items-center gap-2">
                                                    {hall.hall_name}
                                                    {hall.attached_bathroom && (
                                                        <span style={{ fontSize: '0.7rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                            ATTACHED
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td><Users size={14} style={{ marginRight: '4px' }} /> {hall.capacity}</td>
                                            <td>
                                                <span className={`status-badge ${isAvailable ? 'available' : 'occupied'}`}>
                                                    {isAvailable ? 'Available' : 'Booked'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex gap-2 justify-end">
                                                    <button className="btn-secondary" style={{ padding: '6px 12px' }} onClick={() => handleEdit(hall)}>
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button className="btn-danger" style={{ padding: '6px 12px' }} onClick={() => handleDeleteClick(hall.id)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Delete Hall"
                message="Are you sure you want to delete this hall? All associated bookings will also be deleted."
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText="Delete Hall"
                type="danger"
            />
        </div>
    );
}
