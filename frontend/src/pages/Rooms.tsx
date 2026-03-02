import { useState, useEffect } from 'react';
import { request } from '../api';
import toast from 'react-hot-toast';
import { Loader2, Plus, Edit2, Trash2, Home, Users } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

export default function Rooms() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [availability, setAvailability] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState<any>(null);
    const [formData, setFormData] = useState({ room_name: '', capacity: 1 });
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [roomToDelete, setRoomToDelete] = useState<number | null>(null);

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const [data, availData] = await Promise.all([
                request('/rooms'),
                request('/rooms/availability')
            ]);
            setRooms(data);
            setAvailability(availData);
        } catch (err: any) {
            toast.error('Failed to load rooms');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await request(`/rooms/${isEditing.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
                toast.success('Room updated successfully');
            } else {
                await request('/rooms', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                toast.success('Room created successfully');
            }
            setFormData({ room_name: '', capacity: 1 });
            setIsEditing(null);
            fetchRooms();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleEdit = (room: any) => {
        setIsEditing(room);
        setFormData({
            room_name: room.room_name,
            capacity: room.capacity
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteClick = (id: number) => {
        setRoomToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!roomToDelete) return;
        try {
            await request(`/rooms/${roomToDelete}`, { method: 'DELETE' });
            toast.success('Room deleted successfully');
            fetchRooms();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsDeleteModalOpen(false);
            setRoomToDelete(null);
        }
    };

    return (
        <div className="rooms-page">
            <div className="page-header">
                <h2>Rooms Management</h2>
                {loading && <Loader2 size={20} className="spinner" />}
            </div>

            <div className="card mb-4">
                <div className="card-header">
                    <h3>{isEditing ? 'Edit Room' : 'Add New Room'}</h3>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-row" style={{ flexWrap: 'wrap' }}>
                        <div className="form-group flex-1" style={{ minWidth: '200px' }}>
                            <label>Room Name</label>
                            <input
                                required
                                value={formData.room_name}
                                onChange={e => setFormData({ ...formData, room_name: e.target.value })}
                                placeholder="E.g. VIP Suite, Conference Room"
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
                    </div>
                    <div className="flex gap-2 justify-end">
                        {isEditing && (
                            <button type="button" className="btn-secondary" onClick={() => { setIsEditing(null); setFormData({ room_name: '', capacity: 1 }); }}>
                                Cancel
                            </button>
                        )}
                        <button type="submit" className="btn-primary">
                            {isEditing ? <><Edit2 size={16} /> Update Room</> : <><Plus size={16} /> Add Room</>}
                        </button>
                    </div>
                </form>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>All Rooms</h3>
                </div>
                {rooms.length === 0 && !loading ? (
                    <div className="empty-state-compact">
                        <Home size={32} />
                        <p>No rooms found. Add some rooms to get started.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Room Name</th>
                                    <th>Capacity</th>
                                    <th>Status Now</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rooms.map(room => {
                                    const availRoom = availability.find(r => r.id === room.id);
                                    const isAvailable = availRoom ? (availRoom.status === 'Available') : true;
                                    return (
                                        <tr key={room.id}>
                                            <td style={{ fontWeight: 600 }}>{room.room_name}</td>
                                            <td><Users size={14} style={{ marginRight: '4px' }} /> {room.capacity}</td>
                                            <td>
                                                <span className={`status-badge ${isAvailable ? 'available' : 'occupied'}`}>
                                                    {isAvailable ? 'Available' : 'Booked'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex gap-2 justify-end">
                                                    <button className="btn-secondary" style={{ padding: '6px 12px' }} onClick={() => handleEdit(room)}>
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button className="btn-danger" style={{ padding: '6px 12px' }} onClick={() => handleDeleteClick(room.id)}>
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
                title="Delete Room"
                message="Are you sure you want to delete this room? All associated bookings will also be deleted."
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText="Delete Room"
                type="danger"
            />
        </div>
    );
}
