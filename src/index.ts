import express from 'express';
import axios from 'axios';
import { createServer } from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import NodeWebcam from 'node-webcam';

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

// Configuração da webcam
const webcam = NodeWebcam.create({
  width: 640,
  height: 480,
  quality: 100,
  saveShots: false,
  output: 'jpeg',
  device: false, // Use o dispositivo padrão
  callbackReturn: 'base64', // Retorna a imagem como base64
});

// return a snapshot of the usb-camera
app.get('/usb-camera', (req, res) => {
  webcam.capture('usb_camera', (err, data) => {
    if (err) {
      console.error('Erro ao capturar imagem da webcam USB:', err);
      return res.status(500).json({ error: 'Não foi possível capturar a imagem da webcam USB' });
    }

    // Define o tipo de conteúdo como HTML
    res.set('Content-Type', 'text/html');

    // Envia um HTML contendo a tag <img> com a imagem em base64
    res.send(`
      <html>
        <body>
          <img src="${data}" width="100%" alt="Webcam USB" />
        </body>
      </html>
    `);
  });
});


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
const MJPEG_URL = process.env.MJPEG_URL;

app.get('/stream', async (req, res) => {
  try {
    const response = await axios({
      url: MJPEG_URL + '/video',
      method: 'GET',
      responseType: 'stream'
    });

    // Configura os cabeçalhos da resposta
    res.set('Content-Type', response.headers['content-type']);
    res.set('Cache-Control', 'no-cache');
    res.set('Connection', 'keep-alive');

    response.data.on('end', async () => {
      if (response.data.includes('<a href="/override">')) {
        try {
          await axios.get(`${MJPEG_URL}/override`);
          console.log('Override triggered successfully');
        } catch (err) {
          console.error('Error triggering override:', err);
        }
      }
    });

    // Encaminha o stream
    response.data.pipe(res);
  } catch (error) {
    console.error('Erro ao acessar o stream:', error);
    res.status(500).json({ error: 'Não foi possível conectar ao stream MJPEG' });
  }
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Stream MJPEG configurado para: ${MJPEG_URL}/video`);
});