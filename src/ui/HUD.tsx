import React from 'react';

export interface HUDProps {
  alphaScore: number;
  omegaScore: number;
  matchTimer: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  weaponKey: string;
  magAmmo: number;
  reserveAmmo: number;
}

export const HUD: React.FC<HUDProps> = ({
  alphaScore,
  omegaScore,
  matchTimer,
  health,
  maxHealth,
  shield,
  maxShield,
  weaponKey,
  magAmmo,
  reserveAmmo
}) => {
  const mins = Math.floor(matchTimer / 60);
  const secs = matchTimer % 60;
  return (
    <div className="hud-container">
      <div className="hud-header">
        <span className="score-alpha">{alphaScore}</span>
        <span>:</span>
        <span className="score-omega">{omegaScore}</span>
        <span className="match-timer">{mins}:{secs < 10 ? '0' : ''}{secs}</span>
      </div>
      <div className="hud-status-bottom-left">
        <div>HP: {health}/{maxHealth}</div>
        <div>ARMOR: {shield}/{maxShield}</div>
      </div>
      <div className="hud-weapon-bottom-right">
        <div>{weaponKey}</div>
        <div>{magAmmo} / {reserveAmmo}</div>
      </div>
    </div>
  );
};
