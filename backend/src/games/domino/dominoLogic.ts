import { type DominoState, type DominoPiece, type Player } from '../../types/game.types.js';

// 1. Crear el mazo de 28 fichas (Doble 6)
const generateDeck = (): DominoPiece[] => {
    const deck: DominoPiece[] = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            deck.push({ id: `${i}-${j}`, sideA: i, sideB: j });
        }
    }
    return deck;
};

// 2. Mezclar mazo
const shuffle = (deck: DominoPiece[]): DominoPiece[] => {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = newDeck[i] as DominoPiece;
        newDeck[i] = newDeck[j] as DominoPiece;
        newDeck[j] = temp;
    }
    return newDeck;
};

export const createInitialDominoState = (players: Player[]): DominoState => {
    let deck = shuffle(generateDeck());
    const playerHands: Record<string, DominoPiece[]> = {};

    players.forEach(p => {
        // Repartir 7 fichas a cada uno
        playerHands[p.id] = deck.splice(0, 7);
    });

    return {
        board: [],
        boneyard: deck,
        playerHands,
        leftValue: -1,
        rightValue: -1,
        message: "¡La partida ha comenzado! El Jugador 1 puede jugar cualquier ficha."
    };
};

/**
 * Verifica si un jugador tiene alguna ficha que pueda jugar en el tablero actual.
 */
const hasPlayableTile = (hand: DominoPiece[], leftValue: number, rightValue: number): boolean => {
    if (leftValue === -1) return true; // Si el tablero está vacío, todo es jugable
    return hand.some(tile => 
        tile.sideA === leftValue || tile.sideB === leftValue ||
        tile.sideA === rightValue || tile.sideB === rightValue
    );
};

/**
 * Calcula el total de puntos en la mano de un jugador.
 */
export const calculateHandPoints = (hand: DominoPiece[]): number => {
    return hand.reduce((sum, tile) => sum + tile.sideA + tile.sideB, 0);
};

/**
 * Verifica si un jugador tiene movimientos posibles.
 */
export const hasMovesPossible = (hand: DominoPiece[], left: number, right: number): boolean => {
    return hasPlayableTile(hand, left, right);
};

export const checkDominoWinner = (state: DominoState, players: Player[]): { winner: string | 'Draw' | null, reason?: string } => {
    // 1. Ganar por vaciar la mano
    for (const player of players) {
        if (state.playerHands[player.id]?.length === 0) {
            return { winner: player.id, reason: '¡Vació su mano!' };
        }
    }

    if (state.boneyard.length > 0) {
        return { winner: null };
    }

    return { winner: null };
};

// Lógica para jugar, robar o pasar
export const makeDominoMove = (
    state: DominoState,
    playerId: string,
    action: 'play-tile' | 'draw-tile' | 'pass-turn',
    payload: any
): DominoState | { error: string } => {

    if (!state.playerHands[playerId]) return { error: "Mano no encontrada." };

    // Clonamos el estado
    const newState: DominoState = {
        ...state,
        board: [...state.board],
        boneyard: [...state.boneyard],
        playerHands: { ...state.playerHands }
    };
    newState.playerHands[playerId] = [...state.playerHands[playerId]];

    if (action === 'play-tile') {
        const { tileId, direction } = payload; // direction = 'left' | 'right'

        if (!newState.playerHands[playerId]) return { error: "Mano no encontrada." };
        const hand = newState.playerHands[playerId];
        const tileIndex = hand.findIndex(t => t.id === tileId);
        if (tileIndex === -1) return { error: "No tienes esa ficha." };

        const tile = hand[tileIndex] as DominoPiece;
        let playedTile: DominoPiece = { id: tile.id, sideA: tile.sideA, sideB: tile.sideB }; // clon para no mutar

        if (newState.board.length === 0) {
            // Primer movimiento
            newState.board.push(playedTile);
            newState.leftValue = playedTile.sideA;
            newState.rightValue = playedTile.sideB;
            newState.message = "Ficha jugada en el centro.";
        } else {
            if (direction === 'left') {
                if (tile.sideB === newState.leftValue) {
                    playedTile = { id: tile.id, sideA: tile.sideA, sideB: tile.sideB }; // Ya encaja
                } else if (tile.sideA === newState.leftValue) {
                    playedTile = { id: tile.id, sideA: tile.sideB, sideB: tile.sideA }; // Volteada
                } else {
                    return { error: "La ficha no encaja en la izquierda." };
                }
                newState.board.unshift(playedTile);
                newState.leftValue = playedTile.sideA; // Nuevo extremo izquierdo
                newState.message = "Ficha jugada a la izquierda.";
            } else if (direction === 'right') {
                if (tile.sideA === newState.rightValue) {
                    playedTile = { id: tile.id, sideA: tile.sideA, sideB: tile.sideB };
                } else if (tile.sideB === newState.rightValue) {
                    playedTile = { id: tile.id, sideA: tile.sideB, sideB: tile.sideA }; // Volteada
                } else {
                    return { error: "La ficha no encaja en la derecha." };
                }
                newState.board.push(playedTile);
                newState.rightValue = playedTile.sideB; // Nuevo extremo derecho
                newState.message = "Ficha jugada a la derecha.";
            } else {
                return { error: "Dirección inválida." };
            }
        }

        // Remueve la ficha de la mano
        newState.playerHands[playerId].splice(tileIndex, 1);
        return newState;

    } else if (action === 'draw-tile') {
        if (newState.boneyard.length === 0) return { error: "No hay fichas para robar." };
        const drawn = newState.boneyard.pop()!;
        if (!newState.playerHands[playerId]) return { error: "Mano no encontrada." };
        newState.playerHands[playerId].push(drawn);
        newState.message = "Robó una ficha. ¿Puedes jugar ahora?";
        return newState;

    } else if (action === 'pass-turn') {
        // Solo puede pasar si no hay fichas en el pozo
        if (newState.boneyard.length > 0) {
            return { error: "Aún hay fichas para robar." };
        }
        newState.message = "Pasó el turno.";
        return newState;
    }

    return { error: "Acción desconocida." };
};
