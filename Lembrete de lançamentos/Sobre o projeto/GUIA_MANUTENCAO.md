<!-- GUIA DE MANUTENÇÃO ATUALIZADO em 2026-08-20 -->
# Guia de Manutenção Rápida

## Objetivo

Documento curto para localizar rapidamente onde editar comportamento, layout e integrações do projeto.

## Localização principal

- Página principal: [Index.html](../Index.html)
- Página de testes: [testes.html](../testes.html)
- Estilos: `CSS/Styles.css`
- Lógica: `JS/script.js`
- Funções serverless: `Supabase/functions/`

## Mapa rápido — onde mexer

- Layout / HTML: elementos, cards e botões — editar [Index.html](../Index.html).
- CSS / aparência: `CSS/Styles.css` (ou bloco <style> no HTML).
- Importação/Processamento: `processarExcel()` em `JS/script.js`.
- Regras de data/competência: `converterDataBR()` e `calcularCompetenciaAKRK()`.
- Sincronização com banco: `enviarParaSupabase()` (ajustar nomes de campos conforme esquema).
- Exportação: `exportarParaExcel()` e `exportarHistoricoCortes()`.

## Passo a passo para alterações comuns

1. Backup: copie o arquivo HTML e o `JS/script.js`.
2. Rodar local: use Live Server ou `npx http-server` na pasta do projeto.
3. Testar importação: use `testes.html` com exemplos de planilha.
4. Ajustar regra de competência: alterar `calcularCompetenciaAKRK()` e testar com casos reais.
5. Atualizar envio ao banco: ajustar `enviarParaSupabase()` e validar no Supabase.

## Configurar Supabase (rápido)

1. No `JS/script.js`, defina `SUPABASE_URL` e `SUPABASE_KEY`.
2. Verifique nomes de tabelas/colunas usados em `enviarParaSupabase()`.
3. Se usar funções serverless, publique `Supabase/functions/*` via painel ou CLI.

Comandos úteis (instalar servidor local):

```powershell
npx http-server .
```

ou use a extensão Live Server no VS Code.

## Checagem rápida ao depurar

- Erro na importação: revisar `processarExcel()` → formato das colunas.
- Datas erradas: revisar `converterDataBR()` e `normalizarDataParaTexto()`.
- Competência incorreta: revisar `calcularCompetenciaAKRK()` com datas limites.
- Falha ao salvar: revisar `enviarParaSupabase()` e permissões/keys.
- Histórico não exporta: revisar `carregarCompetenciasHistorico()` / `exportarHistoricoCortes()`.

## Checklist de manutenção antes de deploy

- [ ] Fazer backup dos arquivos alterados
- [ ] Testar importação com planilha real
- [ ] Validar envio no Supabase (ambiente de teste)
- [ ] Confirmar nome/ordem das colunas no Excel de saída
- [ ] Atualizar documentação (este arquivo)
