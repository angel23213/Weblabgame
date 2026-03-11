export type GameType = 'tic-tac-toe' | 'domino';

export interface Player {
    id: string;
    username: string;
    socketId: string;
    hand?: any[]; 
}


export interface TicTacToeState {
    board: (string | null)[]; 
    winningLine: number[] | null; 
}


export interface DominoPiece {
    sideA: number;
    sideB: number;
}

export interface DominoState {
    board: DominoPiece[]; 
    leftValue: number;    
    rightValue: number;   
    stockCount: number;   
}


export interface GameMove {
    gameId: string;
    playerId: string;
    gameType: GameType;
    action: 'place-piece' | 'play-tile' | 'draw-tile' | 'pass-turn';
    payload: {
        position?: number;       
        tile?: DominoPiece;      
        direction?: 'left' | 'right'; // Para saber de qué lado pone la ficha en Dominó
    };
}

// 4. Estado Maestro de la Partida
export interface GameState {
    gameId: string;
    gameType: GameType;
    players: Player[];
    status: 'waiting' | 'playing' | 'finished';
    currentTurn: string;
    data: TicTacToeState | DominoState; 
    winnerId?: string;
}