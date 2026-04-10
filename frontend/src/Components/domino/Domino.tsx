import { useState, memo } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useAuth } from '../../contexts/AuthContext';
import { type DominoState, type DominoPiece } from '../../types/game.types';
import { TimerDisplay } from '../TimerDisplay';
import { ConfirmationModal } from '../ConfirmationModal';
import './DominoStyle.css';

const DominoPieceView = memo(({ piece, isHorizontal }: { piece: DominoPiece, isHorizontal?: boolean }) => {
    return (
        <div className={`domino-tile ${isHorizontal ? 'horizontal' : ''}`}>
            <span>{piece.sideA}</span>
            <div className="tile-separator"></div>
            <span>{piece.sideB}</span>
        </div>
    );
});

export const Domino = () => {
    const { gameState, sendMove, leaveGame } = useGame();
    const { user } = useAuth();
    const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 1. Verificación básica
    if (!gameState || gameState.gameType !== 'domino') {
        return <div className="domino-container">Esperando conexión...</div>;
    }

    const myPlayerId = user?.id.toString() || '';
    const myPlayer = gameState.players.find(p => p.id === myPlayerId);
    const data = gameState.data as DominoState;
    const isMyTurn = gameState.status === 'playing' && gameState.currentTurn === myPlayerId;

    const handlePlayTile = (tileId: string, direction: 'left' | 'right') => {
        if (!isMyTurn) return;
        sendMove({
            gameId: gameState.gameId,
            playerId: myPlayerId,
            gameType: 'domino',
            action: 'play-tile',
            payload: { tileId, direction }
        });
        setSelectedTileId(null);
    };

    const handleDraw = () => {
        if (!isMyTurn) return;
        sendMove({
            gameId: gameState.gameId,
            playerId: myPlayerId,
            gameType: 'domino',
            action: 'draw-tile',
            payload: {}
        });
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
            gameType: 'domino',
            action: 'surrender',
            payload: {}
        });
        setTimeout(() => {
            leaveGame(gameState.gameId);
        }, 500);
    };

    const handlePass = () => {
        if (!isMyTurn) return;
        sendMove({
            gameId: gameState.gameId,
            playerId: myPlayerId,
            gameType: 'domino',
            action: 'pass-turn',
            payload: {}
        });
    };

    // Pantalla de espera interactiva
    if (gameState.status === 'waiting') {
        return (
            <div className="domino-container" style={{ margin: '20vh auto', textAlign: 'center' }}>
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
                    La partida comenzará pronto.
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

    const myHand = data.playerHands[myPlayerId] || [];
    const opponent = gameState.players.find(p => p.id !== myPlayerId);
    const opponentHandCount = opponent ? (data.playerHands[opponent.id]?.length || 0) : 0;

    return (
        <div className="domino-container" style={{ margin: '12vh auto 5vh auto', maxWidth: '1000px' }}>
            <ConfirmationModal 
                isOpen={isModalOpen}
                title="Confirmar Salida"
                message="Advertencia: si sales ahora perderás la partida."
                onConfirm={confirmSurrender}
                onCancel={() => setIsModalOpen(false)}
            />

            {/* Layout Simétrico */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: gameState.status === 'playing' ? '150px 1fr 1fr 150px' : '1fr', 
                alignItems: 'center', 
                width: '100%', 
                marginBottom: '40px',
                padding: '0 20px',
                gap: '10px'
            }}>
                
                {gameState.status === 'playing' ? (
                    <>
                        {/* 1. Extremo Izquierdo: Botón Salir */}
                        <div style={{ justifySelf: 'start' }}>
                            <button 
                                onClick={handleExit} 
                                style={{ 
                                    background: '#ff4a4a', 
                                    color: 'white', 
                                    padding: '12px 24px', 
                                    borderRadius: '8px', 
                                    border: 'none', 
                                    cursor: 'pointer', 
                                    fontWeight: 'bold',
                                    fontSize: '1.1rem',
                                    boxShadow: '0 4px 6px var(--shadow-color)'
                                }}
                            >
                                {gameState.mode === 'daily' ? '💾 Salir' : '🚪 Salir'}
                            </button>
                        </div>

                        {/* 2. Centro Izquierdo: Estado de Turno */}
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <h2 style={{ fontSize: '1.6rem', color: isMyTurn ? 'var(--success-color)' : 'var(--text-secondary)', margin: '0', fontWeight: '800' }}>
                                {isMyTurn ? '✨ ¡Es tu turno!' : '⏳ Esperando...'}
                            </h2>
                            {opponent && (
                                <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: '0' }}>
                                    Rival: <strong>{opponentHandCount}</strong>
                                </p>
                            )}
                        </div>

                        {/* 3. Centro Derecho: Botones Robar y Pasar */}
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button 
                                onClick={handleDraw} 
                                disabled={!isMyTurn || data.boneyard.length === 0} 
                                style={{ 
                                    padding: '10px 25px', 
                                    fontSize: '1rem', 
                                    background: 'var(--accent-color)', 
                                    color: 'white',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    opacity: (!isMyTurn || data.boneyard.length === 0) ? 0.5 : 1
                                }}
                            >
                                Robar ({data.boneyard.length})
                            </button>
                            <button 
                                onClick={handlePass} 
                                disabled={!isMyTurn || data.boneyard.length > 0} 
                                style={{ 
                                    padding: '10px 25px', 
                                    fontSize: '1rem', 
                                    background: 'var(--text-secondary)', 
                                    color: 'white',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    opacity: (!isMyTurn || data.boneyard.length > 0) ? 0.5 : 1
                                }}
                            >
                                Pasar
                            </button>
                        </div>

                        {/* 4. Extremo Derecho: Temporizador */}
                        <div style={{ justifySelf: 'end' }}>
                            <TimerDisplay gameState={gameState} playerId={myPlayerId} />
                        </div>
                    </>
                ) : (
                    /* Pantalla de Fin de Juego Centrada */
                    <div style={{ textAlign: 'center', width: '100%' }}>
                        <h2 style={{ fontSize: '3.5rem', margin: '0 0 10px 0', textShadow: '0 2px 4px var(--shadow-color)' }}>
                            Fin del juego
                        </h2>
                        {gameState.winnerId ? (
                            <h3 style={{ 
                                fontSize: '2rem', 
                                color: gameState.winnerId === myPlayer?.id ? 'var(--success-color)' : 'var(--danger-color)',
                                margin: 0,
                                fontWeight: 'bold'
                            }}>
                                {gameState.winnerId === myPlayer?.id ? '🏆 ¡Felicidades, has ganado!' : '💔 Mejor suerte la próxima.'}
                            </h3>
                        ) : (
                            <h3 style={{ fontSize: '2rem', color: 'var(--draw-text)', margin: 0 }}>🤝 ¡Empate!</h3>
                        )}
                        <p style={{ marginTop: '10px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{data.message}</p>
                    </div>
                )}
            </div>

            <div className="domino-board">
                {data.board.map((piece: DominoPiece, i: number) => (
                    <DominoPieceView key={`${piece.id}-board-${i}`} piece={piece} isHorizontal />
                ))}
                {data.board.length === 0 && (
                    <p style={{ color: 'white', margin: 'auto' }}>El tablero está vacío. Juega cualquier ficha para empezar.</p>
                )}
            </div>

            <div className="player-hand-section" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                <h3 style={{ marginTop: '20px' }}>Tu Mano ({myHand.length})</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Haz clic en una ficha para seleccionar dónde jugarla</p>

                <div className="player-hand" style={{ marginTop: '15px' }}>
                    {myHand.map((piece: DominoPiece) => {
                        const canLeft = data.board.length === 0 || piece.sideA === data.leftValue || piece.sideB === data.leftValue;
                        const canRight = data.board.length === 0 || piece.sideA === data.rightValue || piece.sideB === data.rightValue;
                        const isSelected = selectedTileId === piece.id;

                        return (
                            <div key={piece.id} className="hand-tile">
                                {isSelected && isMyTurn && (
                                    <div className="tile-actions">
                                        {canLeft && <button onClick={() => handlePlayTile(piece.id, 'left')}>Izq</button>}
                                        {canRight && <button onClick={() => handlePlayTile(piece.id, 'right')}>Der</button>}
                                        {(!canLeft && !canRight) && <span style={{ color: '#ff4757', backgroundColor: 'white', padding: '2px', borderRadius: '4px' }}>No encaja</span>}
                                    </div>
                                )}
                                <div
                                    className="domino-tile"
                                    style={{ border: isSelected ? '2px solid var(--accent-color)' : '2px solid var(--border-color)' }}
                                    onClick={() => setSelectedTileId(isSelected ? null : piece.id)}
                                >
                                    <span>{piece.sideA}</span>
                                    <div className="tile-separator"></div>
                                    <span>{piece.sideB}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Botones de Final de Partida */}
            {gameState.status === 'finished' && (
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '40px' }}>
                    <button onClick={() => leaveGame(gameState.gameId)} className="restart-btn" style={{ background: '#555', padding: '12px 24px', fontSize: '1.1rem' }}>
                        Salir al Lobby
                    </button>
                    
                    <button 
                        className="restart-btn"
                        disabled={gameState.rematchRequests?.includes(myPlayerId) || opponent?.disconnected}
                        onClick={() => sendMove({ 
                            gameId: gameState.gameId, 
                            playerId: myPlayerId, 
                            gameType: 'domino', 
                            action: 'rematch-request', 
                            payload: {} 
                        })}
                        style={{ padding: '12px 24px', fontSize: '1.1rem', background: (gameState.rematchRequests?.includes(myPlayerId) || opponent?.disconnected) ? '#666' : 'var(--accent-color)' }}
                    >
                        {opponent?.disconnected ? 'Rival salió 🚪' : (gameState.rematchRequests?.includes(myPlayerId) ? 'Esperando rival...' : '¡Revancha! 🔄')}
                    </button>
                </div>
            )}
        </div>
    );
};
