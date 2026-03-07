import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { pool } from './db';
import authRoutes from './routes/auth';
import { initScheduler } from './scheduler';

dotenv.config();
process.env.TZ = 'UTC';

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
    const { room_name, capacity, attached_bathroom } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO rooms (room_name, capacity, attached_bathroom) VALUES ($1, $2, $3) RETURNING *',
            [room_name, capacity, attached_bathroom || false]
        );
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/rooms/:id', async (req, res) => {
    const { id } = req.params;
    const { room_name, capacity, attached_bathroom } = req.body;
    try {
        const result = await pool.query(
            'UPDATE rooms SET room_name = $1, capacity = $2, attached_bathroom = $3 WHERE id = $4 RETURNING *',
            [room_name, capacity, attached_bathroom || false, id]
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

// Halls Routes
app.get('/api/halls', async (_req, res) => {
    try {
        const result = await pool.query('SELECT * FROM halls ORDER BY id DESC');
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/halls', async (req, res) => {
    const { hall_name, capacity, attached_bathroom } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO halls (hall_name, capacity, attached_bathroom) VALUES ($1, $2, $3) RETURNING *',
            [hall_name, capacity, attached_bathroom || false]
        );
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/halls/:id', async (req, res) => {
    const { id } = req.params;
    const { hall_name, capacity, attached_bathroom } = req.body;
    try {
        const result = await pool.query(
            'UPDATE halls SET hall_name = $1, capacity = $2, attached_bathroom = $3 WHERE id = $4 RETURNING *',
            [hall_name, capacity, attached_bathroom || false, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Hall not found' });
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/halls/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM halls WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Bookings Routes
const GET_BOOKINGS_QUERY = `
  SELECT b.id, b.room_id, b.person_name, b.phone, b.check_in, COALESCE(b.actual_check_out, b.check_out) as check_out, b.created_at,
    r.room_name, 'room' as type,
    CASE 
      WHEN b.actual_check_out IS NOT NULL THEN 'Checked Out'
      WHEN b.check_in > NOW() THEN 'Scheduled'
      ELSE 'Checked In'
    END as status
  FROM bookings b 
  JOIN rooms r ON b.room_id = r.id 
`;

const GET_HALL_BOOKINGS_QUERY = `
  SELECT b.id, b.hall_id, b.person_name, b.phone, b.check_in, COALESCE(b.actual_check_out, b.check_out) as check_out, b.created_at,
    h.hall_name as room_name, 'hall' as type,
    CASE 
      WHEN b.actual_check_out IS NOT NULL THEN 'Checked Out'
      WHEN b.check_in > NOW() THEN 'Scheduled'
      ELSE 'Checked In'
    END as status
  FROM hall_bookings b 
  JOIN halls h ON b.hall_id = h.id 
`;

app.get('/api/bookings', async (req, res) => {
    try {
        const unifiedQuery = `
            (${GET_BOOKINGS_QUERY})
            UNION ALL
            (${GET_HALL_BOOKINGS_QUERY})
            ORDER BY check_in DESC
        `;
        const result = await pool.query(unifiedQuery);
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bookings', async (req, res) => {
    const { facility_type, facility_id, guest_name, person_name, phone, check_in, check_out } = req.body;
    const name = guest_name || person_name;

    if (!check_in) {
        return res.status(400).json({ error: 'Check-in time is required.' });
    }
    if (!facility_id) {
        return res.status(400).json({ error: 'Facility ID is required.' });
    }

    const type = facility_type || 'room';
    const checkInDate = new Date(check_in);
    const finalCheckOut = (check_out && check_out !== "") ? check_out : null;
    const checkOutDate = finalCheckOut ? new Date(finalCheckOut) : new Date(checkInDate.getTime() + 60 * 60 * 1000);

    const tableName = type === 'room' ? 'bookings' : 'hall_bookings';
    const idColumn = type === 'room' ? 'room_id' : 'hall_id';

    try {
        // Step 3: Fix overlap logic
        // Condition: existing.check_in < new_check_out AND (existing.check_out IS NULL OR existing.check_out > new_check_in)
        const overlapResult = await pool.query(`
            SELECT * FROM ${tableName} 
            WHERE ${idColumn} = $1 
            AND (check_in < $3 AND (check_out IS NULL OR check_out > $2))
        `, [facility_id, checkInDate, checkOutDate]);

        if (overlapResult.rows.length > 0) {
            return res.status(400).json({ error: `This ${type} already has an active or scheduled booking during this time.` });
        }

        const result = await pool.query(
            `INSERT INTO ${tableName} (${idColumn}, person_name, phone, check_in, check_out) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [facility_id, name, phone, check_in, finalCheckOut]
        );
        res.json({ ...result.rows[0], type });
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
            "UPDATE bookings SET actual_check_out = NOW(), status = 'Checked Out' WHERE id = $1 RETURNING *",
            [id]
        );
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/bookings/:id', async (req, res) => {
    const { id } = req.params;
    const { facility_id, room_id, guest_name, person_name, phone, check_in, check_out } = req.body;
    const fId = facility_id || room_id;
    const name = guest_name || person_name;

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
            [fId, name, phone, check_in, finalCheckOut, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/halls/bookings', async (req, res) => {
    try {
        const result = await pool.query(`${GET_HALL_BOOKINGS_QUERY} ORDER BY b.check_in DESC`);
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/halls/bookings', (req, res, next) => {
    req.body.facility_type = 'hall';
    const mainHandler = app._router.stack.find((s: any) => s.route && s.route.path === '/api/bookings' && s.route.methods.post);
    if (mainHandler) return mainHandler.route.stack[0].handle(req, res, next);
    res.status(500).json({ error: 'Core handler not found' });
});

app.put('/api/halls/bookings/:id', async (req, res) => {
    const { id } = req.params;
    const { facility_id, hall_id, guest_name, person_name, phone, check_in, check_out } = req.body;
    const fId = facility_id || hall_id;
    const name = guest_name || person_name;

    if (!check_in) return res.status(400).json({ error: 'Check-in time is required.' });

    const finalCheckOut = (check_out && check_out !== "") ? check_out : null;

    try {
        const result = await pool.query(
            'UPDATE hall_bookings SET hall_id = $1, person_name = $2, phone = $3, check_in = $4, check_out = $5 WHERE id = $6 RETURNING *',
            [fId, name, phone, check_in, finalCheckOut, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/halls/bookings/:id/checkout', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "UPDATE hall_bookings SET actual_check_out = NOW(), status = 'Checked Out' WHERE id = $1 RETURNING *",
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/halls/bookings/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM hall_bookings WHERE id = $1', [id]);
        res.json({ success: true });
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

app.get('/api/halls/availability', async (req, res) => {
    const { check_in, check_out } = req.query;
    try {
        const hallsResult = await pool.query('SELECT * FROM halls ORDER BY hall_name ASC');
        const halls = hallsResult.rows;

        let timeCheckIn = check_in ? new Date(check_in as string) : new Date();
        let timeCheckOut = check_out ? new Date(check_out as string) : new Date(timeCheckIn.getTime() + 60 * 60 * 1000);

        const overlapResult = await pool.query(`
            SELECT hall_id FROM hall_bookings 
            WHERE (check_in < $2 AND (COALESCE(actual_check_out, check_out) IS NULL OR COALESCE(actual_check_out, check_out) > $1))
        `, [timeCheckIn, timeCheckOut]);

        const bookedIds = new Set(overlapResult.rows.map(r => r.hall_id));

        const availability = halls.map(h => ({
            ...h,
            status: bookedIds.has(h.id) ? 'Booked' : 'Available'
        }));

        res.json(availability);
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
            WHERE b.check_in <= NOW() AND b.actual_check_out IS NULL
            ORDER BY b.check_in ASC
        `);

        // Today's Bookings (check-ins today)
        const todayBookingsCountResult = await pool.query(`
            SELECT COUNT(*) FROM bookings
            WHERE DATE(check_in AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = DATE(NOW() AT TIME ZONE 'Asia/Kolkata')
        `);

        // Available Rooms (not currently checked in)
        const availableCount = totalRooms - currentlyBookedResult.rows.length;

        // Next upcoming booking
        const nextBookingResult = await pool.query(`
            ${GET_BOOKINGS_QUERY}
            WHERE b.check_in > NOW() AND b.actual_check_out IS NULL
            ORDER BY b.check_in ASC
            LIMIT 1
        `);

        // Hall Stats
        const hallsCountResult = await pool.query('SELECT COUNT(*) FROM halls');
        const totalHalls = parseInt(hallsCountResult.rows[0].count, 10);

        const currentlyBookedHallsResult = await pool.query(`
            ${GET_HALL_BOOKINGS_QUERY}
            WHERE b.check_in <= NOW() AND b.actual_check_out IS NULL
            ORDER BY b.check_in ASC
        `);

        const todayHallBookingsCountResult = await pool.query(`
            SELECT COUNT(*) FROM hall_bookings
            WHERE DATE(check_in AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = DATE(NOW() AT TIME ZONE 'Asia/Kolkata')
        `);

        const availableHallsCount = totalHalls - currentlyBookedHallsResult.rows.length;

        // Next upcoming hall booking
        const nextHallBookingResult = await pool.query(`
            ${GET_HALL_BOOKINGS_QUERY}
            WHERE b.check_in > NOW() AND b.actual_check_out IS NULL
            ORDER BY b.check_in ASC
            LIMIT 1
        `);

        res.json({
            rooms: {
                totalRooms,
                bookedRoomsCountToday: parseInt(todayBookingsCountResult.rows[0].count, 10),
                availableRoomsCountToday: availableCount,
                nextUpcomingBooking: nextBookingResult.rows[0] || null,
                currentlyBookedRooms: currentlyBookedResult.rows
            },
            halls: {
                totalHalls,
                bookedHallsCountToday: parseInt(todayHallBookingsCountResult.rows[0].count, 10),
                availableHallsCountToday: availableHallsCount,
                nextUpcomingBooking: nextHallBookingResult.rows[0] || null,
                currentlyBookedHalls: currentlyBookedHallsResult.rows
            }
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
        let timeCheckOut = check_out ? new Date(check_out as string) : new Date(timeCheckIn.getTime() + 60 * 60 * 1000);

        if (isNaN(timeCheckIn.getTime())) timeCheckIn = new Date();
        if (isNaN(timeCheckOut.getTime())) timeCheckOut = new Date(timeCheckIn.getTime() + 60 * 60 * 1000);

        const overlapResult = await pool.query(`
            SELECT room_id FROM bookings 
            WHERE (check_in < $2 AND (COALESCE(actual_check_out, check_out) IS NULL OR COALESCE(actual_check_out, check_out) > $1))
        `, [timeCheckIn, timeCheckOut]);

        const bookedIds = new Set(overlapResult.rows.map(r => r.room_id));

        const availability = rooms.map(r => ({
            ...r,
            status: bookedIds.has(r.id) ? 'Booked' : 'Available'
        }));

        res.json(availability);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/rooms/summary', async (_req, res) => {
    try {
        const totalRoomsResult = await pool.query('SELECT COUNT(*) FROM rooms');
        const checkedInResult = await pool.query("SELECT COUNT(*) FROM bookings WHERE check_in <= NOW() AND actual_check_out IS NULL");

        const roomsResult = await pool.query('SELECT * FROM rooms ORDER BY room_name ASC');
        const bookingsResult = await pool.query(`${GET_BOOKINGS_QUERY} WHERE b.check_in <= NOW() AND b.actual_check_out IS NULL`);

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
            SELECT r.id, r.id as room_id, r.room_name, r.capacity
            FROM rooms r
            WHERE r.id NOT IN (
                SELECT room_id FROM bookings
                WHERE check_in <= NOW() AND actual_check_out IS NULL
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
            WHERE DATE(b.check_in AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = DATE(NOW() AT TIME ZONE 'Asia/Kolkata')
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
            WHERE b.check_in > NOW() AND b.actual_check_out IS NULL
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
        actual_check_out TIMESTAMP,
        status TEXT, -- Will be derived but kept for manual overrides if needed
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Migration: Add attached_bathroom to rooms, create halls and hall_bookings
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='rooms' AND COLUMN_NAME='attached_bathroom') THEN
          ALTER TABLE rooms ADD COLUMN attached_bathroom BOOLEAN DEFAULT FALSE;
        END IF;

        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='rooms' AND COLUMN_NAME='location') THEN
          ALTER TABLE rooms DROP COLUMN location;
        END IF;

        ALTER TABLE bookings ALTER COLUMN check_out DROP NOT NULL;
        
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='bookings' AND COLUMN_NAME='status') THEN
          ALTER TABLE bookings ADD COLUMN status TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='bookings' AND COLUMN_NAME='actual_check_out') THEN
          ALTER TABLE bookings ADD COLUMN actual_check_out TIMESTAMP;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS halls (
        id SERIAL PRIMARY KEY,
        hall_name TEXT UNIQUE NOT NULL,
        capacity INTEGER NOT NULL,
        attached_bathroom BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS hall_bookings (
        id SERIAL PRIMARY KEY,
        hall_id INTEGER REFERENCES halls(id) ON DELETE CASCADE,
        person_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        check_in TIMESTAMP NOT NULL,
        check_out TIMESTAMP,
        actual_check_out TIMESTAMP,
        status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='hall_bookings' AND COLUMN_NAME='actual_check_out') THEN
          ALTER TABLE hall_bookings ADD COLUMN actual_check_out TIMESTAMP;
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
// Cron endpoint for automated tasks (e.g., auto-checkout)
app.post('/api/cron/auto-checkout', async (req, res) => {
    const token = req.query.token as string;
    if (!token || token !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const result = await pool.query(
            `UPDATE bookings SET check_out = NOW() WHERE check_out IS NULL AND check_in <= NOW() RETURNING *`
        );
        res.json({ updated: result.rowCount, bookings: result.rows });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});


const PORT = parseInt(process.env.PORT as string) || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);

    // Start the internal scheduler (Keep-Alive + Auto-Checkout)
    if (process.env.NODE_ENV !== 'test') {
        initScheduler();
    }
});
