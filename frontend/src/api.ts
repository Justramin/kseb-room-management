const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000/api';

export const request = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers = new Headers(options.headers || {});

    headers.set('Content-Type', 'application/json');
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
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
            localStorage.removeItem('token');
            window.location.href = '/login';
        }

        throw new Error(errorMessage);
    }

    return response.json();
};
