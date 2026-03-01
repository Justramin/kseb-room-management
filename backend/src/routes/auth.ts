import { Router } from "express";

const router = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

router.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (
        username === ADMIN_USERNAME &&
        password === ADMIN_PASSWORD
    ) {
        return res.json({
            success: true,
            username
        });
    }

    return res.status(401).json({
        success: false,
        message: "Invalid username or password"
    });
});

export default router;
