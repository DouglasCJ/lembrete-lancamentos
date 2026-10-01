<!-- DOCUMENTAÇÃO ATUALIZADA em 2026-08-20 -->
# Documentação do Projeto: Lembrete de Lançamento

## Visão geral

Página web estática para controlar lançamentos: acompanhar vencimentos, importar dados de Excel, atualizar status e exportar relatórios. A interface é front-end (HTML/CSS/JS) e sincroniza dados com Supabase.

## Tecnologias

- HTML, CSS, JavaScript
- Bootstrap, Font Awesome
- DataTables, SweetAlert2
- SheetJS (XLSX)
- Supabase (banco + funções serverless)

## Estrutura do projeto (resumida)

- [Index.html](Index.html) — página principal
- [consulta.html](consulta.html) — (opcional) página de consulta
- [testes.html](testes.html) — ambiente para testes
- CSS/Styles.css — estilos principais
- JS/script.js — lógica do front-end (importação, filtros, Supabase)
- Imagens/ — recursos gráficos
- Sobre o projeto/DOCUMENTACAO.md — este arquivo
- Supabase/functions/ — funções serverless (ex.: Supabase/functions/notificar-corte/index.ts)

## Como usar (rápido)

1. Abra [Index.html](Index.html) no navegador (é uma página estática).
2. Para testar regras e importação, abra [testes.html](testes.html).
3. Para importar uma planilha: use o botão de importação na interface e siga os prompts.
4. Ajuste filtros e exporte relatórios via os controles na tela.

## Configuração do Supabase

- As credenciais e a inicialização do Supabase ficam em `JS/script.js` — configure `SUPABASE_URL` e `SUPABASE_KEY` antes de usar a sincronização.
- Funções serverless (se usadas) estão em `Supabase/functions/` e podem ser implantadas no projeto Supabase como funções TypeScript.

## Desenvolvimento local

- Não há build system obrigatório — edite os arquivos HTML/CSS/JS diretamente.
- Recarregue a página no navegador para ver alterações.
- Recomendações: use um servidor local (por exemplo, `npx http-server` ou Live Server no VS Code) para evitar problemas de CORS ao testar chamadas à API.

## Funções e responsabilidades (alto nível)

- `normalizarNome()` — padroniza nomes de convênios.
- `converterDataBR()` — converte strings de data para `Date`.
- `calcularCompetenciaAKRK()` — regra de cálculo de competência.
- `processarExcel()` — leitura e validação do Excel (SheetJS).
- `enviarParaSupabase()` — sincroniza registros com o banco e registra histórico.
- `exportarParaExcel()` / `exportarHistoricoCortes()` — exportação de relatórios.

(Procure essas funções em `JS/script.js`; os nomes podem variar ligeiramente.)

## Fluxo principal

1. Carregamento inicial busca dados do Supabase.
2. A interface monta tabela e cards com indicadores.
3. Usuário importa planilha; dados são processados e validados.
4. Usuário salva alterações; o app envia para Supabase e registra histórico.
5. Usuário pode exportar relatórios por mês ou geral.

## Pontos de atenção

- A lógica de competência e a conversão de datas são as partes mais sensíveis.
- Ao depurar: verifique o arquivo Excel, a conversão de datas, a função de competência e a rotina de envio ao banco (nessa ordem).

## Checklist de manutenção

- Fazer backup antes de alterar regras de competência.
- Testar com planilhas reais antes de publicar.
- Adicionar logs (`console.log`) em pontos críticos para depuração.
- Atualizar nomes de campos em `enviarParaSupabase()` se houver alterações no esquema do banco.

## Deploy / Observações

- A aplicação é estática: pode ser hospedada em qualquer serviço de arquivos estáticos (Netlify, Vercel, GitHub Pages).
- Funções serverless devem ser implantadas usando o painel do Supabase ou ferramenta de CLI do Supabase.