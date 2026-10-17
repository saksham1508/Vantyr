import React, { useState } from 'react';
import { GameMode, WeaponType } from '../types';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<'boot' | 'lobby' | 'loadout' | 'game' | 'results'>('lobby');
  const [selectedMode, setSelectedMode] = useState<GameMode>('TDM');
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>('AR-47');

  return (
    <div className="frontline-app">
      <div className="game-wrapper">
        {screen === 'lobby' && (
          <div className="lobby-overlay">
            <h1>VANTYR</h1>
            <button onClick={() => setScreen('game')}>DEPLOY ({selectedMode})</button>
            <button onClick={() => setScreen('loadout')}>LOADOUT ({selectedWeapon})</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
