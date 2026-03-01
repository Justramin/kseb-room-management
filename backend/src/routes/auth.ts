import { Router } from "express";

const router = Router();

router.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (username === "KSEBKerala" && password === "1234") {
        return res.json({
            success: true,
            username
        });
    }

    return res.status(401).json({
        success: false,
        message: "Invalid credentials"
    });
});

export default router;
