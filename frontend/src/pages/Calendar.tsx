import { useState, useEffect, useCallback, useMemo } from 'react';
import { request } from '../api';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    addMonths,
    subMonths,
    isToday,
    parseISO,
    startOfDay,
    isWithinInterval
} from 'date-fns';
import toast from 'react-hot-toast';
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import BookingModal from '../components/BookingModal';

export default function Calendar() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [isEdit, setIsEdit] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'room' | 'hall'>('all');

    const fetchBookings = useCallback(async () => {
        try {
            setLoading(true);
            const data = await request('/bookings');
            setBookings(data);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const goToPreviousMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const goToNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
    const goToToday = () => setCurrentMonth(new Date());

    const filteredBookings = useMemo(() => {
        if (filterType === 'all') return bookings;
        return bookings.filter(b => b.type === filterType);
    }, [bookings, filterType]);

    const calendarGrid = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        return eachDayOfInterval({
            start: startDate,
            end: endDate,
        });
    }, [currentMonth]);

    const getBookingsForDate = (date: Date) => {
        const d = startOfDay(date);
        return filteredBookings.filter(b => {
            const bStart = startOfDay(parseISO(b.check_in));
            const bEnd = b.check_out ? startOfDay(parseISO(b.check_out)) : bStart;

            return isWithinInterval(d, { start: bStart, end: bEnd });
        });
    };

    const handleDateClick = (date: Date) => {
        const isoStr = date.toISOString().split('T')[0] + 'T09:00:00.000Z';
        setSelectedBooking({ check_in: isoStr });
        setIsEdit(false);
        setIsModalOpen(true);
    };

    const handleEventClick = (e: React.MouseEvent, booking: any) => {
        e.stopPropagation();
        setSelectedBooking(booking);
        setIsEdit(true);
        setIsModalOpen(true);
    };

    return (
        <div className="calendar-page">
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div className="flex items-center gap-4">
                    <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb', padding: '10px', borderRadius: '12px' }}>
                        <CalendarIcon size={24} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Booking Calendar</h2>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>View assignments for Rooms & Halls</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="flex bg-gray-100 p-1 rounded-lg" style={{ background: '#f3f4f6', padding: '4px' }}>
                        <button
                            onClick={() => setFilterType('all')}
                            className={`px-3 py-1 rounded-md text-xs font-medium ${filterType === 'all' ? 'bg-white shadow' : 'text-gray-500'}`}
                            style={filterType === 'all' ? { background: 'white', border: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' } : { background: 'transparent', border: 'none' }}
                        >
                            Both
                        </button>
                        <button
                            onClick={() => setFilterType('room')}
                            className={`px-3 py-1 rounded-md text-xs font-medium ${filterType === 'room' ? 'bg-white shadow' : 'text-gray-500'}`}
                            style={filterType === 'room' ? { background: 'white', border: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' } : { background: 'transparent', border: 'none' }}
                        >
                            Rooms
                        </button>
                        <button
                            onClick={() => setFilterType('hall')}
                            className={`px-3 py-1 rounded-md text-xs font-medium ${filterType === 'hall' ? 'bg-white shadow' : 'text-gray-500'}`}
                            style={filterType === 'hall' ? { background: 'white', border: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' } : { background: 'transparent', border: 'none' }}
                        >
                            Halls
                        </button>
                    </div>
                    {loading && <Loader2 size={16} className="spinner" />}
                    <button className="btn-primary" onClick={() => { setSelectedBooking(null); setIsEdit(false); setIsModalOpen(true); }}>
                        <Plus size={18} /> New Booking
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="calendar-header" style={{
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-color)'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                        {format(currentMonth, 'MMMM yyyy')}
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={goToPreviousMonth} className="btn-secondary" style={{ padding: '8px' }}>
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={goToToday} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
                            Today
                        </button>
                        <button onClick={goToNextMonth} className="btn-secondary" style={{ padding: '8px' }}>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="calendar-grid-wrapper" style={{ overflowX: 'auto' }}>
                    <div style={{ minWidth: '800px' }}>
                        <div className="grid-days-header" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            background: '#f8fafc',
                            borderBottom: '1px solid var(--border-color)'
                        }}>
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} style={{
                                    padding: '12px',
                                    textAlign: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    color: 'var(--text-muted)',
                                    letterSpacing: '0.05em'
                                }}>
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="calendar-body" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            background: 'var(--border-color)',
                            gap: '1px'
                        }}>
                            {calendarGrid.map((date, idx) => {
                                const dayBookings = getBookingsForDate(date);
                                const isCurrMonth = isSameMonth(date, currentMonth);
                                const isTodayDate = isToday(date);

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => handleDateClick(date)}
                                        style={{
                                            minHeight: '130px',
                                            background: isCurrMonth ? 'white' : '#fcfdfe',
                                            padding: '8px',
                                            position: 'relative',
                                            cursor: 'pointer'
                                        }}
                                        className="calendar-cell"
                                    >
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '8px'
                                        }}>
                                            <span style={{
                                                fontSize: '0.875rem',
                                                fontWeight: isTodayDate ? 700 : 500,
                                                color: isTodayDate ? '#2563eb' : (isCurrMonth ? 'var(--text-main)' : '#94a3b8'),
                                                background: isTodayDate ? '#eff6ff' : 'transparent',
                                                padding: '2px 6px',
                                                borderRadius: '6px'
                                            }}>
                                                {format(date, 'd')}
                                            </span>
                                            {dayBookings.length > 0 && (
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                    {dayBookings.length} {dayBookings.length === 1 ? 'Booking' : 'Bookings'}
                                                </span>
                                            )}
                                        </div>

                                        <div className="day-events" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {dayBookings.slice(0, 3).map((b, bIdx) => {
                                                const isHall = b.type === 'hall';
                                                return (
                                                    <div
                                                        key={bIdx}
                                                        onClick={(e) => handleEventClick(e, b)}
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            padding: '4px 6px',
                                                            background: isHall ? '#f5f3ff' : '#eff6ff',
                                                            color: isHall ? '#5b21b6' : '#1e40af',
                                                            borderRadius: '4px',
                                                            borderLeft: `3px solid ${isHall ? '#8b5cf6' : '#3b82f6'}`,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            fontWeight: 500
                                                        }}
                                                    >
                                                        {isHall ? 'H' : 'R'}: {b.room_name} - {b.person_name}
                                                    </div>
                                                );
                                            })}
                                            {dayBookings.length > 3 && (
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', paddingLeft: '4px' }}>
                                                    + {dayBookings.length - 3} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <BookingModal
                isOpen={isModalOpen}
                isEdit={isEdit}
                initialData={selectedBooking}
                onClose={() => setIsModalOpen(false)}
                onSaveSuccess={() => {
                    setIsModalOpen(false);
                    fetchBookings();
                }}
            />

            <style>{`
                .calendar-cell:hover {
                    background: #f8fafc !important;
                }
                .calendar-cell {
                    transition: background 0.1s;
                }
                @media (max-width: 768px) {
                    .calendar-grid-wrapper {
                        margin: 0 -1rem;
                        padding: 0 1rem;
                    }
                }
            `}</style>
        </div>
    );
}
