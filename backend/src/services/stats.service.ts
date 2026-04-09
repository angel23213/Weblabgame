import { pool } from '../core/database.js';

export async function updatePlayerStats(winnerId: string | undefined, players: any[]) {
    try {
        console.log(`[Stats] Guardando estadísticas. Ganador: ${winnerId || 'Empate'}`);
        
        for (const player of players) {
            // Saltamos invitados (no tienen ID numérico de BD o id generado por socket no es número)
            if (!player.id || isNaN(Number(player.id))) {
                continue;
            }

            const isWinner = winnerId === player.id;
            const isDraw = !winnerId || winnerId === 'Draw';

            if (isWinner) {
                await pool.query('UPDATE users SET wins = wins + 1 WHERE id = $1', [player.id]);
            } else if (!isDraw) {
                // If it's not a draw and this player is not the winner, they must have lost
                await pool.query('UPDATE users SET losses = losses + 1 WHERE id = $1', [player.id]);
            }
            // En empate, podríamos guardar draws, pero por ahora solo es wins y losses.
        }
    } catch (e) {
        console.error('Error actualizando estadísticas', e);
    }
}
