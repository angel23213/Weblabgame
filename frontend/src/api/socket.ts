import { io, Socket } from "socket.io-client";

// La URL del servidor de Node.js viaja por variable o autoconfigura
const customUrl = import.meta.env.VITE_SOCKET_URL;
export const BASE_URL = customUrl ? customUrl : `${window.location.protocol}//${window.location.hostname}:3000`;

// Configuramos la instancia del socket
export const socket: Socket = io(BASE_URL, {
    autoConnect: false, // No se conecta solo al cargar la página
    transports: ["websocket"], // Forzamos el uso de WebSockets para mayor velocidad
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