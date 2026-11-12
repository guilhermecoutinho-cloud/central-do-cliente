// Não há login OAuth na Central: o conector do Claude é liberado pela chave no endereço.
// Responder 404 aqui faz o Claude conectar direto, sem tentar se registrar.

function naoExiste() {
  return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
}

export const GET = naoExiste;
export const POST = naoExiste;
