import Link from 'next/link';
import { criarCliente } from '@/app/actions';
import { PRODUTOS } from '@/lib/util';
import ColarMatricula from '@/components/ColarMatricula';

export default function NovoCliente({ searchParams }) {
  const manual = searchParams?.modo === 'manual';
  return (
    <>
      <div className="topo anim">
        <div>
          <span className="eyebrow">Sucesso do Cliente</span>
          <h1 className="titulo">Novo cliente</h1>
        </div>
        <div className="segmentos" role="group" aria-label="Como cadastrar">
          <Link href="/clientes/novo" className={manual ? '' : 'ativo'}>Colar dados</Link>
          <Link href="/clientes/novo?modo=manual" className={manual ? 'ativo' : ''}>Preencher à mão</Link>
        </div>
      </div>
      {!manual ? <ColarMatricula /> : (
      <form action={criarCliente} className="card anim anim-1" style={{ maxWidth: 900 }}>
        <h2 className="h2">Contato principal</h2>
        <div className="form-grid">
          <div className="campo"><label htmlFor="nome">Nome completo *</label><input id="nome" name="nome" required /></div>
          <div className="campo"><label htmlFor="cargo">Cargo</label><input id="cargo" name="cargo" placeholder="Sócio" /></div>
          <div className="campo"><label htmlFor="telefone">Telefone</label><input id="telefone" name="telefone" type="tel" /></div>
          <div className="campo"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" /></div>
        </div>
        <h2 className="h2" style={{ marginTop: 8 }}>Empresa e produto</h2>
        <div className="form-grid">
          <div className="campo"><label htmlFor="empresa">Empresa *</label><input id="empresa" name="empresa" required /></div>
          <div className="campo">
            <label htmlFor="produto">Produto *</label>
            <select id="produto" name="produto" required defaultValue="">
              <option value="" disabled>Escolha</option>
              {PRODUTOS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="campo"><label htmlFor="data_inicio">Data de início (contrato assinado)</label><input id="data_inicio" name="data_inicio" type="date" /></div>
          <div className="campo"><label htmlFor="encontros_contratados">Encontros contratados</label><input id="encontros_contratados" name="encontros_contratados" type="number" min="0" defaultValue="0" /></div>
          <div className="campo inteiro"><label htmlFor="condicoes">Condições</label><input id="condicoes" name="condicoes" placeholder="Forma de pagamento, bônus, observações da venda" /></div>
        </div>
        <h2 className="h2" style={{ marginTop: 8 }}>Quem cuida</h2>
        <div className="form-grid">
          <div className="campo"><label htmlFor="responsavel">Responsável pelo onboarding</label><input id="responsavel" name="responsavel" placeholder="Tati" /></div>
          <div className="campo"><label htmlFor="substituto">Substituto</label><input id="substituto" name="substituto" /></div>
          <div className="campo"><label htmlFor="closer">Quem vendeu</label><input id="closer" name="closer" /></div>
        </div>
        <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>Cadastrar e abrir o onboarding</button>
      </form>
      )}
    </>
  );
}
