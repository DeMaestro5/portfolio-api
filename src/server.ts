import { createServer } from 'http';
import { Server } from 'socket.io';
import Logger from './core/Logger';
import { port, corsUrl } from './config';
import app from './app';

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', corsUrl, 'http://127.0.0.1:3000'].filter(
      (url): url is string => url !== undefined,
    ),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  Logger.info(`Client connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    Logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
  });

  // Add your custom event handlers here
});

// Start server
httpServer
  .listen(port, () => {
    Logger.info(`Server running on port: ${port}`);
  })
  .on('error', (e) => Logger.error(e));

export { io };
