import express from 'express';
import axios from 'axios';
import { createServer } from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Configuração do CORS
app.use(cors());
app.use(express.json());

// Configuração do stream MJPEG
const MJPEG_URL = process.env.MJPEG_URL || 'http://192.168.18.40:4747/video';

// Rota para obter informações sobre a API
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    endpoints: {
      '/stream': 'Acessa o stream MJPEG diretamente',
      '/api/stream-info': 'Retorna informações sobre o stream',
      '/api/snapshot': 'Captura um frame do stream'
    }
  });
});

// Rota para redirecionar ao stream original
app.get('/stream', async (req, res) => {
  try {
    const response = await axios({
      url: MJPEG_URL,
      method: 'GET',
      responseType: 'stream'
    });
    
    // Configura os cabeçalhos da resposta
    res.set('Content-Type', response.headers['content-type']);
    res.set('Cache-Control', 'no-cache');
    res.set('Connection', 'keep-alive');
    
    // Encaminha o stream
    response.data.pipe(res);
  } catch (error) {
    console.error('Erro ao acessar o stream:', error);
    res.status(500).json({ error: 'Não foi possível conectar ao stream MJPEG' });
  }
});

// Rota para obter informações sobre o stream
app.get('/api/stream-info', async (req, res) => {
  try {
    const response = await axios.head(MJPEG_URL);
    res.json({
      url: MJPEG_URL,
      contentType: response.headers['content-type'],
      status: 'connected',
      headers: response.headers
    });
  } catch (error) {
    console.error('Erro ao verificar informações do stream:', error);
    res.status(500).json({ 
      error: 'Não foi possível obter informações do stream',
      url: MJPEG_URL,
      status: 'disconnected'
    });
  }
});

// Rota para capturar um snapshot do stream
app.get('/api/snapshot', async (req, res) => {
  try {
    // Para um snapshot simples, podemos fazer uma requisição curta e encerrar
    const response = await axios({
      url: MJPEG_URL,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 5000, // Timeout para evitar que a conexão fique aberta indefinidamente
    });
    
    // Extrai um frame do stream MJPEG
    const contentType = response.headers['content-type'];
    const data = response.data;
    
    // Cabeçalhos para a imagem
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'no-cache');
    
    // Envia o frame capturado
    res.send(data);
  } catch (error) {
    console.error('Erro ao capturar snapshot:', error);
    res.status(500).json({ error: 'Não foi possível capturar um snapshot do stream' });
  }
});

// Configuração do Socket.io para streaming em tempo real
io.on('connection', (socket) => {
  console.log('Um cliente se conectou');
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Stream MJPEG configurado para: ${MJPEG_URL}`);
});