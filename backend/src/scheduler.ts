import { pool } from './db';

// This URL must be the actual public URL of your Render web service
const RENDER_URL = 'https://kseb-room-management.onrender.com';

export const initScheduler = () => {
    console.log('Internal Scheduler Initialized.');

    // 1. Keep-Alive Ping (Runs every 10 minutes)
    // Prevents Render from spinning down the free-tier service due to inactivity.
    setInterval(async () => {
        try {
            const response = await fetch(`${RENDER_URL}/api/health`);
            if (response.ok) {
                console.log(`[Keep-Alive] Ping successful at ${new Date().toISOString()}`);
            } else {
                console.warn(`[Keep-Alive] Ping returned status ${response.status}`);
            }
        } catch (err: any) {
            console.error(`[Keep-Alive] Ping failed:`, err.message);
        }
    }, 10 * 60 * 1000); // 10 minutes

    // 2. Auto-Checkout Task (Runs every 15 minutes)
    // Checks for bookings where the check-out time has passed and they are not yet checked out.
    setInterval(async () => {
        try {
            console.log(`[Auto-Checkout] Running at ${new Date().toISOString()}`);

            // Check out rooms
            const result = await pool.query(
                `UPDATE bookings 
                 SET actual_check_out = NOW() 
                 WHERE actual_check_out IS NULL AND check_out IS NOT NULL AND check_out <= NOW() 
                 RETURNING *`
            );

            // Check out halls
            const hallResult = await pool.query(
                `UPDATE hall_bookings 
                 SET actual_check_out = NOW() 
                 WHERE actual_check_out IS NULL AND check_out IS NOT NULL AND check_out <= NOW() 
                 RETURNING *`
            );

            const totalCheckedOut = (result.rowCount || 0) + (hallResult.rowCount || 0);

            if (totalCheckedOut > 0) {
                console.log(`[Auto-Checkout] Successfully checked out ${totalCheckedOut} total bookings.`);
            } else {
                console.log(`[Auto-Checkout] No bookings required checkout.`);
            }
        } catch (err: any) {
            console.error(`[Auto-Checkout] Task failed:`, err.message);
        }
    }, 15 * 60 * 1000); // 15 minutes
};
