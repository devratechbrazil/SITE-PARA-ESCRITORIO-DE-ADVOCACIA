require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');

// Importar rotas
const { router: authRoutes } = require('./routes/auth');
const clientesRoutes = require('./routes/clientes');
const casosRoutes = require('./routes/casos');
const financeiroRoutes = require('./routes/financeiro');
const usuariosRoutes = require('./routes/usuarios');
const cobrancasRoutes = require('./routes/cobrancas');
const documentosRoutes = require('./routes/documentos');
const configuracoesRoutes = require('./routes/configuracoes');
const auditoriaRoutes = require('./routes/auditoria');
const backupRoutes = require('./routes/backup');

// Conectar ao banco de dados
connectDB();

const app = express();

function parseCorsOrigins() {
  const value = process.env.CORS_ORIGIN;
  if (!value || value.trim() === '*') {
    return null; // null = permite qualquer origem
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = parseCorsOrigins();

const corsOptions = {
  credentials: true,
  origin(origin, callback) {
    // Requisicoes sem origin (curl, server-to-server) devem ser permitidas.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (!allowedOrigins || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origem nao permitida no CORS: ${origin}`));
  }
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estaticos (HTML, CSS, JS da pasta raiz)
const publicPath = path.join(__dirname, '..');
app.use(express.static(publicPath));

// Rotas da API
app.get('/', (req, res) => {
  res.sendFile('login.html', { root: publicPath });
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/casos', casosRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/cobrancas', cobrancasRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/configuracoes', configuracoesRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/backup', backupRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Servidor online' });
});

// Middleware de erro 404
app.use((req, res) => {
  res.status(404).json({ message: 'Rota nao encontrada' });
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Erro interno do servidor' });
});

// Iniciar servidor com fallback automatico de porta
const BASE_PORT = Number(process.env.PORT) || 5000;
const MAX_PORT_ATTEMPTS = 20;

function startServer(port, attempt = 0) {
  const server = app.listen(port, () => {
    console.log(`\nServidor rodando em http://localhost:${port}`);
    console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attempt < MAX_PORT_ATTEMPTS) {
      const nextPort = port + 1;
      console.warn(`Porta ${port} ocupada. Tentando ${nextPort}...`);
      startServer(nextPort, attempt + 1);
      return;
    }

    console.error(`Erro ao iniciar servidor: ${error.message}`);
    process.exit(1);
  });
}

startServer(BASE_PORT);
