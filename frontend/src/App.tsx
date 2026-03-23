import { useGame } from './contexts/GameContext';// fronteimport { useGame } from './contexts/GameContext';
import { Dashboard } from './pages/Dashboard';
import { Gato } from './Components/gato';
import { Domino } from './Components/domino/Domino';

function App() {
  const { gameState } = useGame();

  return (
    <div className="app-container">
      {/* Si no hay juego, mostrar Dashboard */}
      {!gameState ? (
        <Dashboard />
      ) : gameState.gameType === 'tic-tac-toe' ? (
        /* Si el servidor nos mandó un juego (sea waiting o playing), mostrar la vista del juego */
        <Gato />
      ) : gameState.gameType === 'domino' ? (
        <Domino />
      ) : (<div>Juego no soportado</div>)}
    </div>
  );
}

export default App;