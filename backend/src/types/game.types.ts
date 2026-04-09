export type GameType = 'tic-tac-toe' | 'domino';
export type GameMode = 'blitz' | 'daily';
export type PlayerSymbol = 'X' | 'O'; // <-- Nuevo

export interface Player {
    id: string;
    username: string;
    socketId: string;
    symbol?: PlayerSymbol; // <-- Añadimos esto para saber si el jugador es X o O
    hand?: any[];
    disconnected?: boolean;
}

export interface TicTacToeState {
    board: (PlayerSymbol | null)[]; // <-- Símbolos específicos
    nextTurn: PlayerSymbol;         // <-- Nuevo
    winningLine: number[] | null;
}

export interface DominoPiece {
    id: string; // Para identificar reactivamente (ej. "6-6")
    sideA: number;
    sideB: number;
}

export interface DominoState {
    board: DominoPiece[]; // Las piezas que están en el tablero
    boneyard: DominoPiece[]; // Las piezas sobrantes (para robar)
    playerHands: Record<string, DominoPiece[]>; // Mapa del ID de jugador a sus piezas
    leftValue: number;  // Valor extremo izquierdo disponible
    rightValue: number; // Valor extremo derecho disponible
    message?: string; // Mensaje de acciones (ej. "Jugador 1 robó ficha")
}

export interface GameMove {
    gameId: string;
    playerId: string;
    gameType: GameType;
    action: 'make-move' | 'play-tile' | 'draw-tile' | 'pass-turn' | 'rematch-request' | 'surrender'; // <-- 'surrender' añadido
    payload: {
        position?: number;
        tile?: DominoPiece;
        direction?: 'left' | 'right';
    };
}

export interface GameState {
    gameId: string;
    gameType: GameType;
    mode: GameMode;
    players: Player[];
    status: 'waiting' | 'playing' | 'finished';
    currentTurn: string;
    data: any; // Usamos 'any' temporalmente para facilitar la vida a tus compañeros en esta fase básica
    winnerId?: string;
    rematchRequests?: string[]; // IDs de jugadores que pidieron revancha
    timers?: Record<string, number>; // Tiempo restante por jugador en msg (modo blitz)
    lastMoveTime?: number; // Cuándo inició el turno actual
}