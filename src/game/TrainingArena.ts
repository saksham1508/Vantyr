export interface MapCollider {
  type: 'box' | 'cylinder';
  min: [number, number, number];
  max: [number, number, number];
}

export interface MapPickup {
  type: 'health' | 'ammo';
  position: [number, number, number];
  active: boolean;
  respawnTimer: number;
}
