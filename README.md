# Gabarito online · Simulado PMPE 2026 · Falcões Preparatório

Página para o aluno marcar o gabarito do Simulado PMPE 2026 pelo celular, tablet ou notebook.
Ao finalizar, ele vê a nota e baixa um PDF com nome, horário de início e de fim, duração,
as marcações dele lado a lado com o gabarito oficial e a nota final.

- Site estático (HTML, CSS e JavaScript), publicado no GitHub Pages.
- As marcações ficam salvas no navegador do aluno (`localStorage`); nada é enviado a servidor.
- O PDF é gerado no próprio navegador com [jsPDF](https://github.com/parallax/jsPDF) 2.5.1 (MIT).
- Fontes: Anton e Poppins (SIL Open Font License, textos em `assets/fonts/`).

## Trocar o gabarito (outro simulado)
Edite `gabarito.js`: `id` (novo nome para não misturar com marcações antigas), `titulo`,
`alternativas` e a lista `questoes` (`n`, `materia`, `resp`).

**Atenção:** num site estático o gabarito oficial fica no código da página.
Quem abrir o código-fonte consegue ver as respostas.

@falcoespreparatorio
