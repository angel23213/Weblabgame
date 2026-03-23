import { type TicTacToeState, type PlayerSymbol } from '../../types/game.types.js';

/**
 * Crea el estado inicial limpio para una nueva partida de Gato.
 */
export const createInitialGatoState = (): TicTacToeState => ({
  board: Array(9).fill(null),
  nextTurn: 'X',
  winningLine: null,
});

/**
 * Revisa si hay un ganador, empate o si el juego debe continuar.
 */
export const checkWinner = (board: (PlayerSymbol | null)[]) => {
  // Al usar "as const", TypeScript sabe que cada sub-array tiene exactamente 3 números
  // y que esos números son válidos para indexar el tablero.
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Horizontales
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Verticales
    [0, 4, 8], [2, 4, 6]             // Diagonales
  ] as const;

  for (const line of lines) {
    const [a, b, c] = line;

    // Extraemos los valores para que TS los analice fuera del array
    const valA = board[a];
    const valB = board[b];
    const valC = board[c];

    if (valA && valA === valB && valA === valC) {
      return { 
        winner: valA as PlayerSymbol, 
        line: [a, b, c] as number[] 
      };
    }
  }

  // Si no hay espacios nulos, es un empate
  if (!board.includes(null)) {
    return { winner: 'Draw' as const, line: null };
  }

  // El juego sigue
  return { winner: null, line: null };
};

/**
 * Procesa un movimiento y devuelve el nuevo estado del juego.
 */
export const makeGatoMove = (state: TicTacToeState, position: number, symbol: PlayerSymbol): TicTacToeState => {
  // 1. Si la posición ya está ocupada o ya hay una línea ganadora, no hacemos nada
  if (state.board[position] !== null || state.winningLine) {
    return state;
  }

  // 2. Clonamos el tablero para mantener la inmutabilidad (regla de oro en React/Redux)
  const newBoard = [...state.board];
  newBoard[position] = symbol;

  // 3. Calculamos si este movimiento generó una victoria
  const { line } = checkWinner(newBoard);

  // 4. Devolvemos el nuevo objeto de estado
  return {
    board: newBoard,
    nextTurn: symbol === 'X' ? 'O' : 'X',
    winningLine: line,
  };
};