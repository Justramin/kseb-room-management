import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { request } from '../../api';
import { Loader2, User, Phone, Calendar as CalendarIcon, DoorOpen, ArrowLeft, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function BookingDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch all bookings and find the one with the ID 
        // OR add a specific GET /api/bookings/:id endpoint if needed.
        // For now, let's fetch all and filter for simplicity or try to fetch specifically.
        request(`/bookings`).then(data => {
            const found = data.find((b: any) => b.id.toString() === id);
            setBooking(found);
        }).finally(() => setLoading(false));
    }, [id]);

    const handleCheckout = async () => {
        if (!booking) return;
        try {
            await request(`/bookings/${booking.id}/checkout`, { method: 'PATCH' });
            toast.success('Room checked out successfully');
            navigate('/dashboard');
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    if (loading) return <div className="p-8 text-center"><Loader2 className="spinner mx-auto" /></div>;
    if (!booking) return <div className="p-8 text-center">Booking not found.</div>;

    return (
        <div className="drill-down-page">
            <div className="page-header">
                <button onClick={() => navigate(-1)} className="btn-secondary" style={{ padding: '6px 12px' }}>
                    <ArrowLeft size={16} /> Back
                </button>
                <h2>Booking Details</h2>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>Record #{booking.id}</h3>
                    <span className={`status-badge ${booking.status.toLowerCase().replace(' ', '-')}`}>
                        {booking.status}
                    </span>
                </div>

                <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '1rem' }}>
                    <div>
                        <h4 style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>GUEST INFORMATION</h4>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="stat-icon rooms-icon" style={{ borderRadius: '50%', padding: '12px' }}><User size={24} /></div>
                            <div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{booking.person_name}</div>
                                <div className="text-muted"><Phone size={14} /> {booking.phone}</div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>STAY INFORMATION</h4>
                        <div className="flex flex-column gap-3">
                            <div className="flex items-center gap-2">
                                <DoorOpen size={18} className="text-primary" />
                                <strong>Room:</strong> {booking.room_name}
                            </div>
                            <div className="flex items-center gap-2">
                                <CalendarIcon size={18} className="text-primary" />
                                <strong>Check-in:</strong> {format(new Date(booking.check_in), 'PPP p')}
                            </div>
                            {booking.check_out && (
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={18} className="text-success" />
                                    <strong>Check-out:</strong> {format(new Date(booking.check_out), 'PPP p')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 justify-end mt-8" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    {booking.status === 'Checked In' && (
                        <button className="btn-danger" onClick={handleCheckout}>
                            Complete Checkout
                        </button>
                    )}
                    <button className="btn-secondary" onClick={() => navigate(`/bookings?edit=${booking.id}`)}>
                        Edit Record
                    </button>
                </div>
            </div>
        </div>
    );
}
