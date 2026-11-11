import { headers } from 'next/headers';

// Endereço do site (ex.: https://central.suaempresa.com.br), descoberto pela própria requisição.
export function origem() {
  const h = headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
