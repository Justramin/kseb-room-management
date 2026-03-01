import { useState, useEffect, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { request } from '../api';
import CalendarToolbar from '../components/CalendarToolbar';
import BookingModal from '../components/BookingModal';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

export default function Calendar() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<any>(null);

    // View State
    const [currentRange, setCurrentRange] = useState<{ start: Date, end: Date } | null>(null);

    const fetchBookings = useCallback(async (start?: Date, end?: Date) => {
        try {
            setLoading(true);
            let url = '/bookings';
            if (start && end) {
                const params = new URLSearchParams({
                    start: start.toISOString(),
                    end: end.toISOString()
                });
                url += `?${params.toString()}`;
            }
            const data = await request(url);
            const formattedEvents = data.map((b: any) => ({
                id: b.id,
                title: `${b.room_name} - ${b.person_name}`,
                start: new Date(b.check_in),
                end: new Date(b.check_out),
                booking: b,
                tooltip: `Room: ${b.room_name}\nGuest: ${b.person_name}\nTime: ${format(new Date(b.check_in), 'p')} - ${format(new Date(b.check_out), 'p')}`
            }));
            setEvents(formattedEvents);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        setCurrentRange({ start, end });
        fetchBookings(start, end);
    }, [fetchBookings]);

    const handleRangeChange = (range: Date[] | { start: Date; end: Date }) => {
        let start: Date;
        let end: Date;
        if (Array.isArray(range)) {
            start = range[0];
            end = range[range.length - 1];
        } else {
            start = range.start;
            end = range.end;
        }
        setCurrentRange({ start, end });
        fetchBookings(start, end);
    };

    const handleSelectSlot = (slotInfo: { start: Date, end: Date }) => {
        setSelectedBooking({
            check_in: slotInfo.start.toISOString(),
            check_out: slotInfo.end.toISOString()
        });
        setIsEdit(false);
        setIsModalOpen(true);
    };

    const handleSelectEvent = (event: any) => {
        setSelectedBooking(event.booking);
        setIsEdit(true);
        setIsModalOpen(true);
    };

    const CustomEvent = ({ event }: any) => {
        return (
            <div className="calendar-event-pill">
                <span className="event-dot"></span>
                <span className="event-text">
                    {event.booking.room_name} - {event.booking.person_name}
                </span>
            </div>
        );
    };

    return (
        <div className="calendar-page">
            <div className="page-header">
                <h2>Booking Calendar</h2>
                {loading && <Loader2 size={20} className="spinner color-primary" />}
            </div>

            <div className="card calendar-container-professional">
                <BigCalendar
                    selectable={true}
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    tooltipAccessor="tooltip"
                    onSelectEvent={handleSelectEvent}
                    onSelectSlot={handleSelectSlot}
                    onRangeChange={handleRangeChange}
                    views={['month', 'week', 'day']}
                    defaultView="month"
                    popup={true}
                    components={{
                        toolbar: CalendarToolbar,
                        event: CustomEvent
                    }}
                    eventPropGetter={() => ({
                        className: 'custom-rbc-event'
                    })}
                />
            </div>

            <BookingModal
                isOpen={isModalOpen}
                isEdit={isEdit}
                initialData={selectedBooking}
                onClose={() => setIsModalOpen(false)}
                onSaveSuccess={() => {
                    setIsModalOpen(false);
                    if (currentRange) {
                        fetchBookings(currentRange.start, currentRange.end);
                    } else {
                        fetchBookings();
                    }
                }}
            />
        </div>
    );
}
