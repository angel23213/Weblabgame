import { io, Socket } from "socket.io-client";
import axios from "axios";

// La URL del servidor de Node.js viaja por variable o autoconfigura
const customUrl = import.meta.env.VITE_SOCKET_URL;
export const BASE_URL = customUrl ? customUrl : `${window.location.protocol}//${window.location.hostname}:3000`;

// Configuración global de Axios para saltar advertencia de ngrok
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';

// Configuramos la instancia del socket
export const socket: Socket = io(BASE_URL, {
    autoConnect: false,
    transports: ["websocket"],
    extraHeaders: {
        "ngrok-skip-browser-warning": "true"
    }
});

// Opcional: Logs para saber qué pasa en la consola del navegador
socket.on("connect", () => {
    console.log("✅ Conectado al servidor de juegos con ID:", socket.id);
});

socket.on("disconnect", () => {
    console.log("❌ Desconectado del servidor");
});

export const getPlayerId = () => {
    let id = localStorage.getItem('playerId');
    if (!id) {
        id = 'player-' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('playerId', id);
    }
    return id;
};