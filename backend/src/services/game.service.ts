import { pool } from '../core/database.js';
import { type GameState } from '../types/game.types.js';

export const saveNewGame = async (game: GameState) => {
    // Solo persistimos juegos diarios
    if (game.mode !== 'daily') return;

    try {
        await pool.query(
            `INSERT INTO games (id, game_type, mode, status, current_turn, winner_id, data, players, last_move_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
                game.gameId, 
                game.gameType, 
                game.mode, 
                game.status, 
                game.currentTurn, 
                game.winnerId || null, 
                JSON.stringify(game.data), 
                JSON.stringify(game.players)
            ]
        );
    } catch (error) {
        console.error("Error guardando partida inicial en DB:", error);
    }
};

export const updateGameInDB = async (game: GameState) => {
    if (game.mode !== 'daily') return;

    try {
        await pool.query(
            `UPDATE games 
             SET status = $1, current_turn = $2, winner_id = $3, data = $4, players = $5, last_move_time = NOW()
             WHERE id = $6`,
            [
                game.status, 
                game.currentTurn, 
                game.winnerId || null, 
                JSON.stringify(game.data), 
                JSON.stringify(game.players),
                game.gameId
            ]
        );
    } catch (error) {
        console.error("Error actualizando partida en DB:", error);
    }
};

export const loadActiveDailyGames = async (): Promise<GameState[]> => {
    try {
        const result = await pool.query(
            `SELECT 
                id as "gameId", 
                game_type as "gameType", 
                mode, 
                status, 
                current_turn as "currentTurn", 
                winner_id as "winnerId", 
                data, 
                players,
                EXTRACT(EPOCH FROM last_move_time) * 1000 AS "lastMoveTime" 
             FROM games 
             WHERE status != 'finished'`
        );
        return result.rows as GameState[];
    } catch (error) {
        console.error("Error cargando partidas activas desde DB:", error);
        return [];
    }
};
