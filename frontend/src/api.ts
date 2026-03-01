export const API = import.meta.env.VITE_API_URL ?? "https://kseb-room-management.onrender.com/api";

console.log("Production API URL:", API);

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
            // Only try to parse JSON if the content type is JSON to avoid "Unexpected token '<'"
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } else {
                errorMessage = `Server Error: ${response.status} ${response.statusText}`;
            }
        } catch (err) {
            errorMessage = `Network or Server Error (${response.status})`;
        }

        if (response.status === 401) {
            localStorage.removeItem('user');
            window.location.href = '/login';
        }

        throw new Error(errorMessage);
    }

    return response.json();
};
