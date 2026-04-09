import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import { type TicTacToeState } from '../types/game.types';
import { TimerDisplay } from './TimerDisplay';
import { ConfirmationModal } from './ConfirmationModal';
import { useState } from 'react';
import './gato/Gatostile.css';

export const Gato = () => {
    const { gameState, sendMove, leaveGame } = useGame();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 1. Verificación de carga
    if (!gameState || gameState.gameType !== 'tic-tac-toe') {
        return (
            <div className="gato-container">
                <p>Esperando conexión con la partida...</p>
            </div>
        );
    }

    const data = gameState.data as TicTacToeState;

    // 2. Identificar al jugador local (Tú)
    const myPlayerId = user?.id.toString() || '';
    const myPlayer = gameState.players.find(p => p.id === myPlayerId);
    const opponent = gameState.players.find(p => p.id !== myPlayerId);
    const isMyTurn = data.nextTurn === myPlayer?.symbol;

    const handleCellClick = (index: number) => {
        // Solo permitir el clic si:
        // - La celda está vacía
        // - El juego está en curso
        // - ES TU TURNO
        if (data.board[index] === null && gameState.status === 'playing' && isMyTurn) {
            sendMove({
                gameId: gameState.gameId,
                playerId: myPlayerId,
                gameType: 'tic-tac-toe',
                action: 'make-move',
                payload: { position: index }
            });
        }
    };

    const handleExit = () => {
        if (gameState.mode === 'blitz' && gameState.status === 'playing') {
            setIsModalOpen(true);
        } else {
            leaveGame(gameState.gameId);
        }
    };

    const confirmSurrender = () => {
        sendMove({
            gameId: gameState.gameId,
            playerId: myPlayerId,
            gameType: 'tic-tac-toe',
            action: 'surrender',
            payload: {}
        });
        setTimeout(() => {
            leaveGame(gameState.gameId);
        }, 500);
    };

    if (gameState.status === 'waiting') {
        return (
            <div className="gato-container" style={{ margin: '20vh auto', textAlign: 'center' }}>
                <ConfirmationModal 
                    isOpen={isModalOpen}
                    title="Confirmar Salida"
                    message="Advertencia: si sales ahora perderás la partida."
                    onConfirm={confirmSurrender}
                    onCancel={() => setIsModalOpen(false)}
                />
                <h1 style={{ fontSize: '4rem', margin: '0', textShadow: '0 4px 10px var(--shadow-color)' }}>
                    🕒 Esperando rival...
                </h1>
                <p style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
                    La partida comenzará pronto. Eres: <strong>{myPlayer?.symbol || 'X'}</strong>
                </p>
                <button 
                    onClick={() => leaveGame(gameState.gameId)} 
                    className="restart-btn" 
                    style={{ marginTop: '40px', padding: '15px 40px', fontSize: '1.3rem' }}
                >
                    Regresar al Lobby
                </button>
            </div>
        );
    }

    return (
        <div className="gato-container" style={{ margin: '13vh auto 5vh auto', maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ConfirmationModal 
                isOpen={isModalOpen}
                title="Confirmar Salida"
                message="Advertencia: si sales ahora perderás la partida."
                onConfirm={confirmSurrender}
                onCancel={() => setIsModalOpen(false)}
            />
            {/* Cabecera superior con Grid de 3 columnas (Alineación perfecta) */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'minmax(120px, 1fr) auto minmax(120px, 1fr)', 
                alignItems: 'center', 
                width: '100%', 
                maxWidth: '800px', 
                margin: '0 auto 30px auto', 
                padding: '0 20px' 
            }}>
                
                {/* 1. Botón Izquierdo: Salir (Solo mientras se juega) */}
                <div style={{ justifySelf: 'start' }}>
                    {gameState.status === 'playing' && (
                        <button 
                            onClick={handleExit} 
                            style={{ 
                                background: '#ff4a4a', 
                                color: 'white', 
                                padding: '10px 20px', 
                                borderRadius: '6px', 
                                border: 'none', 
                                cursor: 'pointer', 
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                            }}
                        >
                            {gameState.mode === 'daily' ? '💾 Salir' : '🚪 Salir'}
                        </button>
                    )}
                </div>
                
                {/* 2. Centro: Textos Principales */}
                <div className="status-info" style={{ textAlign: 'center', border: 'none', background: 'transparent', boxShadow: 'none', padding: 0 }}>
                    {gameState.status === 'playing' ? (
                        <>
                            <h2 style={{ fontSize: '2.5rem', color: isMyTurn ? 'var(--success-color)' : 'var(--text-secondary)', margin: '0 0 10px 0', textShadow: '0 2px 4px var(--shadow-color)' }}>
                                {isMyTurn ? '✨ ¡Es tu turno!' : '⏳ Esperando al rival'}
                            </h2>
                            <p style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-secondary)' }}>
                                Eres: <strong style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginLeft: '5px' }}>{myPlayer?.symbol || 'Espectador'}</strong>
                            </p>
                        </>
                    ) : (
                        <>
                            <h2 style={{ fontSize: '2.5rem', margin: '0 0 10px 0' }}>Fin del juego</h2>
                            {gameState.winnerId ? (
                                <h3 style={{ fontSize: '1.5rem', color: gameState.winnerId === myPlayer?.id ? "#4aff4a" : "#ff4a4a", margin: 0 }}>
                                    {gameState.winnerId === myPlayer?.id ? '🏆 ¡Has ganado!' : '💔 Derrota.'}
                                </h3>
                            ) : (
                                <h3 style={{ fontSize: '1.5rem', color: '#ffd700', margin: 0 }}>🤝 ¡Empate!</h3>
                            )}
                        </>
                    )}
                </div>

                {/* 3. Botón Derecho: Temporizador */}
                <div style={{ justifySelf: 'end' }}>
                    {(gameState.mode === 'blitz' || (gameState.mode === 'daily' && isMyTurn)) && (
                        <div style={{ background: 'var(--panel-bg)', padding: '5px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <TimerDisplay gameState={gameState} playerId={myPlayerId} />
                        </div>
                    )}
                </div>
            </div>

            <div className={`gato-board ${!isMyTurn && gameState.status === 'playing' ? 'board-disabled' : ''}`}>
                {data.board.map((cell, index) => {
                    const isWinningCell = data.winningLine?.includes(index);
                    return (
                        <div
                            key={index}
                            className={`gato-cell ${isWinningCell ? 'winner-cell' : ''} ${cell ? 'filled' : ''}`}
                            onClick={() => handleCellClick(index)}
                        >
                            {cell}
                        </div>
                    );
                })}
            </div>

            {gameState.status === 'finished' && (
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '30px' }}>
                    <button onClick={() => leaveGame(gameState.gameId)} className="restart-btn" style={{ background: '#555', padding: '12px 24px', fontSize: '1.1rem' }}>
                        Salir al Lobby
                    </button>
                    
                    <button 
                        className="restart-btn"
                        disabled={gameState.rematchRequests?.includes(myPlayerId) || opponent?.disconnected}
                        onClick={() => sendMove({ 
                            gameId: gameState.gameId, 
                            playerId: myPlayerId, 
                            gameType: 'tic-tac-toe', 
                            action: 'rematch-request', 
                            payload: {} 
                        })}
                        style={{ 
                            padding: '12px 24px', 
                            fontSize: '1.1rem', 
                            background: (gameState.rematchRequests?.includes(myPlayerId) || opponent?.disconnected) ? '#666' : '#646cff' 
                        }}
                    >
                        {opponent?.disconnected ? 'Rival salió 🚪' : (gameState.rematchRequests?.includes(myPlayerId) ? 'Esperando rival...' : '¡Revancha! 🔄')}
                    </button>
                </div>
            )}
        </div>
    );
};