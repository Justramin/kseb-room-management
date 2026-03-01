import { LogOut, User } from 'lucide-react';

export default function Header() {
    const username = localStorage.getItem('user') || 'Admin';

    const handleLogout = () => {
        localStorage.removeItem('user');
        window.location.href = "/";
    };

    return (
        <header className="main-header">
            <div className="header-brand">
                <h1>KSEB Room Management System</h1>
            </div>
            <div className="header-actions">
                <div className="user-profile">
                    <User size={18} />
                    <span>{username}</span>
                </div>
                <button onClick={handleLogout} className="logout-btn">
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </div>
        </header>
    );
}
