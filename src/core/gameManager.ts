import { type GameState, type GameMove, type GameType } from '../types/game.types.js';
// import { processGatoMove } from '../games/tic-tac-toe/logic.js';
// import { processDominoMove } from '../games/domino/logic.js';

class GameManager {
    // Almacén de partidas: La llave es el ID de la partida, el valor es el estado del juego
    private games: Map<string, GameState> = new Map();

    constructor() {}

    // Crear una nueva partida
    public createGame(gameId: string, type: GameType, players: any[]): GameState {
        const initialState: GameState = {
            gameId,
            gameType: type,
            players,
            status: 'playing',
            currentTurn: players[0].id,
            data: type === 'tic-tac-toe' 
                ? { board: Array(9).fill(null), winningLine: null } // Gato
                : { board: [], leftValue: -1, rightValue: -1, stockCount: 28 }, // Dominó
        };

        this.games.set(gameId, initialState);
        return initialState;
    }

    // El corazón: Procesar un movimiento
    public handleMove(move: GameMove): GameState | { error: string } {
        const game = this.games.get(move.gameId);
        if (!game) return { error: "Partida no encontrada" };

        if (game.currentTurn !== move.playerId) {
            return { error: "No es tu turno" };
        }

        // DESPACHADOR: Aquí enviamos el movimiento a la lógica correspondiente
        if (game.gameType === 'tic-tac-toe') {
            // game.data = processGatoMove(game.data, move); 
            // (Tus compañeros llenarán esta parte)
        } else if (game.gameType === 'domino') {
            // game.data = processDominoMove(game.data, move);
        }

        return game;
    }

    public getGame(gameId: string) {
        return this.games.get(gameId);
    }
}

export const gameManager = new GameManager();