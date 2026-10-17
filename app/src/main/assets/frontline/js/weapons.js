/**
 * PROJECT FRONTLINE - Expanded Weapons, Ballistics & Modular Attachments
 * 5 distinct weapon classes (AR, SMG, Sniper, Shotgun, Pistol) with modular optics, muzzles, and magazines.
 */

const WEAPON_DEFINITIONS = {
  'AR-47': {
    name: 'AR-47 Vanguard',
    type: 'Assault Rifle',
    damage: 26,
    pellets: 1,
    headshotMultiplier: 2.0,
    legMultiplier: 0.75,
    fireRate: 600,
    fireInterval: 100,
    magSize: 30,
    reserveAmmo: 120,
    reloadTime: 2200,
    range: 120,
    spreadBase: 0.015,
    spreadMax: 0.045,
    spreadADS: 0.005,
    recoilPitch: 0.024,
    recoilYaw: 0.012,
    recoilRecovery: 5.0,
    adsZoom: 1.35,
    modelScale: 1.0,
    primaryColor: 0x242b35,
    accentColor: 0x00d2ff,
    desc: 'Versatile frontline rifle with high mid-range lethality and steady burst control.'
  },
  'SMG-9': {
    name: 'SMG-9 Specter',
    type: 'Submachine Gun',
    damage: 16,
    pellets: 1,
    headshotMultiplier: 1.8,
    legMultiplier: 0.8,
    fireRate: 900,
    fireInterval: 67,
    magSize: 35,
    reserveAmmo: 140,
    reloadTime: 1500,
    range: 65,
    spreadBase: 0.025,
    spreadMax: 0.065,
    spreadADS: 0.012,
    recoilPitch: 0.016,
    recoilYaw: 0.020,
    recoilRecovery: 7.0,
    adsZoom: 1.25,
    modelScale: 0.85,
    primaryColor: 0x1a202c,
    accentColor: 0xff3b30,
    desc: 'High-cadence rapid close-quarters submachine gun with swift tactical reload.'
  },
  'SR-50': {
    name: 'SR-50 Apex',
    type: 'Sniper Rifle',
    damage: 90,
    pellets: 1,
    headshotMultiplier: 2.4,
    legMultiplier: 0.7,
    fireRate: 50,
    fireInterval: 1200,
    magSize: 5,
    reserveAmmo: 25,
    reloadTime: 3400,
    range: 220,
    spreadBase: 0.04,
    spreadMax: 0.12,
    spreadADS: 0.0008,
    recoilPitch: 0.09,
    recoilYaw: 0.015,
    recoilRecovery: 3.0,
    adsZoom: 3.2, // Heavy sniper zoom
    hasScopeOverlay: true,
    modelScale: 1.15,
    primaryColor: 0x1f2937,
    accentColor: 0x10b981,
    desc: 'Anti-materiel bolt-action sniper rifle with high magnification MIL-DOT optical reticle.'
  },
  'SG-12': {
    name: 'SG-12 Breaker',
    type: 'Tactical Shotgun',
    damage: 12, // 8 pellets * 12 = 96 dmg
    pellets: 8,
    headshotMultiplier: 1.5,
    legMultiplier: 0.8,
    fireRate: 110,
    fireInterval: 545,
    magSize: 8,
    reserveAmmo: 40,
    reloadTime: 2600,
    range: 35,
    spreadBase: 0.065,
    spreadMax: 0.11,
    spreadADS: 0.04,
    recoilPitch: 0.065,
    recoilYaw: 0.025,
    recoilRecovery: 4.5,
    adsZoom: 1.2,
    modelScale: 1.05,
    primaryColor: 0x27272a,
    accentColor: 0xf59e0b,
    desc: 'Devastating close-range combat shotgun firing an 8-pellet buckshot spread.'
  },
  'PL-9': {
    name: 'PL-9 Ghost',
    type: 'Sidearm',
    damage: 24,
    pellets: 1,
    headshotMultiplier: 2.0,
    legMultiplier: 0.8,
    fireRate: 450,
    fireInterval: 133,
    magSize: 15,
    reserveAmmo: 60,
    reloadTime: 1200,
    range: 50,
    spreadBase: 0.018,
    spreadMax: 0.04,
    spreadADS: 0.007,
    recoilPitch: 0.018,
    recoilYaw: 0.008,
    recoilRecovery: 8.0,
    adsZoom: 1.2,
    modelScale: 0.7,
    primaryColor: 0x18181b,
    accentColor: 0x38bdf8,
    desc: 'Swift tactical semi-automatic sidearm offering near-instant draw and reload.'
  }
};

const WEAPON_SKINS = {
  'standard': { id: 'standard', name: 'Standard Issue', primary: null, accent: null, levelReq: 1 },
  'desert': { id: 'desert', name: 'Desert Camo', primary: 0xc2a679, accent: 0x4a3c28, levelReq: 2 },
  'cyber': { id: 'cyber', name: 'Cyber Neon', primary: 0x0f172a, accent: 0x00f0ff, levelReq: 3 },
  'urban': { id: 'urban', name: 'Urban Digital', primary: 0x475569, accent: 0x94a3b8, levelReq: 5 },
  'carbon': { id: 'carbon', name: 'Carbon Fiber', primary: 0x111827, accent: 0xf59e0b, levelReq: 7 },
  'crimson': { id: 'crimson', name: 'Crimson Fury', primary: 0x1e1b18, accent: 0xef4444, levelReq: 10 },
  'gold': { id: 'gold', name: 'Frontline Gold', primary: 0xd4af37, accent: 0xffffff, levelReq: 15 }
};

const ATTACHMENT_OPTIONS = {
  optics: [
    { id: 'iron', name: 'Iron Sights', zoomBonus: 1.0, adsSpeed: 1.0 },
    { id: 'red_dot', name: 'Red Dot Reflex', zoomBonus: 1.15, adsSpeed: 1.05 },
    { id: 'holo', name: 'Holo Sight', zoomBonus: 1.25, adsSpeed: 1.0 },
    { id: 'acog', name: 'ACOG 4X', zoomBonus: 1.8, adsSpeed: 0.9 }
  ],
  muzzles: [
    { id: 'standard', name: 'Standard Muzzle', silenced: false, recoilReduction: 1.0 },
    { id: 'suppressor', name: 'Tactical Suppressor', silenced: true, recoilReduction: 0.95 },
    { id: 'compensator', name: 'Heavy Compensator', silenced: false, recoilReduction: 0.8 }
  ],
  magazines: [
    { id: 'standard', name: 'Standard Mag', capacityMult: 1.0, reloadMult: 1.0 },
    { id: 'extended', name: 'Extended Mag', capacityMult: 1.45, reloadMult: 1.15 },
    { id: 'fast', name: 'Fast Mag', capacityMult: 1.0, reloadMult: 0.7 }
  ]
};

class WeaponModelBuilder {
  static createWeaponModel(weaponKey, skinKey = 'standard', attachments = {}) {
    const def = WEAPON_DEFINITIONS[weaponKey] || WEAPON_DEFINITIONS['AR-47'];
    const skin = WEAPON_SKINS[skinKey] || WEAPON_SKINS['standard'];

    const group = new THREE.Group();
    group.name = `weapon_${weaponKey}`;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: skin.primary || def.primaryColor,
      roughness: 0.45,
      metalness: 0.7
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: skin.accent || def.accentColor,
      roughness: 0.3,
      metalness: 0.5,
      emissive: skin.accent || def.accentColor,
      emissiveIntensity: 0.25
    });

    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7, metalness: 0.3 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.3, metalness: 0.85 });

    if (weaponKey === 'AR-47') {
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.42), bodyMat);
      receiver.castShadow = true;
      group.add(receiver);

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), metalMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.02, -0.38);
      group.add(barrel);

      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.024, 0.07, 8), darkMat);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.position.set(0, 0.02, -0.6);
      group.add(muzzle);

      const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.09, 0.26), accentMat);
      handguard.position.set(0, 0.015, -0.24);
      group.add(handguard);

      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.09), darkMat);
      mag.position.set(0, -0.15, -0.06);
      mag.rotation.x = 0.2;
      group.add(mag);

      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.06), darkMat);
      grip.position.set(0, -0.11, 0.12);
      grip.rotation.x = -0.35;
      group.add(grip);

      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.24), bodyMat);
      stock.position.set(0, 0.01, 0.32);
      group.add(stock);

      const sightRing = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.03, 12), accentMat);
      sightRing.position.set(0, 0.11, 0.06);
      group.add(sightRing);

      const muzzlePoint = new THREE.Object3D();
      muzzlePoint.position.set(0, 0.02, -0.65);
      muzzlePoint.name = 'muzzle_point';
      group.add(muzzlePoint);

    } else if (weaponKey === 'SMG-9') {
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.3), bodyMat);
      group.add(receiver);

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.22, 8), metalMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.015, -0.22);
      group.add(barrel);

      const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.18, 8), darkMat);
      shroud.rotation.x = Math.PI / 2;
      shroud.position.set(0, 0.015, -0.26);
      group.add(shroud);

      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.05), accentMat);
      mag.position.set(0, -0.14, 0.02);
      group.add(mag);

      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.05), darkMat);
      grip.position.set(0, -0.09, 0.09);
      grip.rotation.x = -0.25;
      group.add(grip);

      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.18), darkMat);
      stock.position.set(0, 0.01, 0.22);
      group.add(stock);

      const muzzlePoint = new THREE.Object3D();
      muzzlePoint.position.set(0, 0.015, -0.38);
      muzzlePoint.name = 'muzzle_point';
      group.add(muzzlePoint);

    } else if (weaponKey === 'SR-50') {
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.5), bodyMat);
      group.add(receiver);

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.7, 8), metalMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.025, -0.58);
      group.add(barrel);

      const muzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.1), darkMat);
      muzzleBrake.position.set(0, 0.025, -0.96);
      group.add(muzzleBrake);

      const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.32, 10), darkMat);
      scopeBody.rotation.x = Math.PI / 2;
      scopeBody.position.set(0, 0.13, -0.05);
      group.add(scopeBody);

      const scopeLensFront = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.028, 0.08, 10), accentMat);
      scopeLensFront.rotation.x = Math.PI / 2;
      scopeLensFront.position.set(0, 0.13, -0.22);
      group.add(scopeLensFront);

      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.1), darkMat);
      mag.position.set(0, -0.14, -0.05);
      group.add(mag);

      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.35), bodyMat);
      stock.position.set(0, -0.02, 0.4);
      group.add(stock);

      const muzzlePoint = new THREE.Object3D();
      muzzlePoint.position.set(0, 0.025, -1.02);
      muzzlePoint.name = 'muzzle_point';
      group.add(muzzlePoint);

    } else if (weaponKey === 'SG-12') {
      // Tactical Shotgun
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.13, 0.44), bodyMat);
      group.add(receiver);

      // Wide shotgun barrel
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.48, 8), metalMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.03, -0.42);
      group.add(barrel);

      // Pump slide
      const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.22, 8), darkMat);
      pump.rotation.x = Math.PI / 2;
      pump.position.set(0, -0.02, -0.32);
      group.add(pump);

      // Magazine tube under barrel
      const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.44, 8), metalMat);
      magTube.rotation.x = Math.PI / 2;
      magTube.position.set(0, -0.02, -0.42);
      group.add(magTube);

      // Solid tactical stock
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.3), bodyMat);
      stock.position.set(0, -0.02, 0.34);
      group.add(stock);

      const muzzlePoint = new THREE.Object3D();
      muzzlePoint.position.set(0, 0.03, -0.68);
      muzzlePoint.name = 'muzzle_point';
      group.add(muzzlePoint);

    } else {
      // PL-9 Sidearm
      const slide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.26), bodyMat);
      slide.position.set(0, 0.04, -0.04);
      group.add(slide);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.24), darkMat);
      frame.position.set(0, -0.01, -0.04);
      group.add(frame);

      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.07), accentMat);
      grip.position.set(0, -0.09, 0.05);
      grip.rotation.x = -0.3;
      group.add(grip);

      const muzzlePoint = new THREE.Object3D();
      muzzlePoint.position.set(0, 0.04, -0.2);
      muzzlePoint.name = 'muzzle_point';
      group.add(muzzlePoint);
    }

    group.scale.setScalar(def.modelScale || 1.0);
    return group;
  }
}

window.WEAPON_DEFINITIONS = WEAPON_DEFINITIONS;
window.WEAPON_SKINS = WEAPON_SKINS;
window.ATTACHMENT_OPTIONS = ATTACHMENT_OPTIONS;
window.WeaponModelBuilder = WeaponModelBuilder;
