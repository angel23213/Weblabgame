import React, { createContext, useContext, useEffect, useState } from 'react';
import { socket, getPlayerId } from '../api/socket';
import { type GameState } from '../types/game.types';

// Definimos qué información ofrece este contexto
interface GameContextType {
  gameState: GameState | null;
  isConnected: boolean;
  sendMove: (move: any) => void; // Luego afinaremos el tipo 'any'
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    socket.connect();

    // Escuchar cuando el estado del juego cambie en el servidor
    socket.on('gameStateUpdate', (newState: GameState) => {
      setGameState(newState);
    });

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('reconnectUser', { playerId: getPlayerId() });
    });

    socket.on('disconnect', () => setIsConnected(false));

    return () => {
      socket.off('gameStateUpdate');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  const sendMove = (move: any) => {
    socket.emit('makeMove', move);
  };

  return (
    <GameContext.Provider value={{ gameState, isConnected, sendMove }}>
      {children}
    </GameContext.Provider>
  );
};

// Hook personalizado para que tus compañeros lo usen fácilmente
export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame debe usarse dentro de un GameProvider');
  return context;
};