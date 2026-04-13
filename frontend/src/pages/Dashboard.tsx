import { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { BASE_URL, socket } from '../api/socket';
import { type GameState } from '../types/game.types';
import './Dashboard.css';

const DailyTimer = ({ lastMoveTime, isFinished }: { lastMoveTime?: number, isFinished: boolean }) => {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!lastMoveTime || isFinished) return;
        const update = () => {
            const passed = Date.now() - lastMoveTime;
            setTimeLeft(Math.max(0, 24 * 60 * 60 * 1000 - passed));
        };
        update();
        const interval = setInterval(update, 60000); // 1 minuto
        return () => clearInterval(interval);
    }, [lastMoveTime, isFinished]);

    if (!lastMoveTime || isFinished) return null;

    const hours = Math.floor(timeLeft / 3600000);
    const mins = Math.floor((timeLeft % 3600000) / 60000);
    const isCritical = hours < 2;

    return (
        <span style={{ fontSize: '0.85rem', color: isCritical ? '#ff4a4a' : '#888', display: 'block', marginTop: '5px' }}>
            ⏳ Expiración: {hours}h {mins}m
        </span>
    );
};

export const Dashboard = () => {
  const { isConnected } = useGame();
  const { user, logout, refreshUser } = useAuth();

  // Theme Toggle Logic
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [activeGames, setActiveGames] = useState<GameState[]>([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Cargar partidas diarias
  const fetchActiveGames = () => {
    const token = localStorage.getItem('token');
    if (user && token) {
      axios.get(`${BASE_URL}/api/auth/active-games`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setActiveGames(res.data))
      .catch(console.error);
    }
  };

  useEffect(() => {
    fetchActiveGames();

    // Re-sincronización Live
    if (user) {
        socket.emit("joinLobby", user.id.toString());
        
        const handleUpdate = () => {
          fetchActiveGames();
          refreshUser();
        };

        socket.on("dashboardUpdate", handleUpdate);
        
        return () => {
            socket.off("dashboardUpdate", handleUpdate);
        }
    }
  }, [user]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Mode Selection logic
  const [selectedMode, setSelectedMode] = useState<'blitz' | 'daily'>('blitz');

  const handleSelectGame = (gameType: string) => {
    if (isConnected && user) {
      // Mapeamos 'gato' a 'tic-tac-toe' para que coincida con el Backend
      const internalGameType = gameType === 'gato' ? 'tic-tac-toe' : gameType;

      console.log(`Uniendo a la partida de: ${internalGameType} en modo ${selectedMode}`);

      socket.emit('joinGame', {
        playerId: user.id.toString(), // o el que mantenías en sessionStorage pero lo ideal es unificar
        username: user.username,
        gameType: internalGameType,
        gameMode: selectedMode
      });
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="brand-logo">
          <img src="/logo.png" alt="LabGames Theme" />
          <h1 className="gamer-title">LabGames</h1>
        </div>

        <div className="header-actions">
          <button onClick={toggleTheme} className="theme-toggle" style={{ background: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
          </button>
          
          <button onClick={logout} className="logout-button" style={{ background: '#ff4a4a', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>
            Cerrar Sesión
          </button>

          <div className={`status-badge ${isConnected ? 'online' : 'offline'}`}>
            {isConnected ? '● Online' : '○ Offline'}
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="welcome-section">
          <h2>¡Bienvenido, {user?.username}!</h2>
          <div className="user-stats" style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginTop: '1rem', background: 'var(--panel-bg)', padding: '1rem', borderRadius: '8px' }}>
            <div>
              <strong>Partidas Jugadas:</strong> {(user?.wins || 0) + (user?.losses || 0)}
            </div>
            <div style={{ color: '#4aff4a' }}>
              <strong>Victorias:</strong> {user?.wins || 0}
            </div>
            <div style={{ color: '#ff4a4a' }}>
              <strong>Derrotas:</strong> {user?.losses || 0}
            </div>
          </div>
          <p style={{ marginTop: '1rem' }}>Selecciona un juego para comenzar a competir en tiempo real.</p>
        </section>

        <section className="mode-selection" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h3>Modo de Juego</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
            <button 
              onClick={() => setSelectedMode('blitz')}
              style={{
                padding: '0.8rem 1.5rem',
                borderRadius: '8px',
                border: selectedMode === 'blitz' ? '2px solid #646cff' : '2px solid var(--border-color)',
                background: selectedMode === 'blitz' ? 'rgba(100, 108, 255, 0.2)' : 'var(--panel-bg)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              ⚡ Rápido (5 minutos)
            </button>
            <button 
              onClick={() => setSelectedMode('daily')}
              style={{
                padding: '0.8rem 1.5rem',
                borderRadius: '8px',
                border: selectedMode === 'daily' ? '2px solid #646cff' : '2px solid var(--border-color)',
                background: selectedMode === 'daily' ? 'rgba(100, 108, 255, 0.2)' : 'var(--panel-bg)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              📅 Diario (1 mov/día)
            </button>
          </div>
        </section>

        <div className="games-grid">
          {/* Tarjeta Gato */}
          <div className="game-card gato">
            <div className="game-icon">❌⭕</div>
            <h3>El Gato</h3>
            <p>Clásico juego de 3 en línea. ¡No dejes que te ganen!</p>
            <button
              className="play-button"
              onClick={() => handleSelectGame('gato')}
              disabled={!isConnected}
            >
              Nueva Partida
            </button>
          </div>

          {/* Tarjeta Dominó */}
          <div className="game-card domino">
            <div className="game-icon">🀱</div>
            <h3>Dominó</h3>
            <p>Estrategia pura. Deshazte de tus fichas antes que los demás.</p>
            <button
              className="play-button"
              onClick={() => handleSelectGame('domino')}
              disabled={!isConnected}
            >
              Nueva Partida
            </button>
          </div>
        </div>

        {activeGames.length > 0 && (
          <section className="active-games" style={{ marginTop: '3rem', textAlign: 'center' }}>
            <h3>Tus Partidas Diarias en Curso</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem' }}>
                {activeGames.map(game => (
                    <div key={game.gameId} className="game-card" style={{ padding: '1rem', minWidth: '250px' }}>
                        <h4>{game.gameType === 'tic-tac-toe' ? '🕹️ Gato' : '🎲 Dominó'}</h4>
                        <p style={{ color: game.currentTurn === user?.id.toString() ? '#4aff4a' : 'inherit', margin: '5px 0', fontWeight: 'bold' }}>
                          {game.status === 'waiting' 
                              ? '⏳ Esperando que alguien se una'
                              : (game.currentTurn === user?.id.toString() ? '✨ ¡Es tu turno!' : '⏳ Esperando movimiento del rival')}
                        </p>
                        <DailyTimer lastMoveTime={game.lastMoveTime} isFinished={game.status === 'finished'} />
                        <button 
                            onClick={() => {
                                socket.emit('joinGame', {
                                    playerId: user!.id.toString(),
                                    username: user!.username,
                                    gameType: game.gameType,
                                    gameMode: 'daily',
                                    gameId: game.gameId
                                });
                            }}
                            className="play-button"
                        >
                            Retomar Partida
                        </button>
                    </div>
                ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};