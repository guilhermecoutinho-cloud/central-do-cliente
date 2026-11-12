// Lê o bloco "Dados para matrícula" colado do WhatsApp/e-mail e devolve os campos do cliente.
//
// Formato esperado (a ordem e os espaços não importam):
//   NOME COMPLETO: ...
//   DATA DE NASCIMENTO: ...
//   EMPRESA: ...   CPF: ...   RG: ...   E-MAIL: ...   CELULAR: ...
//   ENDEREÇO: ...  BAIRRO: ...  CIDADE: ...  ESTADO: ...  CEP: ...

export const CAMPOS_MATRICULA = [
  { chave: 'nome', rotulo: 'Nome completo', obrigatorio: true },
  { chave: 'data_nascimento', rotulo: 'Data de nascimento', tipo: 'date' },
  { chave: 'empresa', rotulo: 'Empresa', obrigatorio: true },
  { chave: 'cpf', rotulo: 'CPF' },
  { chave: 'rg', rotulo: 'RG' },
  { chave: 'email', rotulo: 'E-mail', tipo: 'email' },
  { chave: 'celular', rotulo: 'Celular', tipo: 'tel' },
  { chave: 'endereco', rotulo: 'Endereço', largo: true },
  { chave: 'bairro', rotulo: 'Bairro' },
  { chave: 'cidade', rotulo: 'Cidade' },
  { chave: 'estado', rotulo: 'Estado' },
  { chave: 'cep', rotulo: 'CEP' },
];

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Qual campo cada rótulo representa
const ROTULOS = [
  [/^(nome completo|nome|nome do aluno|nome do cliente|aluno|cliente)$/, 'nome'],
  [/^(data de nascimento|data nascimento|nascimento|dt nascimento|data de nasc|nasc)$/, 'data_nascimento'],
  [/^(empresa|nome da empresa|razao social)$/, 'empresa'],
  [/^cpf$/, 'cpf'],
  [/^(rg|identidade)$/, 'rg'],
  [/^(e mail|email|e mail principal)$/, 'email'],
  [/^(celular|telefone|whatsapp|whats|fone|tel)$/, 'celular'],
  [/^(endereco|endereco completo|rua|logradouro)$/, 'endereco'],
  [/^bairro$/, 'bairro'],
  [/^(cidade|municipio)$/, 'cidade'],
  [/^(estado|uf)$/, 'estado'],
  [/^cep$/, 'cep'],
];

function campoDoRotulo(rotulo) {
  const n = norm(rotulo);
  const achado = ROTULOS.find(([re]) => re.test(n));
  return achado ? achado[1] : null;
}

const ESTADOS = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA', ceara: 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES',
  goias: 'GO', maranhao: 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS', 'minas gerais': 'MG', para: 'PA', paraiba: 'PB',
  parana: 'PR', pernambuco: 'PE', piaui: 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS',
  rondonia: 'RO', roraima: 'RR', 'santa catarina': 'SC', 'sao paulo': 'SP', sergipe: 'SE', tocantins: 'TO',
};

const so = (v) => String(v || '').replace(/\D/g, '');

export function formatarCPF(v) {
  const d = so(v);
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : String(v || '').trim();
}

export function formatarCEP(v) {
  const d = so(v);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : String(v || '').trim();
}

export function formatarCelular(v) {
  let d = so(v);
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return String(v || '').trim();
}

// DD/MM/AAAA (ou DD-MM-AAAA, DD.MM.AA) → AAAA-MM-DD
export function lerNascimento(v) {
  const t = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[/.\- ](\d{1,2})[/.\- ](\d{2,4})$/);
  if (!m) return '';
  let ano = Number(m[3]);
  if (ano < 100) ano += ano > 30 ? 1900 : 2000;
  const iso = `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(iso + 'T12:00:00Z');
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? '' : iso;
}

function limparValor(campo, v) {
  const t = String(v || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  switch (campo) {
    case 'data_nascimento':
      return lerNascimento(t);
    case 'cpf':
      return formatarCPF(t);
    case 'cep':
      return formatarCEP(t);
    case 'celular':
      return formatarCelular(t);
    case 'email':
      return t.toLowerCase().replace(/\s/g, '');
    case 'estado': {
      const n = norm(t);
      if (/^[a-z]{2}$/.test(n)) return n.toUpperCase();
      return ESTADOS[n] || t;
    }
    default:
      return t;
  }
}

// Devolve { dados: {campo: valor}, encontrados: n, faltando: [rótulos], textoNascimento }
export function lerMatricula(texto) {
  const dados = {};
  const brutos = {};
  const linhas = String(texto || '').replace(/\r/g, '').split('\n');

  let pendente = null; // rótulo com valor na linha de baixo
  for (const linhaOriginal of linhas) {
    const linha = linhaOriginal.replace(/[*_]/g, '').trim(); // tira negrito do WhatsApp
    if (!linha) continue;
    const m = linha.match(/^([^:：]{1,40})[:：]\s*(.*)$/);
    const campo = m ? campoDoRotulo(m[1]) : null;
    if (campo) {
      if (m[2].trim()) {
        brutos[campo] = m[2];
        pendente = null;
      } else {
        pendente = campo;
      }
      continue;
    }
    if (pendente && !brutos[pendente]) {
      brutos[pendente] = linha;
      pendente = null;
    }
  }

  for (const [campo, valor] of Object.entries(brutos)) {
    const limpo = limparValor(campo, valor);
    if (limpo) dados[campo] = limpo;
  }

  const faltando = CAMPOS_MATRICULA.filter((c) => !dados[c.chave]).map((c) => c.rotulo);
  return {
    dados,
    encontrados: Object.keys(dados).length,
    faltando,
    nascimentoNaoEntendido: brutos.data_nascimento && !dados.data_nascimento ? brutos.data_nascimento.trim() : '',
  };
}
