# Smart Tech Reparo - arquivos de login atualizados

Arquivos incluídos:

- server.js
- package.json
- src/routes/authRoutes.js
- src/controllers/authController.js
- src/middlewares/authMiddleware.js

## Como usar

1. Substitua esses arquivos no repositório do backend.
2. Não suba `node_modules`.
3. Remova o `package-lock.json` antigo OU gere um novo com `npm install` no computador.
4. Faça commit e push na branch `main`.
5. No Railway, aguarde o novo deploy.

## Variáveis obrigatórias no Railway

- SUPABASE_URL
- SUPABASE_SERVICE_KEY ou SUPABASE_SERVICE_ROLE_KEY
- JWT_SECRET
- NODE_ENV=production

## Testes depois do deploy

Raiz:
https://smarttechreparo-backend-production.up.railway.app/

Deve aparecer `LOGIN V3 ATIVO - SERVIDOR NOVO`.

Versão:
https://smarttechreparo-backend-production.up.railway.app/api/version

Sessão:
https://smarttechreparo-backend-production.up.railway.app/api/auth/me

Sem login, o certo é responder `Não autenticado.`, e não `Rota não encontrada`.
