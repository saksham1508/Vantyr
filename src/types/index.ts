export type WeaponType = 'AR-47' | 'SMG-9' | 'SR-50';
export type Team = 'alpha' | 'omega' | string;
export type GameMode = 'TDM' | 'ARENA' | 'BR';

export interface WeaponDef {
  name: string;
  type: string;
  damage: number;
  headshotMultiplier: number;
  legMultiplier: number;
  fireRate: number;
  fireInterval: number;
  magSize: number;
  reserveAmmo: number;
  reloadTime: number;
  range: number;
  spreadBase: number;
  spreadMax: number;
  spreadADS: number;
  recoilPitch: number;
  recoilYaw: number;
  recoilRecovery: number;
  adsZoom: number;
  adsOffset: { x: number; y: number; z: number };
  hipOffset: { x: number; y: number; z: number };
  modelScale: number;
  primaryColor: number;
  accentColor: number;
  desc: string;
}

export interface PlayerStats {
  kills: number;
  deaths: number;
  assists: number;
  damageDealt: number;
  headshots: number;
}
