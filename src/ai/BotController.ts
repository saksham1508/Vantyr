import { Team } from '../types';

export type AIState = 'PATROL' | 'SEARCH' | 'ENGAGE' | 'TAKE_COVER' | 'RELOAD' | 'RETREAT';

export interface BotState {
  id: string;
  name: string;
  team: Team;
  weaponKey: string;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  isDead: boolean;
  state: AIState;
}
