import { criarCliente } from './client';
export const api = criarCliente(process.env.EXPO_PUBLIC_API_URL || 'https://dsm-g09-pi6-2026-2.onrender.com');
