'use client';

// Botão de envio que pergunta antes (para excluir coisas).
export default function BotaoConfirmar({ children, pergunta, className = 'btn-perigo', formAction }) {
  return (
    <button
      type="submit"
      className={className}
      formAction={formAction}
      onClick={(e) => {
        if (!window.confirm(pergunta)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
