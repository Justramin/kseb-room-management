export const API = import.meta.env.VITE_API_URL || "https://kseb-room-management.onrender.com/api";

export const request = async (endpoint: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    const response = await fetch(`${API}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorMessage = 'An error occurred';
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } catch (err) { }

        if (response.status === 401) {
            localStorage.removeItem('user');
            window.location.href = '/login';
        }

        throw new Error(errorMessage);
    }

    return response.json();
};
