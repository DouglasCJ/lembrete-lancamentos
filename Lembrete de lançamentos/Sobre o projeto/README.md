# Lembrete de Lançamento — Guia rápido de deploy (Netlify)

Este documento explica como publicar o projeto como site estático no Netlify e como proteger as chaves do Supabase.

---

## Estrutura mínima a subir
- `Index.html` (página principal)
- `CSS/Styles.css`
- `JS/script.js`
- `env-config.js` *(ver opções abaixo)*
- outras pastas (ex: `Imagens/`) se usadas

> Netlify procura por `Index.html` como página inicial. Manter outros HTMLs (`testes.html`, `consulta.html`) é OK.

---

## Opção recomendada (segura, automatizável) — Git + Netlify (build step)
1. Coloque o projeto em um repositório Git (GitHub/GitLab/Bitbucket).
2. No Netlify, conecte o repositório (Sites → New site → Import from Git).
3. Nas configurações do site (Site settings → Build & deploy → Environment): adicione duas variáveis de ambiente:
   - `SUPABASE_URL` = sua URL Supabase
   - `SUPABASE_KEY` = sua chave pública (não commitá-la no repo)
4. Em "Build command" insira um comando curto que gere `env-config.js` antes do publish. Exemplo:

```bash
# Netlify executa em Linux; este comando cria env-config.js no diretório de build
echo "window._SUPABASE_URL='$SUPABASE_URL';window._SUPABASE_KEY='$SUPABASE_KEY';" > env-config.js
```

5. Defina o "Publish directory" como o diretório que contém `Index.html` (normalmente `.` ou `public` se usar subpasta).
6. Garanta que `Index.html` inclua o arquivo `env-config.js` antes de `JS/script.js`:

```html
<script src="env-config.js"></script>
<script src="JS/script.js"></script>
```

7. No `JS/script.js` substitua o trecho onde `_URL` e `_KEY` são definidos por leitura de `window`:

```js
const _URL = window._SUPABASE_URL || 'https://seu-valor-substituto';
const _KEY = window._SUPABASE_KEY || 'chave-substituta';
const supabaseClient = supabase.createClient(_URL, _KEY);
```

Dessa forma, as chaves não ficam no repositório e a Netlify injeta os valores ao gerar `env-config.js` durante a build.

---

## Opção manual (rápida, menos segura)
1. Crie localmente um arquivo `env-config.js` com o conteúdo:

```js
window._SUPABASE_URL = 'https://seu-projeto.supabase.co';
window._SUPABASE_KEY = 'sua_chave_publica_aqui';
```

2. Coloque `env-config.js` na mesma pasta do `Index.html` e inclua-o antes de `JS/script.js` (veja exemplo acima).

Observação: este método expõe a chave no repositório/site (não recomendado para chaves sensíveis). Use apenas para testes locais ou se a chave for pública e com permissões limitadas.

---

## Deploy manual (drag & drop)
1. Acesse https://app.netlify.com/sites
2. Clique em **Add new site → Deploy manually**
3. Arraste a pasta do seu projeto (a pasta que contém `Index.html`) para a área indicada
4. Netlify fará o upload e mostrará o link do site

Se usar deploy manual, `env-config.js` precisa existir no pacote (manual) — portanto, use com cautela (não comitar chaves públicas se for sensível).

---

## Testes após deploy
1. Abra o site público fornecido pelo Netlify
2. Verifique se a UI carrega e se os estilos aparecem
3. No console do navegador (F12 → Console) verifique se `window._SUPABASE_URL` e `window._SUPABASE_KEY` estão definidos antes do `supabase.createClient` (ou se não há erros de CORS/404)
4. Tente clicar em **Recarregar Dados** e confira se os dados aparecem (ou mensagens de erro configuradas)

---

## Nota sobre chaves e segurança
- A `SUPABASE_KEY` usada no frontend normalmente é a *publishable* / pública (chave de API com permissões públicas). Ainda assim, evite expor chaves com permissões de escrita ampla.
- Para operações sensíveis, considere criar endpoints server-side (Functions/Netlify Functions) que utilizem chaves privadas no servidor.