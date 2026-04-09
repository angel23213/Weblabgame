import React, { useState, useEffect } from 'react';
import { type GameState } from '../types/game.types';

interface TimerDisplayProps {
    gameState: GameState;
    playerId: string;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ gameState, playerId }) => {
    const isMyTurn = gameState.status === 'playing' && gameState.currentTurn === playerId;
    
    // Blitz State
    const serverTimeLeft = gameState.timers?.[playerId] ?? 0;
    const [timeLeftBlitz, setTimeLeftBlitz] = useState(serverTimeLeft);

    // Daily State
    const [timeLeftDaily, setTimeLeftDaily] = useState(0);

    useEffect(() => {
        if (gameState.mode === 'blitz') {
            if (!isMyTurn || gameState.status !== 'playing') {
                setTimeLeftBlitz(serverTimeLeft);
                return;
            }
            const updateTimer = () => {
                const timeSpent = gameState.lastMoveTime ? Date.now() - gameState.lastMoveTime : 0;
                setTimeLeftBlitz(Math.max(0, serverTimeLeft - timeSpent));
            };
            updateTimer();
            const interval = setInterval(updateTimer, 1000); // 1 tick por segundo
            return () => clearInterval(interval);
            
        } else if (gameState.mode === 'daily') {
            if (!isMyTurn || gameState.status !== 'playing') return;
            const updateTimer = () => {
                const timeSpent = gameState.lastMoveTime ? Date.now() - gameState.lastMoveTime : 0;
                setTimeLeftDaily(Math.max(0, 24 * 60 * 60 * 1000 - timeSpent));
            };
            updateTimer();
            const interval = setInterval(updateTimer, 1000); // 1 tick por segundo para refrescos instantáneos
            return () => clearInterval(interval);
        }
    }, [serverTimeLeft, isMyTurn, gameState.lastMoveTime, gameState.status, gameState.mode]);

    // Ocultar timer si no está jugando
    if (gameState.status !== 'playing') return null;

    if (gameState.mode === 'blitz') {
        const minutes = Math.floor(timeLeftBlitz / 60000);
        const seconds = Math.floor((timeLeftBlitz % 60000) / 1000);
        const isCritical = timeLeftBlitz < 30000;
        
        return (
            <span 
                title="Tu tiempo restante"
                style={{ 
                    padding: '6px 12px', 
                    borderRadius: '8px', 
                    background: isMyTurn ? (isCritical ? 'var(--danger-color)' : 'var(--panel-bg)') : 'var(--bg-color)', 
                    color: isMyTurn ? (isCritical ? 'white' : 'var(--text-primary)') : 'var(--text-secondary)',
                    fontWeight: 'bold',
                    display: 'inline-block',
                    fontSize: '1.2rem',
                    border: isMyTurn && isCritical ? '2px solid var(--danger-color)' : '1px solid var(--border-color)',
                    animation: isMyTurn && isCritical ? 'pulse 1s infinite' : 'none'
                }}
            >
                ⏳ {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
        );
    }

    if (gameState.mode === 'daily') {
        if (!isMyTurn) return null; // Solo muestra 24hr al que le toca mover
        
        const hours = Math.floor(timeLeftDaily / 3600000);
        const mins = Math.floor((timeLeftDaily % 3600000) / 60000);
        const isCritical = hours < 2;
        
        return (
            <span 
                title="Expiración de turno"
                style={{ 
                    padding: '6px 12px', 
                    borderRadius: '8px', 
                    background: isCritical ? 'var(--danger-color)' : 'var(--draw-bg)', 
                    color: isCritical ? 'white' : 'var(--draw-text)',
                    fontWeight: 'bold',
                    display: 'inline-block',
                    fontSize: '1.1rem',
                    border: isCritical ? '2px solid var(--danger-color)' : '1px solid var(--border-color)',
                    animation: isCritical ? 'pulse 1s infinite' : 'none'
                }}
            >
                ⏳ {hours}h {mins}m
            </span>
        );
    }

    return null;
};
