export const getApiUrl = (url: string) => {
	const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
	return url.startsWith('http') ? url : `${API_URL}${url}`;
};
