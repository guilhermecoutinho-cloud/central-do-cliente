import { headers } from 'next/headers';
import { getPerfil } from '@/lib/perfil';
import CopiarTexto from '@/components/CopiarTexto';
import SemAcesso from '@/components/SemAcesso';

// Passo a passo para ligar a Central ao Claude (só o administrador vê o endereço secreto).
export default async function ConectarClaude() {
  const perfil = await getPerfil();
  if (!perfil.admin) return <SemAcesso setor="esta página" />;

  const chave = (process.env.CLAUDE_CONECTOR_CHAVE || '').trim();
  const temServico = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const h = headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || 'https';
  const url = `${proto}://${host}/api/claude/${chave}`;
  const pronto = chave.length >= 24 && temServico;

  return (
    <>
      <div className="topo">
        <div className="pilha-p">
          <span className="eyebrow">Só o administrador vê esta página</span>
          <h1 className="titulo">Conectar ao Claude</h1>
          <span className="small" style={{ color: 'var(--texto3)' }}>
            Mande as tarefas no chat do Claude e elas aparecem direto nos quadros da Central.
          </span>
        </div>
        <span className={'pill ' + (pronto ? 't-green' : 't-amber')}>{pronto ? 'Pronto para conectar' : 'Falta configurar'}</span>
      </div>

      <div className="grid-painel">
        <section className={'card faixa ' + (chave.length >= 24 ? 'tom-green' : 'tom-amber')}>
          <h2 className="h2">1. Variáveis na Vercel</h2>
          <p className="muted" style={{ margin: 0 }}>
            Em Vercel → Project → Settings → Environment Variables, adicione as duas e faça um Redeploy.
          </p>
          <div className="lista-alerta">
            <div style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <code>CLAUDE_CONECTOR_CHAVE</code>
              <span className={'pill ' + (chave.length >= 24 ? 't-green' : 't-coral')}>{chave.length >= 24 ? 'Configurada' : 'Faltando'}</span>
            </div>
            <div style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <code>SUPABASE_SERVICE_ROLE_KEY</code>
              <span className={'pill ' + (temServico ? 't-green' : 't-coral')}>{temServico ? 'Configurada' : 'Faltando'}</span>
            </div>
          </div>
          <span className="small muted">
            A service role key fica no Supabase em Project Settings → API Keys (secret / service_role). Ela nunca vai para o navegador.
          </span>
        </section>

        <section className={'card faixa ' + (pronto ? 'tom-blue' : '')}>
          <h2 className="h2">2. Adicionar no Claude</h2>
          <p className="muted" style={{ margin: 0 }}>
            No Claude: Configurações → Conectores → Adicionar conector personalizado. Nome: Central da Empresa. Cole este endereço:
          </p>
          {pronto ? (
            <>
              <p className="msg" style={{ wordBreak: 'break-all', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{url}</p>
              <CopiarTexto texto={url} rotulo="Copiar endereço" />
            </>
          ) : (
            <div className="aviso t-amber">O endereço aparece aqui depois do passo 1.</div>
          )}
          <span className="small muted">
            Trate esse endereço como uma senha: quem tiver ele consegue criar e mudar tarefas. Para trocar, mude a CLAUDE_CONECTOR_CHAVE na Vercel.
          </span>
        </section>
      </div>

      <section className="card">
        <h2 className="h2">3. Usar no chat</h2>
        <div className="lista-alerta">
          <div>“Cria no marketing: criativos do Padrinho Podcast para sexta, prioridade P0, comigo.”</div>
          <div>“Importa a aba Marketing da minha planilha de tarefas para a Central.”</div>
          <div>“O que está atrasado no marketing?”</div>
          <div>“Marca o disparo do GI Alphaville como feito e comenta que foi às 14h.”</div>
        </div>
      </section>
    </>
  );
}
