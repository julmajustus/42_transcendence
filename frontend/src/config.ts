export const PROTOCOL = import.meta.env.VITE_PROTOCOL ?? 'http'
export const HOST     = import.meta.env.VITE_BACKEND_HOST ?? 'localhost';
export const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT ?? '8888';

export const API_URL = `${PROTOCOL}://${HOST}:${BACKEND_PORT}`;
export const WS_URL  = `ws://${HOST}:${BACKEND_PORT}`;

if (!import.meta.env.VITE_PROTOCOL ) {
	console.warn(
		'⚠️ VITE_PROTOCOL is undefined—falling back to http. ' +
		'Be sure to set it in your .env!'
	);
}

if (!import.meta.env.VITE_BACKEND_HOST) {
	console.warn(
		'⚠️ VITE_BACKEND_HOST is undefined—falling back to localhost. ' +
		'Be sure to set it in your .env!'
	);
}

if (!import.meta.env.VITE_BACKEND_PORT) {
	console.warn(
		'⚠️ VITE_BACKEND_PORT is undefined—falling back to 8888. ' +
		'Be sure to set it in your .env!'
	);
}