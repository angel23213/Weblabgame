import { useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { getPlayerId } from '../../api/socket';
import { type DominoState, type DominoPiece } from '../../types/game.types';
import './DominoStyle.css';

export const Domino = () => {
    const { gameState, sendMove } = useGame();
    const [selectedTileId, setSelectedTileId] = useState<string | null>(null);

    // 1. Verificación básica
    if (!gameState || gameState.gameType !== 'domino') {
        return <div className="domino-container">Esperando conexión...</div>;
    }

    // 2. Jugador
    const myPlayer = gameState.players.find(p => p.id === getPlayerId());
    const data = gameState.data as DominoState;
    const isMyTurn = gameState.status === 'playing' && gameState.currentTurn === getPlayerId();

    // Pantalla de espera interactiva
    if (gameState.status === 'waiting') {
        return (
            <div className="domino-container">
                <div className="info-panel">
                    <h2>🕒 Esperando rival para el Dominó...</h2>
                    <p>La partida comenzará pronto.</p>
                </div>
                <button onClick={() => window.location.reload()} className="restart-btn" style={{ marginTop: '20px' }}>
                    Regresar al Lobby
                </button>
            </div>
        );
    }

    const myHand = data.playerHands[getPlayerId() as string] || [];

    // Contamos cuántas fichas tiene el oponente
    const opponent = gameState.players.find(p => p.id !== getPlayerId());
    const opponentHandCount = opponent ? (data.playerHands[opponent.id]?.length || 0) : 0;

    const handlePlayTile = (tileId: string, direction: 'left' | 'right') => {
        if (!isMyTurn) return;
        sendMove({
            gameId: gameState.gameId,
            playerId: getPlayerId(),
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
            playerId: getPlayerId(),
            gameType: 'domino',
            action: 'draw-tile',
            payload: {}
        });
    };

    const handlePass = () => {
        if (!isMyTurn) return;
        sendMove({
            gameId: gameState.gameId,
            playerId: getPlayerId(),
            gameType: 'domino',
            action: 'pass-turn',
            payload: {}
        });
    };

    return (
        <div className="domino-container">
            <div className="info-panel">
                <div>
                    <h2>{gameState.status === 'finished' ? '🏁 Fin de Partida' : '🎲 Partida de Dominó'}</h2>
                    <p><i>{data.message}</i></p>
                    {opponent && <p>Fichas del oponente ({opponent.username}): <strong>{opponentHandCount}</strong></p>}
                </div>
                <div>
                    <h3 style={{ color: isMyTurn ? '#d4edda' : '#ccc' }}>
                        {isMyTurn ? '✨ ¡Es tu turno!' : '⏳ Esperando al oponente...'}
                    </h3>
                    <div className="action-buttons">
                        <button onClick={handleDraw} disabled={!isMyTurn || data.boneyard.length === 0}>
                            Robar ({data.boneyard.length})
                        </button>
                        <button onClick={handlePass} disabled={!isMyTurn || data.boneyard.length > 0}>
                            Pasar
                        </button>
                    </div>
                </div>
            </div>

            <div className="domino-board">
                {data.board.map((piece, i) => (
                    <div key={`board-${i}`} className="domino-tile horizontal">
                        <span>{piece.sideA}</span>
                        <div className="tile-separator"></div>
                        <span>{piece.sideB}</span>
                    </div>
                ))}
                {data.board.length === 0 && (
                    <p style={{ color: 'white', margin: 'auto' }}>El tablero está vacío. Juega cualquier ficha para empezar.</p>
                )}
            </div>

            <div className="player-hand-section" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                <h3 style={{ marginTop: '20px' }}>Tu Mano ({myHand.length})</h3>
                <p style={{ fontSize: '0.8rem', color: '#666' }}>Haz clic en una ficha para seleccionar dónde jugarla</p>

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
                                    style={{ border: isSelected ? '2px solid #3498db' : '2px solid #ccc' }}
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

            {gameState.status === 'finished' && (
                <div className="result-overlay" style={{ marginTop: '30px', textAlign: 'center' }}>
                    {gameState.winnerId ? (
                        <h3 className={gameState.winnerId === myPlayer?.id ? "winner-msg" : "loser-msg"} style={{ color: gameState.winnerId === myPlayer?.id ? '#155724' : '#721c24' }}>
                            {gameState.winnerId === myPlayer?.id
                                ? '🏆 ¡Felicidades, has ganado el Dominó!'
                                : '💔 Mejor suerte la próxima.'}
                        </h3>
                    ) : (
                        <h3 className="draw-msg">🤝 La partida se ha bloqueado o empatado.</h3>
                    )}
                    <button onClick={() => window.location.reload()} className="restart-btn" style={{ padding: '10px 20px', fontSize: '1.2rem', marginTop: '15px' }}>
                        Volver al Lobby
                    </button>
                </div>
            )}
        </div>
    );
};
