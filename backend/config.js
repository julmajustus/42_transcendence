import dotenv from 'dotenv';
dotenv.config();  // loads .env → process.env

// 1) Read each piece, falling back to safe defaults:
export const PROTOCOL = process.env.VITE_PROTOCOL ?? 'http';
export const HOST     = process.env.VITE_BACKEND_HOST ?? 'localhost';
export const FRONTEND_PORT     = process.env.VITE_FRONTEND_PORT ?? '5173';
export const BACKEND_PORT     = process.env.VITE_BACKEND_PORT ?? '8888';

// 2) Compose your URLs:
export const BACKEND_URL = `${PROTOCOL}://${HOST}:${BACKEND_PORT}`;
export const FRONTEND_URL = `${PROTOCOL}://${HOST}:${FRONTEND_PORT}`;

// 3) Warn if any piece was missing:
if (!process.env.VITE_PROTOCOL) {
  console.warn(
    '⚠️ PROTOCOL not set in .env—using http. ' +
    'Add VITE_PROTOCOL=http or https to your .env'
  );
}
if (!process.env.VITE_BACKEND_HOST) {
  console.warn(
    '⚠️ BACKEND_HOST not set in .env—using localhost. ' +
    'Add VITE_BACKEND_HOST=your_host to your .env'
  );
}
if (!process.env.VITE_BACKEND_PORT) {
  console.warn(
    '⚠️ BACKEND_PORT not set in .env—using 8888. ' +
    'Add VITE_BACKEND_PORT=your_port to your .env'
  );
}
if (!process.env.VITE_FRONTEND_PORT) {
	console.warn(
	  '⚠️ BACKEND_PORT not set in .env—using 5173. ' +
	  'Add VITE_FRONTEND_PORT=your_port to your .env'
	);
  }