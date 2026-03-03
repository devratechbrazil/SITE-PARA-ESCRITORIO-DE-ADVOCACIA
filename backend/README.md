# Sistema Jurídico - Backend

Backend Node.js + MongoDB para o Sistema de Gestão de Escritório de Advocacia.

## 🚀 Instalação Rápida

### 1️⃣ Pré-requisitos
- Node.js 14+ instalado
- MongoDB Atlas (ou MongoDB local)

### 2️⃣ Clonar e Instalar
```bash
cd backend
npm install
```

### 3️⃣ Configurar Banco de Dados

#### Opção A: MongoDB Atlas (Cloud - Recomendado)
1. Acesse [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crie uma conta gratuita
3. Crie um cluster (Free Tier)
4. Obtenha a URL de conexão
5. Crie um arquivo `.env`:

```env
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/sistemajuridico?retryWrites=true&w=majority
PORT=5000
NODE_ENV=development
JWT_SECRET=sua_chave_super_secreta_aqui_2024
CORS_ORIGIN=http://localhost
```

#### Opção B: MongoDB Local
```env
MONGODB_URI=mongodb://localhost:27017/sistemajuridico
PORT=5000
NODE_ENV=development
JWT_SECRET=sua_chave_super_secreta_aqui_2024
CORS_ORIGIN=http://localhost
```

### 4️⃣ Rodar o Servidor

**Desenvolvimento** (com auto-reload):
```bash
npm run dev
```

**Produção**:
```bash
npm start
```

O servidor estará em: `http://localhost:5000`

---

## 📚 API Endpoints

### 🔐 Autenticação
- `POST /api/auth/registro` - Criar nova conta
- `POST /api/auth/login` - Fazer login e obter token
- `GET /api/auth/perfil` - Obter dados do usuário
- `PUT /api/auth/perfil` - Atualizar perfil

### 👥 Clientes
- `GET /api/clientes` - Listar todos os clientes
- `GET /api/clientes/:id` - Obter cliente específico
- `POST /api/clientes` - Criar novo cliente
- `PUT /api/clientes/:id` - Atualizar cliente
- `DELETE /api/clientes/:id` - Deletar cliente

### 📋 Casos
- `GET /api/casos` - Listar todos os casos
- `GET /api/casos/:id` - Obter caso específico
- `POST /api/casos` - Criar novo caso
- `PUT /api/casos/:id` - Atualizar caso
- `DELETE /api/casos/:id` - Deletar caso

### 💰 Financeiro
- `GET /api/financeiro` - Listar transações
- `GET /api/financeiro/:id` - Obter transação específica
- `POST /api/financeiro` - Criar nova transação
- `PUT /api/financeiro/:id` - Atualizar transação
- `DELETE /api/financeiro/:id` - Deletar transação

---

## 🔐 Autenticação JWT

Todas as requisições (exceto login/registro) precisam do token:

```bash
curl -H "Authorization: Bearer seu_token_aqui" http://localhost:5000/api/clientes
```

---

## 📝 Exemplos de Uso

### Registro
```bash
curl -X POST http://localhost:5000/api/auth/registro \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Advogado",
    "email": "joao@escritorio.com",
    "senha": "senha123",
    "cargo": "Advogado"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@escritorio.com",
    "senha": "senha123"
  }'
```

### Criar Cliente
```bash
curl -X POST http://localhost:5000/api/clientes \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Cliente XYZ",
    "telefone": "(11) 99999-9999",
    "tipoCliente": "Pessoa Física",
    "email": "cliente@email.com"
  }'
```

---

## 🗄️ Estrutura do Banco de Dados

### Collections:
- **usuarios** - Dados de login
- **clientes** - Clientes do escritório
- **casos** - Processos/casos jurídicos
- **financeiros** - Transações financeiras

---

## 🐛 Troubleshooting

**Erro: "MONGODB_URI is not defined"**
- Crie arquivo `.env` com as variáveis

**Erro: "Connection refused"**
- Verifique se o MongoDB está rodando
- No Atlas, insira seu IP na Whitelist

**Erro: "Invalid token"**
- Verifique se o JWT_SECRET está correto
- Token pode estar expirado

---

## 📦 Dependências

- **express** - Framework web
- **mongoose** - ODM para MongoDB
- **bcryptjs** - Hash de senhas
- **jsonwebtoken** - Autenticação JWT
- **cors** - Requisições cross-origin
- **dotenv** - Variáveis de ambiente

---

## 📞 Contato & Suporte
Para dúvidas, entre em contato com o desenvolvedora.
