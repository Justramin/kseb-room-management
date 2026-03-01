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
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
}));

app.use(express.json());

// Auth Routes
app.use('/api/auth', authRoutes);

// Health Check
app.get('/api/health', (_req, res) => {
    res.json({ status: "ok" });
});

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
    const { room_name, capacity, location } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO rooms (room_name, capacity, location) VALUES ($1, $2, $3) RETURNING *',
            [room_name, capacity, location]
        );
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/rooms/:id', async (req, res) => {
    const { id } = req.params;
    const { room_name, capacity, location } = req.body;
    try {
        const result = await pool.query(
            'UPDATE rooms SET room_name = $1, capacity = $2, location = $3 WHERE id = $4 RETURNING *',
            [room_name, capacity, location, id]
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
app.get('/api/bookings', async (req, res) => {
    try {
        const { start, end } = req.query;
        let query = `
      SELECT b.*, r.room_name 
      FROM bookings b 
      JOIN rooms r ON b.room_id = r.id 
    `;
        const params: any[] = [];
        if (start && end) {
            query += ` WHERE b.check_in < $2 AND b.check_out > $1 `;
            params.push(start, end);
        }
        query += ` ORDER BY b.check_in ASC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bookings', async (req, res) => {
    const { room_id, person_name, phone, check_in, check_out } = req.body;
    try {
        const overlap = await pool.query(`
      SELECT * FROM bookings 
      WHERE room_id = $1 
      AND ($2 < check_out AND $3 > check_in)
    `, [room_id, check_in, check_out]);

        if (overlap.rows.length > 0) {
            return res.status(400).json({ error: 'Overlapping booking exists for this room.' });
        }

        const result = await pool.query(
            'INSERT INTO bookings (room_id, person_name, phone, check_in, check_out) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [room_id, person_name, phone, check_in, check_out]
        );
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/bookings/:id', async (req, res) => {
    const { id } = req.params;
    const { room_id, person_name, phone, check_in, check_out } = req.body;
    try {
        const overlap = await pool.query(`
      SELECT * FROM bookings 
      WHERE room_id = $1 
      AND id != $2
      AND ($3 < check_out AND $4 > check_in)
    `, [room_id, id, check_in, check_out]);

        if (overlap.rows.length > 0) {
            return res.status(400).json({ error: 'Overlapping booking exists for this room.' });
        }

        const result = await pool.query(
            'UPDATE bookings SET room_id = $1, person_name = $2, phone = $3, check_in = $4, check_out = $5 WHERE id = $6 RETURNING *',
            [room_id, person_name, phone, check_in, check_out, id]
        );
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

        // Currently booked rooms detailed info
        const currentlyBookedResult = await pool.query(`
            SELECT b.*, r.room_name, r.capacity 
            FROM bookings b 
            JOIN rooms r ON b.room_id = r.id 
            WHERE b.check_in <= NOW() AND b.check_out > NOW()
            ORDER BY b.check_out ASC
        `);

        // Today's stats (any booking that overlaps with today)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const todayBookingsResult = await pool.query(`
            SELECT DISTINCT room_id FROM bookings
            WHERE check_in < $2 AND check_out > $1
        `, [startOfDay, endOfDay]);

        const bookedTodayCount = todayBookingsResult.rows.length;
        const availableTodayCount = totalRooms - bookedTodayCount;

        // Next upcoming booking
        const nextBookingResult = await pool.query(`
            SELECT b.*, r.room_name 
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            WHERE b.check_in > NOW()
            ORDER BY b.check_in ASC
            LIMIT 1
        `);

        res.json({
            totalRooms,
            bookedRoomsCountToday: bookedTodayCount,
            availableRoomsCountToday: availableTodayCount,
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

        const bookedRoomIds = new Set(overlapResult.rows.map(r => r.id));

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

app.get('/api/rooms/available', async (_req, res) => {
    try {
        const query = `
            SELECT id, room_name as name, capacity, location, 'Available' as status
            FROM rooms
            WHERE id NOT IN (
                SELECT room_id FROM bookings
                WHERE check_in <= NOW() AND check_out > NOW()
            )
            ORDER BY room_name ASC
        `;
        const result = await pool.query(query);
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
        location TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        person_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        check_in TIMESTAMP NOT NULL,
        check_out TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
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
