// Campos do formulário de entrada (página pública /formulario/[token]).
// Para mudar perguntas, edite esta lista.
export const CAMPOS_FORMULARIO = [
  { k: 'nome', label: 'Seu nome completo', tipo: 'text', obrigatorio: true },
  { k: 'cargo', label: 'Cargo', tipo: 'text' },
  { k: 'telefone', label: 'Telefone (WhatsApp)', tipo: 'tel', obrigatorio: true },
  { k: 'email_computador', label: 'E-mail que você usa no computador', tipo: 'email', obrigatorio: true },
  { k: 'email_celular', label: 'E-mail que você usa no celular', tipo: 'email' },
  { k: 'segmento', label: 'Segmento da empresa', tipo: 'text' },
  { k: 'funcionarios', label: 'Quantos funcionários a empresa tem?', tipo: 'text' },
  { k: 'desafio', label: 'Qual é o maior desafio da empresa hoje?', tipo: 'textarea' },
  { k: 'fornecedores', label: 'Quais fornecedores você está buscando?', tipo: 'textarea' },
  { k: 'tipo_fornecedor', label: 'Que tipo de fornecedor (segmento)?', tipo: 'text' },
  { k: 'cliente_ideal', label: 'Qual é o cliente ideal da sua empresa?', tipo: 'textarea' },
];
