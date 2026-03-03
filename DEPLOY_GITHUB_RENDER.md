# Deploy para GitHub e Producao (Render + MongoDB Atlas)

## 1) Publicar no GitHub

No diretorio raiz do projeto:

```bash
git init
git add .
git commit -m "feat: release para producao"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

## 2) Criar banco no MongoDB Atlas

1. Crie um projeto e um cluster no Atlas.
2. Crie um usuario de banco (Database Access).
3. Em Network Access, adicione IP Allow List.
   Use `0.0.0.0/0` somente no inicio e depois restrinja.
4. Em Connect > Drivers, copie a connection string e substitua usuario/senha:

```env
MONGODB_URI=mongodb+srv://USUARIO:SENHA@cluster.xxxxx.mongodb.net/sistemajuridico?retryWrites=true&w=majority
```

## 3) Subir no Render (Blueprint com render.yaml)

Este repositorio ja possui `render.yaml` na raiz.

1. No Render: New > Blueprint.
2. Conecte seu repositorio GitHub.
3. Selecione o repo e confirme a criacao.
4. No servico criado, configure as variaveis de ambiente:

```env
MONGODB_URI=...
JWT_SECRET=gere-um-valor-longo-e-unico
NODE_ENV=production
PORT=10000
CORS_ORIGIN=https://NOME-DO-SEU-SERVICO.onrender.com
```

## 4) Deploy manual alternativo (sem Blueprint)

Se preferir criar sem `render.yaml`:

- Runtime: Node
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Depois configure as mesmas variaveis de ambiente acima.

## 5) Validacao pos deploy

Teste nesta ordem:

1. Health check:
   `https://SEU_APP.onrender.com/api/health`
2. Tela de login:
   `https://SEU_APP.onrender.com/login.html`
3. Fluxo completo:
   registro > login > criar cliente > criar cobranca > marcar pago > conferir financeiro.

## 6) Observacoes importantes

- A primeira conta criada vira admin automaticamente.
- GitHub nao hospeda backend: ele so guarda codigo.
- Dados so ficam na nuvem se `MONGODB_URI` apontar para Atlas.
- Free tier do Render pode ter cold start.

## 7) Seguranca minima

- Nunca commitar `.env`.
- Trocar `JWT_SECRET` regularmente.
- Restringir IP no Atlas apos validacao inicial.
- Ativar backup/snapshot no Atlas para cliente final.
