import { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import './Dashboard.css';
import { socket, getPlayerId } from '../api/socket';

export const Dashboard = () => {
  const { isConnected } = useGame();

  // Theme Toggle Logic
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleSelectGame = (gameType: string) => {
    if (isConnected) {
      // Mapeamos 'gato' a 'tic-tac-toe' para que coincida con el Backend
      const internalGameType = gameType === 'gato' ? 'tic-tac-toe' : gameType;

      console.log(`Uniendo a la partida de: ${internalGameType}`);

      socket.emit('joinGame', {
        playerId: getPlayerId(),
        username: `Profe-${Math.floor(Math.random() * 100)}`,
        gameType: internalGameType
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

          <div className={`status-badge ${isConnected ? 'online' : 'offline'}`}>
            {isConnected ? '● Online' : '○ Offline'}
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="welcome-section">
          <h2>¡Bienvenido al Lobby!</h2>
          <p>Selecciona un juego para comenzar a competir en tiempo real.</p>
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
              Jugar ahora
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
              Jugar ahora
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};