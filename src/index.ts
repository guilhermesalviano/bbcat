import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './routes';
import { Server } from 'socket.io';
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Configuração do CORS
app.use(cors());
app.use(express.json());
app.use(router);
app.use(express.static('public'));

io.on('connection', (socket) => {
  socket.on('join-room', (roomId, userId) => {
    console.log("User joined room:", roomId, userId);
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);
  });

  socket.on('offer', (offer, roomId) => {
    socket.to(roomId).emit('offer', offer, socket.id);
  });

  socket.on('answer', (answer, roomId) => {
    socket.to(roomId).emit('answer', answer, socket.id);
  });

  socket.on('ice-candidate', (candidate, roomId) => {
    socket.to(roomId).emit('ice-candidate', candidate, socket.id);
  });
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});