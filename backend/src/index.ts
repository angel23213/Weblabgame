import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import { pool } from './core/database.js';
import { gameManager } from './core/gameManager.js';
import { type GameType, type PlayerSymbol, type GameState, type GameMove } from './types/game.types.js';
import { updatePlayerStats } from './services/stats.service.js';
import { updateGameInDB } from './services/game.service.js';
import authRouter from './routes/auth.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Cambia esto por tu URL de Vite en producción (ej. http://localhost:5173)
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Auth Routes
app.use('/api/auth', authRouter);

// Verificación de DB (Opcional para que no detenga el servidor si falla)
async function checkDatabase() {
    try {
        await pool.query('SELECT NOW()');
        console.log("✅ DB Conectada");
    } catch (e) {
        console.log("⚠️ DB Offline (pero el servidor seguirá)");
    }
}

// Lógica de Sockets
io.on("connection", (socket) => {
    // ESTO DEBE APARECER EN TU TERMINAL
    console.log(`👤 Conectado: ${socket.id}`);

    // Sala personal para notificaciones del Dashboard
    socket.on("joinLobby", (playerId) => {
        if (playerId) {
            socket.join(`user-${playerId}`);
            console.log(`📡 Jugador ${playerId} suscrito a su lobby`);
        }
    });

    socket.on("joinGame", ({ playerId, username, gameType, gameMode = 'blitz', gameId }) => {
        // 1. Buscamos una sala disponible. Si no hay, creamos una nueva con ID único.
        let roomId = gameId;
        
        if (!roomId) {
            roomId = gameManager.findAvailableGame(gameType, gameMode);
            if (!roomId) {
                roomId = `room-${gameType}-${gameMode}-${Date.now()}`;
            }
        }
        
        socket.join(roomId);

        // 2. Buscamos si ya existe una partida en esa sala
        let game = gameManager.getGame(roomId);

        const newPlayer = {
            id: playerId || socket.id,
            username: username || 'Invitado',
            socketId: socket.id,
            symbol: 'X' as PlayerSymbol
        };

        if (!game) {
            // SI NO EXISTE: Creamos la partida con el Jugador 1 (X)
            game = gameManager.createGame(roomId, gameType, gameMode, [newPlayer]);
            console.log(`🎮 Partida creada: ${roomId} en modo ${gameMode} por ${newPlayer.username}`);
        } else {
            // SI YA EXISTE: Verificamos si es un jugador regresando
            const existingPlayer = game.players.find(p => p.id === newPlayer.id);
            
            if (existingPlayer) {
                // Es un jugador que regresa a la partida Diaria o se reconecta
                existingPlayer.socketId = socket.id;
                existingPlayer.disconnected = false;
                console.log(`🔄 ${existingPlayer.username} regresó a su partida ${roomId}`);
            } else if (game.players.length < 2) {
                // Es un jugador nuevo, lo asignamos como Jugador 2 (O)
                newPlayer.symbol = 'O'; 
                game.players.push(newPlayer);
                game.status = 'playing'; 
                game.lastMoveTime = Date.now();
                console.log(`👥 ${newPlayer.username} se unió como O en ${roomId}`);

                // IMPORTANTE: Darle sus fichas al segundo jugador de dominó
                if (gameType === 'domino') {
                    game.data.playerHands[newPlayer.id] = game.data.boneyard.splice(0, 7);
                }
                
                // Si es Blitz, hay que iniciar el reloj del Jugador 1
                gameManager.startGameClock(game.gameId);
                
                // Forzar actualización en PostgreSQL si es Diario
                if (game.mode === 'daily') {
                    updateGameInDB(game);
                }
            }
        }

        // 3. IMPORTANTÍSIMO: Enviamos el estado a TODA LA SALA, no solo al socket actual
        io.to(roomId).emit("gameStateUpdate", game);
        
        // Refrescar Dashboards
        game.players.forEach(p => {
            if (p.id) io.to(`user-${p.id}`).emit("dashboardUpdate");
        });
    });

    gameManager.setGameEndCallback(async (finishedGame) => {
        io.to(finishedGame.gameId).emit("gameStateUpdate", finishedGame);
        
        // Refrescar Dashboards
        finishedGame.players.forEach(p => {
            if (p.id) io.to(`user-${p.id}`).emit("dashboardUpdate");
        });
        
        await updatePlayerStats(finishedGame.winnerId, finishedGame.players);
    });

    // 4. ESCUCHAR MOVIMIENTOS AHORA SÍ
    socket.on("makeMove", async (move) => {
        const game = gameManager.handleMove(move);
        if ("error" in game) {
            console.log(`❌ Error movimiento: ${game.error}`);
            // Podríamos emitir el error solo al usuario que lo intentó
            // socket.emit('moveError', game.error);
        } else {
            // Movimiento válido, emitimos el estado a todos en la sala
            io.to(move.gameId).emit("gameStateUpdate", game);
            
            // Refrescar Dashboards
            game.players.forEach(p => {
                if (p.id) io.to(`user-${p.id}`).emit("dashboardUpdate");
            });

            if (game.status === 'finished' && move.action !== 'rematch-request') {
                await updatePlayerStats(game.winnerId, game.players);
            }
        }
    });

    socket.on("reconnectUser", ({ playerId }) => {
        const reconnectedGame = gameManager.reconnectPlayer(playerId, socket.id);
        if (reconnectedGame) {
            socket.join(reconnectedGame.gameId);
            io.to(reconnectedGame.gameId).emit("gameStateUpdate", reconnectedGame);
        }
    });

    socket.on("leaveGame", ({ gameId }) => {
        socket.leave(gameId);
        // Notificamos a la sala que este socket salió (usado para limpiar esperas de revancha)
        io.to(gameId).emit("onPlayerLeft", gameId);
        console.log(`🚪 Jugador salió de la sala: ${gameId}`);
    });

    socket.on("disconnect", () => {
        console.log(`🚫 Desconectado: ${socket.id}`);
        const affectedGame = gameManager.handlePlayerDisconnect(socket.id, async (timedOutGame) => {
            // Callback que se ejecuta 30s después si no regresó
            io.to(timedOutGame.gameId).emit("gameStateUpdate", timedOutGame);
            
            if (timedOutGame.status === 'finished') {
                // Si la partida terminó por desconexión en pleno juego, notificamos
                io.to(timedOutGame.gameId).emit("onPlayerLeft", timedOutGame.gameId);
                await updatePlayerStats(timedOutGame.winnerId, timedOutGame.players);
            }
        });

        if (affectedGame) {
            // Le avisamos a la sala de la espera
            io.to(affectedGame.gameId).emit("gameStateUpdate", affectedGame);
        }
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, async () => {
    await checkDatabase();
    console.log(`🚀 Servidor en http://localhost:${PORT}`);
});