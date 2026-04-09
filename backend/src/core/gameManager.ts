import { type GameState, type GameMove, type GameType, type PlayerSymbol, type GameMode } from '../types/game.types.js';
import { createInitialGatoState, makeGatoMove, checkWinner } from '../games/gato/gatoLogic.js';
import { createInitialDominoState, makeDominoMove, checkDominoWinner } from '../games/domino/dominoLogic.js';
import { saveNewGame, updateGameInDB, loadActiveDailyGames } from '../services/game.service.js';

class GameManager {
    // Almacén de partidas: La llave es el ID de la partida, el valor es el estado completo
    private games: Map<string, GameState> = new Map();
    // Almacena los timeouts de desconexión por playerId
    private timeouts: Map<string, NodeJS.Timeout> = new Map();
    // Almacena los timeouts del reloj de Blitz por gameId
    private turnTimeouts: Map<string, NodeJS.Timeout> = new Map();
    private onGameEnd?: (game: GameState) => void;

    constructor() { 
        this.initializeDailyGames();
    }

    private async initializeDailyGames() {
        // Cargar desde PostgreSQL al iniciar el servidor
        const activeGames = await loadActiveDailyGames();
        for (const game of activeGames) {
            this.games.set(game.gameId, game);
        }
        if (activeGames.length > 0) {
            console.log(`📡 Se recuperaron ${activeGames.length} partidas diarias de la Base de Datos.`);
        }

        // Tarea que corre cada 15 minutos (900,000 ms) barriendo las inactividades de 24 hrs
        setInterval(() => {
            const now = Date.now();
            const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

            for (const [gameId, game] of this.games.entries()) {
                if (game.mode === 'daily' && game.status === 'playing' && game.lastMoveTime) {
                    if (now - game.lastMoveTime >= TWENTY_FOUR_HOURS) {
                        // Pasaron 24 horas exactas desde el último movimiento
                        game.status = 'finished';
                        
                        // Quien no movió pierde. El otro gana.
                        const opponent = game.players.find(p => p.id !== game.currentTurn);
                        if (opponent) {
                            game.winnerId = opponent.id;
                        }
                        
                        if (game.data) {
                            game.data.message = `El tiempo expiró. ${opponent?.username || 'El oponente'} gana por abandono (24 horas sin jugar).`;
                        }

                        // Disparar las de DB y sockets
                        if (this.onGameEnd) {
                            this.onGameEnd(game);
                        }
                        
                        updateGameInDB(game);
                    }
                }
            }
        }, 900000); // 15 mins
    }

    public setGameEndCallback(cb: (game: GameState) => void) {
        this.onGameEnd = cb;
    }

    // Crear una nueva partida
    public createGame(gameId: string, type: GameType, mode: GameMode, players: any[]): GameState {
        // Asignamos símbolos a los jugadores para el Gato
        if (type === 'tic-tac-toe') {
            if (players[0]) players[0].symbol = 'X';
            if (players[1]) players[1].symbol = 'O';
        }

        const initialState: GameState = {
            gameId,
            gameType: type,
            mode,
            players,
            status: players.length === 2 ? 'playing' : 'waiting', // Comienza en waiting si solo hay 1 jugador
            currentTurn: players[0].id,
            lastMoveTime: Date.now(), // <-- Añadir este rastreador inicial
            data: type === 'tic-tac-toe'
                ? createInitialGatoState()
                : createInitialDominoState(players),
        };

        if (mode === 'blitz') {
            initialState.timers = {};
            // Asignar 5 minutos (300,000 ms) a los jugadores presentes
            for (const p of players) {
                initialState.timers[p.id] = 300000;
            }
        }

        this.games.set(gameId, initialState);
        saveNewGame(initialState);
        return initialState;
    }

    // Iniciar el reloj públicamente (útil para cuando se une el 2do jugador)
    public startGameClock(gameId: string) {
        const game = this.games.get(gameId);
        if (game) {
            if (game.mode === 'blitz') {
                if (!game.timers) game.timers = {};
                for (const p of game.players) {
                    if (game.timers[p.id] === undefined) {
                        game.timers[p.id] = 300000;
                    }
                }
            }
            this.setTurnTimer(game);
        }
    }

    // Iniciar/Reiniciar el reloj de un jugador en turno
    private setTurnTimer(game: GameState) {
        if (game.mode !== 'blitz' || game.status !== 'playing' || !game.timers || !game.currentTurn) return;

        // Limpiamos el timeout anterior
        const oldTimeout = this.turnTimeouts.get(game.gameId);
        if (oldTimeout) clearTimeout(oldTimeout);

        game.lastMoveTime = Date.now();
        const timeLeft = game.timers[game.currentTurn] || 0;

        const timeoutId = setTimeout(() => {
            // El tiempo se agotó
            const current = this.games.get(game.gameId);
            if (current && current.status === 'playing' && current.currentTurn) {
                current.status = 'finished';
                if (current.timers) current.timers[current.currentTurn] = 0; // Tiempo en 0
                
                // Gana el oponente por agotamiento de tiempo
                const opponent = current.players.find(p => p.id !== current.currentTurn);
                if (opponent) {
                    current.winnerId = opponent.id;
                }
                
                if (current.data) {
                    current.data.message = `¡Se acabó el tiempo! Victoria por reloj para ${opponent?.username || 'el oponente'}.`;
                }

                if (this.onGameEnd) {
                    this.onGameEnd(current);
                }
            }
        }, Math.max(timeLeft, 100)); // mínimo 100ms

        this.turnTimeouts.set(game.gameId, timeoutId);
    }
    
    // Calcula y resta el tiempo gastado
    private deductTime(game: GameState, playerId: string) {
        if (game.mode === 'blitz' && game.timers && game.lastMoveTime) {
            const timeSpent = Date.now() - game.lastMoveTime;
            game.timers[playerId] = Math.max(0, (game.timers[playerId] || 0) - timeSpent);
        }
    }

    // Procesar un movimiento
    public handleMove(move: GameMove): GameState | { error: string } {
        const game = this.games.get(move.gameId);

        // 1. Validaciones básicas
        if (!game) return { error: "Partida no encontrada" };

        if (move.action === 'rematch-request') {
            if (!game.rematchRequests) game.rematchRequests = [];
            if (!game.rematchRequests.includes(move.playerId)) {
                game.rematchRequests.push(move.playerId);
            }

            if (game.rematchRequests.length === 2 && game.players.length === 2) {
                // Ambos jugadores aceptaron revancha: reiniciar la partida
                game.status = 'playing';
                delete game.winnerId;
                game.rematchRequests = [];
                
                if (game.gameType === 'tic-tac-toe' && game.players[0] && game.players[1]) {
                    const temp = game.players[0].symbol as PlayerSymbol;
                    game.players[0].symbol = game.players[1].symbol as PlayerSymbol;
                    game.players[1].symbol = temp;
                    
                    game.data = createInitialGatoState();
                    game.currentTurn = game.players.find(p => p?.symbol === 'X')?.id || game.players[0].id;
                } else if (game.gameType === 'domino' && game.players[0]) {
                    game.data = createInitialDominoState(game.players);
                    game.currentTurn = game.players[0].id;
                }
                
                if (game.mode === 'blitz') {
                    game.timers = {
                        [game.players[0].id]: 300000,
                        [game.players[1].id]: 300000
                    };
                    this.setTurnTimer(game);
                }
                return game;
            }
            return game;
        }

        if (move.action === 'surrender') {
            game.status = 'finished';
            const opponent = game.players.find(p => p.id !== move.playerId);
            if (opponent) {
                game.winnerId = opponent.id;
            }
            if (game.data) {
                const player = game.players.find(p => p.id === move.playerId);
                game.data.message = `${player?.username || 'El jugador'} se ha rendido. ¡Victoria por abandono!`;
            }
            if (game.mode === 'daily') {
                updateGameInDB(game);
            }
            const oldTimeout = this.turnTimeouts.get(game.gameId);
            if (oldTimeout) clearTimeout(oldTimeout);
            
            if (this.onGameEnd) {
                this.onGameEnd(game);
            }
            return game;
        }

        if (game.status === 'finished') return { error: "La partida ya terminó" };
        if (game.currentTurn !== move.playerId) return { error: "No es tu turno" };

        // Antes de procesar movimiento, restamos su tiempo consumido
        this.deductTime(game, move.playerId);

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
                // Limpiar reloj si se acabó el juego
                const oldTimeout = this.turnTimeouts.get(game.gameId);
                if (oldTimeout) clearTimeout(oldTimeout);
            } else {
                // Si el juego sigue, cambiamos el turno al otro jugador
                const nextPlayer = game.players.find(p => p.id !== move.playerId);
                if (nextPlayer) {
                    game.currentTurn = nextPlayer.id;
                    game.lastMoveTime = Date.now();
                    this.setTurnTimer(game);
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
                // Limpiar reloj si acabó
                const oldTimeout = this.turnTimeouts.get(game.gameId);
                if (oldTimeout) clearTimeout(oldTimeout);
            } else {
                // Si la acción fue jugar o pasar, cambiamos el turno. (Robar no pasa el turno solo por robar).
                if (move.action === 'play-tile' || move.action === 'pass-turn') {
                    const nextPlayer = game.players.find(p => p.id !== move.playerId);
                    if (nextPlayer) {
                        game.currentTurn = nextPlayer.id;
                        game.lastMoveTime = Date.now();
                        this.setTurnTimer(game);
                    }
                } else {
                    // Si solo roba pero sigue siendo su turno, se reinicia la cuenta desde el robo
                    game.lastMoveTime = Date.now();
                }
            }
        }

        // Si es partida diaria, respaldamos el movimiento en la BD
        if (game.mode === 'daily') {
            updateGameInDB(game);
        }

        return game;
    }

    public findAvailableGame(gameType: GameType, mode: GameMode): string | null {
        for (const [id, game] of this.games.entries()) {
            if (game.gameType === gameType && game.mode === mode && game.status === 'waiting' && game.players.length < 2) {
                return id;
            }
        }
        return null;
    }

    public getActiveGamesForPlayer(playerId: string): GameState[] {
        const result: GameState[] = [];
        for (const [id, game] of this.games.entries()) {
            if (game.mode === 'daily' && game.status !== 'finished') {
                if (game.players.some(p => p.id === playerId)) {
                    result.push(game);
                }
            }
        }
        return result;
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

                // Si estaban jugando, hay que tratar distinto Blitz vs Diario
                if (game.status === 'playing') {
                    player.disconnected = true;
                    if (game.data) {
                        if (game.mode === 'daily') {
                            game.data.message = `¡${player.username} ha salido! Puede tardar hasta 24 hrs en volver.`;
                        } else {
                            game.data.message = `¡${player.username} se ha desconectado! Esperando 30s a que vuelva...`;
                        }
                    }

                    // En modo 'daily' NO echamos a andar el reloj de 30s de abandono
                    if (game.mode !== 'daily') {
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
                    }
                    
                    return game; // Retornamos la partida para enviar la notificación
                }

                // NUEVO: Si la partida YA terminó y alguien se va, borramos la partida de memoria
                // Esto cancela cualquier espera de revancha (porque la partida desaparece)
                if (game.status === 'finished') {
                    // Limpieza opcional: avisar al que se queda que el otro se fue
                    player.disconnected = true;
                    if (game.data) {
                        game.data.message = `El oponente ha salido del juego. Partida cerrada.`;
                    }
                    onTimeout(game); // Notificamos el cambio de estado (desconexión)
                    this.games.delete(gameId);
                    return null;
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