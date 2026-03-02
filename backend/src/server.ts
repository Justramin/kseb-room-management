import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { pool } from './db';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();

// Middleware
app.use(morgan('dev'));
app.use(express.json());

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

// Health Check
app.get('/api/health', (_req, res) => {
    res.json({ status: "ok" });
});

// Auth Routes
app.use('/api/auth', authRoutes);

// Rooms Routes
app.get('/api/rooms', async (_req, res) => {
    try {
        const result = await pool.query('SELECT * FROM rooms ORDER BY id DESC');
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/rooms', async (req, res) => {
    const { room_name, capacity } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO rooms (room_name, capacity) VALUES ($1, $2) RETURNING *',
            [room_name, capacity]
        );
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/rooms/:id', async (req, res) => {
    const { id } = req.params;
    const { room_name, capacity } = req.body;
    try {
        const result = await pool.query(
            'UPDATE rooms SET room_name = $1, capacity = $2 WHERE id = $3 RETURNING *',
            [room_name, capacity, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Room not found' });
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/rooms/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM rooms WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Bookings Routes
const GET_BOOKINGS_QUERY = `
  SELECT b.*, r.room_name,
    CASE 
      WHEN b.check_out IS NOT NULL THEN 'Checked Out'
      WHEN b.check_in > NOW() THEN 'Scheduled'
      ELSE 'Checked In'
    END as status
  FROM bookings b 
  JOIN rooms r ON b.room_id = r.id 
`;

app.get('/api/bookings', async (req, res) => {
    try {
        const result = await pool.query(`${GET_BOOKINGS_QUERY} ORDER BY b.check_in DESC`);
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bookings', async (req, res) => {
    const { room_id, person_name, phone, check_in, check_out } = req.body;

    if (!check_in) {
        return res.status(400).json({ error: 'Check-in time is required.' });
    }

    const checkInDate = new Date(check_in);
    const finalCheckOut = (check_out && check_out !== "") ? check_out : null;
    const checkOutDate = finalCheckOut ? new Date(finalCheckOut) : null;

    if (checkOutDate && checkOutDate <= checkInDate) {
        return res.status(400).json({ error: 'Check-out time must be after check-in time.' });
    }

    try {
        const overlapResult = await pool.query(`
            SELECT * FROM bookings 
            WHERE room_id = $1 
            AND check_out IS NULL
        `, [room_id]);

        if (overlapResult.rows.length > 0) {
            return res.status(400).json({ error: 'This room already has an active or scheduled booking.' });
        }

        const result = await pool.query(
            "INSERT INTO bookings (room_id, person_name, phone, check_in, check_out) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [room_id, person_name, phone, check_in, finalCheckOut]
        );
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/bookings/:id/checkout', async (req, res) => {
    const { id } = req.params;
    try {
        const booking = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
        if (booking.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });

        if (booking.rows[0].check_out) {
            return res.status(400).json({ error: 'Already checked out' });
        }

        const result = await pool.query(
            "UPDATE bookings SET check_out = NOW(), status = 'Checked Out' WHERE id = $1 RETURNING *",
            [id]
        );
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/bookings/:id', async (req, res) => {
    const { id } = req.params;
    const { room_id, person_name, phone, check_in, check_out } = req.body;

    if (!check_in) {
        return res.status(400).json({ error: 'Check-in time is required.' });
    }

    const checkInDate = new Date(check_in);
    const finalCheckOut = (check_out && check_out !== "") ? check_out : null;
    const checkOutDate = finalCheckOut ? new Date(finalCheckOut) : null;

    if (checkOutDate && checkOutDate <= checkInDate) {
        return res.status(400).json({ error: 'Check-out time must be after check-in time.' });
    }

    try {
        const result = await pool.query(
            'UPDATE bookings SET room_id = $1, person_name = $2, phone = $3, check_in = $4, check_out = $5 WHERE id = $6 RETURNING *',
            [room_id, person_name, phone, check_in, finalCheckOut, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/bookings/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM bookings WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Dashboard & Availability Routes
app.get('/api/dashboard', async (_req, res) => {
    try {
        const roomsCountResult = await pool.query('SELECT COUNT(*) FROM rooms');
        const totalRooms = parseInt(roomsCountResult.rows[0].count, 10);

        // Currently booked rooms (Checked In)
        const currentlyBookedResult = await pool.query(`
            ${GET_BOOKINGS_QUERY}
            WHERE b.check_in <= NOW() AND b.check_out IS NULL
            ORDER BY b.check_in ASC
        `);

        // Today's Bookings (check-ins today)
        const todayBookingsCountResult = await pool.query(`
            SELECT COUNT(*) FROM bookings
            WHERE DATE(check_in) = CURRENT_DATE
        `);

        // Available Rooms (not currently checked in)
        const availableCount = totalRooms - currentlyBookedResult.rows.length;

        // Next upcoming booking
        const nextBookingResult = await pool.query(`
            ${GET_BOOKINGS_QUERY}
            WHERE b.check_in > NOW() AND b.check_out IS NULL
            ORDER BY b.check_in ASC
            LIMIT 1
        `);

        res.json({
            totalRooms,
            bookedRoomsCountToday: parseInt(todayBookingsCountResult.rows[0].count, 10),
            availableRoomsCountToday: availableCount,
            nextUpcomingBooking: nextBookingResult.rows[0] || null,
            currentlyBookedRooms: currentlyBookedResult.rows
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/rooms/availability', async (req, res) => {
    const { check_in, check_out } = req.query;
    try {
        const roomsResult = await pool.query('SELECT * FROM rooms ORDER BY room_name ASC');
        const rooms = roomsResult.rows;

        let timeCheckIn = check_in ? new Date(check_in as string) : new Date();
        let timeCheckOut = check_out ? new Date(check_out as string) : new Date();

        if (isNaN(timeCheckIn.getTime())) timeCheckIn = new Date();
        if (isNaN(timeCheckOut.getTime())) timeCheckOut = new Date();

        const overlapResult = await pool.query(`
      SELECT room_id FROM bookings 
      WHERE ($1 < check_out AND $2 > check_in)
    `, [timeCheckIn, timeCheckOut]);

        const bookedRoomIds = new Set(overlapResult.rows.map(r => r.room_id));

        const nextBookingsResult = await pool.query(`
      SELECT room_id, check_in FROM bookings
      WHERE check_in >= $1
      ORDER BY check_in ASC
    `, [timeCheckIn]);

        const nextBookingsMap = new Map();
        for (const b of nextBookingsResult.rows) {
            if (!nextBookingsMap.has(b.room_id)) {
                nextBookingsMap.set(b.room_id, b.check_in);
            }
        }

        const availability = rooms.map(r => ({
            id: r.id,
            room_name: r.room_name,
            capacity: r.capacity,
            location: r.location,
            status: bookedRoomIds.has(r.id) ? 'Booked' : 'Available',
            next_booking_time: nextBookingsMap.get(r.id) || null
        }));

        res.json(availability);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/rooms/summary', async (_req, res) => {
    try {
        const totalRoomsResult = await pool.query('SELECT COUNT(*) FROM rooms');
        const checkedInResult = await pool.query("SELECT COUNT(*) FROM bookings WHERE check_in <= NOW() AND check_out IS NULL");

        const roomsResult = await pool.query('SELECT * FROM rooms ORDER BY room_name ASC');
        const bookingsResult = await pool.query(`${GET_BOOKINGS_QUERY} WHERE b.check_in <= NOW() AND b.check_out IS NULL`);

        res.json({
            total: parseInt(totalRoomsResult.rows[0].count, 10),
            checkedIn: parseInt(checkedInResult.rows[0].count, 10),
            available: parseInt(totalRoomsResult.rows[0].count, 10) - parseInt(checkedInResult.rows[0].count, 10),
            rooms: roomsResult.rows,
            activeBookings: bookingsResult.rows
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/rooms/available', async (_req, res) => {
    try {
        const query = `
            SELECT r.*
            FROM rooms r
            WHERE r.id NOT IN (
                SELECT room_id FROM bookings
                WHERE check_in <= NOW() AND check_out IS NULL
            )
            ORDER BY r.room_name ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/bookings/today', async (_req, res) => {
    try {
        const result = await pool.query(`
            ${GET_BOOKINGS_QUERY}
            WHERE DATE(b.check_in) = CURRENT_DATE
            ORDER BY b.check_in ASC
        `);
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/bookings/upcoming', async (_req, res) => {
    try {
        const result = await pool.query(`
            ${GET_BOOKINGS_QUERY}
            WHERE b.check_in > NOW() AND b.check_out IS NULL
            ORDER BY b.check_in ASC
        `);
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/init', async (_req, res) => {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        room_name TEXT UNIQUE NOT NULL,
        capacity INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        person_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        check_in TIMESTAMP NOT NULL,
        check_out TIMESTAMP,
        status TEXT, -- Will be derived but kept for manual overrides if needed
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Migration: Remove location from rooms, make status derived
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='rooms' AND COLUMN_NAME='location') THEN
          ALTER TABLE rooms DROP COLUMN location;
        END IF;

        ALTER TABLE bookings ALTER COLUMN check_out DROP NOT NULL;
        
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='bookings' AND COLUMN_NAME='status') THEN
          ALTER TABLE bookings ADD COLUMN status TEXT;
        END IF;
      END $$;
    `);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
});

const PORT = parseInt(process.env.PORT as string) || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
