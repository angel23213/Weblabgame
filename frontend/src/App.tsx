import { useGame } from './contexts/GameContext';
import { Dashboard } from './pages/Dashboard';
import { Gato } from './Components/gato';
import { Domino } from './Components/domino/Domino';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { gameState } = useGame();
  const { user } = useAuth();

  // Función para renderizar el juego según el estado de WebSocket
  const renderGame = () => {
    if (!gameState) return <Navigate to="/dashboard" />;
    
    if (gameState.gameType === 'tic-tac-toe') return <Gato />;
    if (gameState.gameType === 'domino') return <Domino />;
    
    return <div>Juego no soportado</div>;
  };

  return (
    <div className="app-container">
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />

        <Route 
          path="/dashboard" 
          element={user ? (!gameState ? <Dashboard /> : <Navigate to="/game" />) : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/game" 
          element={user ? renderGame() : <Navigate to="/login" />} 
        />
        
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </div>
  );
}

export default App;