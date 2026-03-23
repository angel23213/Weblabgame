import { type GameState, type GameMove, type GameType, type PlayerSymbol } from '../types/game.types.js';
import { createInitialGatoState, makeGatoMove, checkWinner } from '../games/gato/gatoLogic.js';
import { createInitialDominoState, makeDominoMove, checkDominoWinner } from '../games/domino/dominoLogic.js';

class GameManager {
    // Almacén de partidas: La llave es el ID de la partida, el valor es el estado completo
    private games: Map<string, GameState> = new Map();
    // Almacena los timeouts de desconexión por playerId
    private timeouts: Map<string, NodeJS.Timeout> = new Map();

    constructor() { }

    // Crear una nueva partida
    public createGame(gameId: string, type: GameType, players: any[]): GameState {
        // Asignamos símbolos a los jugadores para el Gato
        if (type === 'tic-tac-toe') {
            if (players[0]) players[0].symbol = 'X';
            if (players[1]) players[1].symbol = 'O';
        }

        const initialState: GameState = {
            gameId,
            gameType: type,
            players,
            status: players.length === 2 ? 'playing' : 'waiting', // Comienza en waiting si solo hay 1 jugador
            currentTurn: players[0].id,
            data: type === 'tic-tac-toe'
                ? createInitialGatoState()
                : createInitialDominoState(players),
        };

        this.games.set(gameId, initialState);
        return initialState;
    }

    // Procesar un movimiento
    public handleMove(move: GameMove): GameState | { error: string } {
        const game = this.games.get(move.gameId);

        // 1. Validaciones básicas
        if (!game) return { error: "Partida no encontrada" };
        if (game.status === 'finished') return { error: "La partida ya terminó" };
        if (game.currentTurn !== move.playerId) return { error: "No es tu turno" };

        // 2. Lógica para el Gato (Tic-Tac-Toe)
        if (game.gameType === 'tic-tac-toe') {
            const player = game.players.find(p => p.id === move.playerId);
            const symbol = player?.symbol as PlayerSymbol;

            if (move.payload.position === undefined) {
                return { error: "Posición no enviada" };
            }

            // Intentamos realizar el movimiento
            const newData = makeGatoMove(game.data, move.payload.position, symbol);

            // Si el estado es idéntico, es que el movimiento fue inválido (casilla ocupada)
            if (newData === game.data) {
                return { error: "Movimiento inválido" };
            }

            // Actualizamos la data del juego
            game.data = newData;

            // 3. Verificamos si hay un ganador o empate
            const result = checkWinner(newData.board);

            if (result.winner) {
                game.status = 'finished';
                if (result.winner !== 'Draw') {
                    game.winnerId = move.playerId;
                }
            } else {
                // Si el juego sigue, cambiamos el turno al otro jugador
                const nextPlayer = game.players.find(p => p.id !== move.playerId);
                if (nextPlayer) {
                    game.currentTurn = nextPlayer.id;
                }
            }

        } else if (game.gameType === 'domino') {
            const newData = makeDominoMove(game.data, move.playerId, move.action as any, move.payload);

            if ("error" in newData) {
                return { error: newData.error };
            }

            game.data = newData;

            const { winner, reason } = checkDominoWinner(game.data, game.players);

            if (winner) {
                game.status = 'finished';
                game.data.message = reason;
                if (winner !== 'Draw') {
                    game.winnerId = winner;
                }
            } else {
                // Si la acción fue jugar o pasar, cambiamos el turno. (Robar no pasa el turno solo por robar).
                if (move.action === 'play-tile' || move.action === 'pass-turn') {
                    const nextPlayer = game.players.find(p => p.id !== move.playerId);
                    if (nextPlayer) {
                        game.currentTurn = nextPlayer.id;
                    }
                }
            }
        }

        return game;
    }

    public findAvailableGame(gameType: GameType): string | null {
        for (const [id, game] of this.games.entries()) {
            if (game.gameType === gameType && game.status === 'waiting' && game.players.length < 2) {
                return id;
            }
        }
        return null;
    }

    public getGame(gameId: string) {
        return this.games.get(gameId);
    }

    // Manejo de la desconexión
    public handlePlayerDisconnect(socketId: string, onTimeout: (game: GameState) => void): GameState | null {
        for (const [gameId, game] of this.games.entries()) {
            const playerIndex = game.players.findIndex(p => p.socketId === socketId);
            if (playerIndex !== -1) {
                const player = game.players[playerIndex]!;

                // Si estaba esperando, destruimos la partida
                if (game.status === 'waiting') {
                    this.games.delete(gameId);
                    return null;
                }

                // Si estaban jugando, le damos 30s para volver
                if (game.status === 'playing') {
                    player.disconnected = true;
                    if (game.data) {
                        game.data.message = `¡${player.username} se ha desconectado! Esperando 30s a que vuelva...`;
                    }

                    const timeoutId = setTimeout(() => {
                        const current = this.games.get(gameId);
                        if (current && current.status === 'playing' && current.players[playerIndex]?.disconnected) {
                            current.status = 'finished';
                            const opponent = current.players.find(p => p.id !== player.id);
                            if (opponent) {
                                current.winnerId = opponent.id;
                            }
                            if (current.data) {
                                current.data.message = `${player.username} no regresó a tiempo. ¡Victoria por abandono!`;
                            }
                            onTimeout(current);
                        }
                    }, 30000);

                    this.timeouts.set(player.id, timeoutId);
                    return game; // Retornamos la partida para advertir del tiempo
                }
            }
        }
        return null;
    }

    public reconnectPlayer(playerId: string, socketId: string): GameState | null {
        for (const [gameId, game] of this.games.entries()) {
            const player = game.players.find(p => p.id === playerId);
            if (player && game.status === 'playing' && player.disconnected) {
                player.socketId = socketId;
                player.disconnected = false;

                // Limpiar el timeout
                const timeoutId = this.timeouts.get(playerId);
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    this.timeouts.delete(playerId);
                }

                if (game.data) {
                    game.data.message = `${player.username} se reconectó a tiempo. ¡Sigue la partida!`;
                }
                return game;
            }
        }
        return null;
    }

    // Útil para limpieza
    public removeGame(gameId: string) {
        this.games.delete(gameId);
    }
}

export const gameManager = new GameManager();