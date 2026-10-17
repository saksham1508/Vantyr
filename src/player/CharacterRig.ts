import { Team } from '../types';

export interface OperatorConfig {
  team: Team;
  skin?: string;
  isPlayer?: boolean;
}

export interface OperatorUserData {
  team: Team;
  animTime: number;
  walkSpeed: number;
  isCrouching: boolean;
  isADS: boolean;
  isDead: boolean;
  deathProgress: number;
  flinchTime: number;
}
