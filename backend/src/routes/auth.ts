import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../core/database.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_labgame_key';

router.post('/register', async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            res.status(400).json({ error: 'Todos los campos son obligatorios' });
            return;
        }

        // Check if user exists
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
        if (userExists.rows.length > 0) {
            res.status(400).json({ error: 'El usuario o email ya existe' });
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new user
        const newUser = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, wins, losses',
            [username, email, hashedPassword]
        );

        const user = newUser.rows[0];
        
        // Generate Token
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ token, user });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Todos los campos son obligatorios' });
            return;
        }

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            res.status(400).json({ error: 'Credenciales inválidas' });
            return;
        }

        const user = result.rows[0];
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            res.status(400).json({ error: 'Credenciales inválidas' });
            return;
        }

        // Generate Token
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        // Remove password from response
        delete user.password_hash;
        
        res.json({ token, user });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.get('/me', async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            res.status(401).json({ error: 'No token' });
            return;
        }
        
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
        const result = await pool.query('SELECT id, username, email, wins, losses FROM users WHERE id = $1', [decoded.id]);
        
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
});

import { gameManager } from '../core/gameManager.js';

router.get('/active-games', async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            res.status(401).json({ error: 'No token' });
            return;
        }
        
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
        const activeList = gameManager.getActiveGamesForPlayer(decoded.id.toString());
        
        res.json(activeList);
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
});

export default router;
