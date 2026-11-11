// Descobre o id do usuário logado da forma mais rápida disponível.
// getClaims() confere o token localmente (sem ir até o Supabase) quando o projeto usa
// chaves de assinatura assimétricas, que é o padrão dos projetos novos. Se não der,
// cai para getUser(), que confere no servidor do Supabase.
export async function usuarioId(supabase) {
  if (typeof supabase.auth.getClaims === 'function') {
    try {
      const { data, error } = await supabase.auth.getClaims();
      if (!error && data?.claims?.sub) return data.claims.sub;
    } catch {
      // segue para o getUser
    }
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
