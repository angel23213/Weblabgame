import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
// IMPORTANTE: Al usar type: module, debes poner .js en archivos locales
import { pool } from './core/database.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // En producción cambia esto por la URL de tu frontend
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// 1. Verificación de conexión a PostgreSQL
async function checkDatabase() {
    try {
        const res = await pool.query('SELECT NOW() as now');
        console.log(`✅ Base de Datos conectada: ${res.rows[0]?.now}`);
    } catch (err) {
        console.error('❌ Error de conexión a la base de datos:', err);
        process.exit(1); // Detiene el servidor si no hay DB
    }
}

// 2. Configuración básica de Sockets para el equipo
io.on("connection", (socket) => {
    console.log(`👤 Usuario conectado: ${socket.id}`);

    socket.on("ping", () => {
        socket.emit("pong", { message: "Servidor activo" });
    });

    socket.on("disconnect", () => {
        console.log(`🚫 Usuario desconectado: ${socket.id}`);
    });
});

// Ruta de prueba para el navegador
app.get('/', (req, res) => {
    res.send('Servidor de SmartSync Game corriendo 🚀');
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, async () => {
    await checkDatabase();
    console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
});