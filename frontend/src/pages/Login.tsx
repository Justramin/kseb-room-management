import { useState } from 'react';
import { Lock, User, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { API } from '../api';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const api_endpoint = `${API}/auth/login`;
        console.log("Attempting login at URL:", api_endpoint);

        try {
            const res = await fetch(api_endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ username, password })
            });

            // Prevent JSON parsing error if server returns HTML (e.g. 404/500)
            if (!res.ok) {
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const data = await res.json();
                    throw new Error(data.message || "Login failed");
                } else {
                    throw new Error(`Server returned HTML instead of JSON (${res.status}). Verify API URL.`);
                }
            }

            const data = await res.json();

            if (data.success) {
                localStorage.setItem("user", data.username);
                toast.success('Welcome back, Admin!');
                window.location.href = "/dashboard";
            } else {
                toast.error(data.message || "Invalid login");
            }
        } catch (err: any) {
            console.error("Critical Login Error:", err);
            toast.error(err.message || "Server connection failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'var(--primary-color)',
                        color: 'white',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem'
                    }}>
                        <Lock size={32} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>KSEB Login</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Room Management System</p>
                </div>

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="flex items-center gap-2"><User size={14} /> Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="Enter admin username"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="flex items-center gap-2"><Lock size={14} /> Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                        />
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1rem', padding: '12px' }}>
                        {loading ? <Loader2 className="spinner" size={20} /> : 'Login to Dashboard'}
                    </button>
                </form>
            </div>
        </div>
    );
}
