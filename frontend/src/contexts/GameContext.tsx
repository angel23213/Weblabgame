import React, { createContext, useContext, useEffect, useState } from 'react';
import { socket, getPlayerId } from '../api/socket';
import { type GameState } from '../types/game.types';

// Definimos qué información ofrece este contexto
interface GameContextType {
  gameState: GameState | null;
  isConnected: boolean;
  sendMove: (move: any) => void;
  leaveGame: (gameId: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    // Si ya está conectado desde antes (ej. por React StrictMode)
    if (socket.connected) {
      setIsConnected(true);
      socket.emit('reconnectUser', { playerId: getPlayerId() });
    }

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('reconnectUser', { playerId: getPlayerId() });
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onGameStateUpdate = (newState: GameState) => {
      setGameState(newState);
    };

    const onPlayerLeft = (gameId: string) => {
      setGameState(prev => {
        if (!prev || prev.gameId !== gameId) return prev;
        // Marcamos al oponente como desconectado localmente para que la UI reaccione
        return {
          ...prev,
          players: prev.players.map(p => ({
            ...p,
            disconnected: true
          }))
        };
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('gameStateUpdate', onGameStateUpdate);
    socket.on('onPlayerLeft', onPlayerLeft);

    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('gameStateUpdate', onGameStateUpdate);
      socket.off('onPlayerLeft', onPlayerLeft);
    };
  }, []);

  const sendMove = (move: any) => {
    socket.emit('makeMove', move);
  };

  const leaveGame = (gameId: string) => {
    socket.emit('leaveGame', { gameId });
    setGameState(null);
  };

  return (
    <GameContext.Provider value={{ gameState, isConnected, sendMove, leaveGame }}>
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