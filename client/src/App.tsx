import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { LangProvider, useLang } from './contexts/LangContext';
import { usePlayerProfile } from './hooks/usePlayerProfile';
import { useGame } from './hooks/useGame';
import Lobby from './components/Lobby';
import Dashboard from './components/Dashboard';
import Game from './components/Game';

type Screen = 'dashboard' | 'create' | 'join';

function AppContent() {
  const g = useGame();
  const { lang } = useLang();
  const { profile, setName } = usePlayerProfile();
  const [screen, setScreen] = useState<Screen>('dashboard');

  // Active game → show game
  if (g.gameCode && g.gameState) {
    return (
      <Game
        gameState={g.gameState} gameCode={g.gameCode} playerId={g.playerId!}
        rackTiles={g.rackTiles} selectedTile={g.selectedTile} placedTiles={g.placedTiles}
        exchangeMode={g.exchangeMode} exchangeSelection={g.exchangeSelection}
        blankTarget={g.blankTarget} isMyTurn={g.isMyTurn ?? false} error={g.error}
        onSetSelectedTile={g.setSelectedTile} onPlaceTile={g.placeTile}
        onPlaceTileDirect={g.placeTileDirect} onRemovePlacedTile={g.removePlacedTile}
        onSelectBlankLetter={g.selectBlankLetter} onCancelBlank={g.cancelBlank} onRecall={g.recallTiles}
        onSubmitMove={g.submitMove} onPass={g.passTurn}
        onToggleExchange={g.toggleExchangeMode} onToggleExchangeSelection={g.toggleExchangeSelection}
        onSubmitExchange={g.submitExchange}
        onLeave={() => { g.leaveGame(); setScreen('dashboard'); }}
        onClearError={g.clearError} onReorderRack={g.reorderRack} onShuffle={g.shuffleRack}
        lastMoveResult={g.lastMoveResult} onClearLastMove={g.clearLastMove}
        rematchState={g.rematchState} onRematch={g.requestRematch}
        onSendReaction={g.sendReaction} incomingReaction={g.incomingReaction} onClearReaction={g.clearReaction}
      />
    );
  }

  // Has name → Dashboard or create/join flow
  if (profile.name) {
    if (screen === 'dashboard') {
      return (
        <Dashboard
          profile={profile}
          onCreateGame={() => setScreen('create')}
          onJoinGame={() => setScreen('join')}
          onCreateAIGame={(diff) => { g.createAIGame(profile.name, lang, diff); }}
          onFindMatch={() => { g.findMatch(profile.name, lang); }}
          searching={g.searching}
          onCancelMatch={() => { g.cancelMatch(); }}
        />
      );
    }

    return (
      <Lobby
        initialMode={screen === 'create' ? 'create' : 'join'}
        playerName={profile.name}
        onCreateGame={(name, gameLang) => { setName(name); g.createGame(name, gameLang ?? lang); }}
        onJoinGame={(code, name) => { setName(name); g.joinGame(code, name); }}
        onSetName={setName}
        onLoginWithToken={(name, token) => { setName(name); localStorage.setItem('lettrix-token', token); }}
        onBack={() => setScreen('dashboard')}
        onFindMatch={(name, gameLang) => { setName(name); g.findMatch(name, gameLang); }}
        searching={g.searching}
        onCancelMatch={() => { g.cancelMatch(); }}
        error={g.error}
      />
    );
  }

  // No name → Welcome screen with leaderboard visible
  return (
    <Lobby
      initialMode="menu"
      playerName=""
      onCreateGame={(name) => { setName(name); g.createGame(name, lang); }}
      onJoinGame={(code, name) => { setName(name); g.joinGame(code, name); }}
      onSetName={(name) => { setName(name); setScreen('dashboard'); }}
      onLoginWithToken={(name, token) => { setName(name); localStorage.setItem('lettrix-token', token); setScreen('dashboard'); }}
      onBack={() => {}}
      error={g.error}
    />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AppContent />
      </LangProvider>
    </ThemeProvider>
  );
}
