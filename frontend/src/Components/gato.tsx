import { useGame } from '../contexts/GameContext';
import { type TicTacToeState } from '../types/game.types';
import { getPlayerId } from '../api/socket';
import './gato/Gatostile.css';

export const Gato = () => {
    const { gameState, sendMove } = useGame();

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
    const myPlayer = gameState.players.find(p => p.id === getPlayerId());
    const isMyTurn = data.nextTurn === myPlayer?.symbol;

    const handleCellClick = (index: number) => {
        // Solo permitir el clic si:
        // - La celda está vacía
        // - El juego está en curso
        // - ES TU TURNO
        if (data.board[index] === null && gameState.status === 'playing' && isMyTurn) {
            sendMove({
                gameId: gameState.gameId,
                playerId: getPlayerId(),
                gameType: 'tic-tac-toe',
                action: 'make-move',
                payload: { position: index }
            });
        }
    };

    if (gameState.status === 'waiting') {
        return (
            <div className="gato-container">
                <div className="status-info">
                    <h2>🕒 Esperando rival...</h2>
                    <p>La partida comenzará cuando se una otro jugador. Eres: <strong>{myPlayer?.symbol || 'X'}</strong></p>
                </div>
                <button onClick={() => window.location.reload()} className="restart-btn" style={{ marginTop: '20px' }}>
                    Cancelar y volver al Lobby
                </button>
            </div>
        );
    }

    return (
        <div className="gato-container">
            <div className="status-info">
                <h2>{gameState.status === 'finished' ? '🏁 Fin del Juego' : '🎮 En curso'}</h2>

                {/* Mensaje dinámico según el turno */}
                <div className="turn-indicator">
                    <p>Eres: <strong>{myPlayer?.symbol || 'Espectador'}</strong></p>
                    {gameState.status === 'playing' && (
                        <p className={isMyTurn ? 'my-turn-alert' : 'waiting-alert'}>
                            {isMyTurn ? '✨ ¡Es tu turno!' : `Esperando a ${data.nextTurn}...`}
                        </p>
                    )}
                </div>
            </div>

            <div className={`gato-board ${!isMyTurn ? 'board-disabled' : ''}`}>
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
                <div className="result-overlay">
                    {gameState.winnerId ? (
                        <h3 className={gameState.winnerId === myPlayer?.id ? "winner-msg" : "loser-msg"}>
                            {gameState.winnerId === myPlayer?.id
                                ? '🏆 ¡Felicidades, has ganado!'
                                : '💔 Mejor suerte la próxima.'}
                        </h3>
                    ) : (
                        <h3 className="draw-msg">🤝 ¡Es un empate!</h3>
                    )}
                    <button onClick={() => window.location.reload()} className="restart-btn">
                        Volver al Lobby
                    </button>
                </div>
            )}
        </div>
    );
};