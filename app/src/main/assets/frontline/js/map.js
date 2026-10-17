/**
 * PROJECT FRONTLINE - Multi-Map Tactical Environment Engine
 * Supports 3 unique combat theaters:
 * 1. Training Arena (Industrial shipping container depot)
 * 2. Desert Outpost (Dusty bunker complex with fuel tanks & sandbag revetments)
 * 3. Cyber Logistics (Futuristic neon cargo hub with elevated catwalks)
 */

class TrainingArena {
  constructor(scene, mapId = 'training') {
    this.scene = scene;
    this.mapId = mapId;
    this.colliders = [];
    this.pickups = [];
    this.environmentMeshes = [];

    this.spawnPoints = { alpha: [], omega: [], ffa: [] };
    this.patrolWaypoints = [];

    this.buildMap(this.mapId);
  }

  clearMap() {
    this.environmentMeshes.forEach(m => {
      this.scene.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
        else m.material.dispose();
      }
    });
    this.environmentMeshes = [];
    this.colliders = [];
    this.pickups = [];
    this.spawnPoints = { alpha: [], omega: [], ffa: [] };
    this.patrolWaypoints = [];
  }

  buildMap(mapId = 'training') {
    this.clearMap();
    this.mapId = mapId;

    if (mapId === 'desert') {
      this.buildDesertOutpost();
    } else if (mapId === 'cyber') {
      this.buildCyberLogistics();
    } else {
      this.buildTrainingGrounds();
    }
  }

  /* ================= MAP 1: TRAINING GROUNDS ================= */
  buildTrainingGrounds() {
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e242d, roughness: 0.85, metalness: 0.15 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.75, metalness: 0.25 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, metalness: 0.1 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.8 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5, emissive: 0x78350f, emissiveIntensity: 0.2 });
    const containerColors = [0x1e3a8a, 0xc2410c, 0x15803d, 0x475569, 0xb45309];

    // Arena Floor (120x120)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.addEnvMesh(ground);

    const grid = new THREE.GridHelper(120, 60, 0x00d2ff, 0x223042);
    grid.position.y = 0.02;
    this.addEnvMesh(grid);

    // Perimeter Enclosing Walls
    this.buildWall(0, 4, -60, 120, 8, 2, wallMat);
    this.buildWall(0, 4, 60, 120, 8, 2, wallMat);
    this.buildWall(-60, 4, 0, 2, 8, 120, wallMat);
    this.buildWall(60, 4, 0, 2, 8, 120, wallMat);

    // Shipping Containers
    const containerLayouts = [
      { x: -28, y: 1.5, z: -28, rot: 0, c: 0 },
      { x: -28, y: 4.5, z: -28, rot: 0, c: 1 },
      { x: -35, y: 1.5, z: -15, rot: Math.PI / 2, c: 2 },
      { x: -18, y: 1.5, z: -35, rot: 0, c: 3 },
      { x: -12, y: 1.5, z: -18, rot: Math.PI / 4, c: 4 },
      { x: 28, y: 1.5, z: 28, rot: 0, c: 1 },
      { x: 28, y: 4.5, z: 28, rot: 0, c: 0 },
      { x: 35, y: 1.5, z: 15, rot: Math.PI / 2, c: 3 },
      { x: 18, y: 1.5, z: 35, rot: 0, c: 2 },
      { x: 12, y: 1.5, z: 18, rot: Math.PI / 4, c: 4 },
      { x: -35, y: 1.5, z: 20, rot: Math.PI / 3, c: 0 },
      { x: 35, y: 1.5, z: -20, rot: Math.PI / 3, c: 2 }
    ];
    containerLayouts.forEach(cfg => this.buildShippingContainer(cfg.x, cfg.y, cfg.z, cfg.rot, containerColors[cfg.c]));

    // Concrete Barriers
    const barriers = [
      { x: -8, z: -8, r: Math.PI / 4 }, { x: 8, z: -8, r: -Math.PI / 4 },
      { x: -8, z: 8, r: -Math.PI / 4 }, { x: 8, z: 8, r: Math.PI / 4 },
      { x: -20, z: 0, r: Math.PI / 2 }, { x: 20, z: 0, r: Math.PI / 2 },
      { x: 0, z: -20, r: 0 }, { x: 0, z: 20, r: 0 }
    ];
    barriers.forEach(b => this.buildJerseyBarrier(b.x, b.z, b.r, concreteMat));

    // Watchtowers & Plaza
    this.buildCentralPlaza(concreteMat, steelMat, stripeMat);
    this.buildWatchtower(-38, 0, 32, steelMat, concreteMat, Math.PI / 4);
    this.buildWatchtower(38, 0, -32, steelMat, concreteMat, -3 * Math.PI / 4);

    this.spawnPoints.alpha = [new THREE.Vector3(-42, 0, -42), new THREE.Vector3(-46, 0, -36), new THREE.Vector3(-36, 0, -46)];
    this.spawnPoints.omega = [new THREE.Vector3(42, 0, 42), new THREE.Vector3(46, 0, 36), new THREE.Vector3(36, 0, 46)];
    this.spawnPoints.ffa = [
      new THREE.Vector3(-40, 0, -40), new THREE.Vector3(40, 0, 40),
      new THREE.Vector3(-40, 0, 40), new THREE.Vector3(40, 0, -40),
      new THREE.Vector3(0, 0, -40), new THREE.Vector3(0, 0, 40)
    ];

    this.patrolWaypoints = [
      new THREE.Vector3(-25, 0, -25), new THREE.Vector3(0, 0, -25),
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(25, 0, 25),
      new THREE.Vector3(-25, 0, 25), new THREE.Vector3(25, 0, -25)
    ];

    this.spawnPickup(-15, 0.5, 0, 'health');
    this.spawnPickup(15, 0.5, 0, 'health');
    this.spawnPickup(0, 0.5, -15, 'ammo');
    this.spawnPickup(0, 0.5, 15, 'ammo');
  }

  /* ================= MAP 2: DESERT OUTPOST ================= */
  buildDesertOutpost() {
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.95 });
    const rockWallMat = new THREE.MeshStandardMaterial({ color: 0x8c6d48, roughness: 0.9 });
    const fuelMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, metalness: 0.6, roughness: 0.3 });
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0xa88350, roughness: 0.9 });

    // Sand Floor
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), sandMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.addEnvMesh(ground);

    // Perimeter Canyon Walls
    this.buildWall(0, 5, -60, 120, 10, 3, rockWallMat);
    this.buildWall(0, 5, 60, 120, 10, 3, rockWallMat);
    this.buildWall(-60, 5, 0, 3, 10, 120, rockWallMat);
    this.buildWall(60, 5, 0, 3, 10, 120, rockWallMat);

    // Fuel Storage Silos (Large Cylinders)
    const siloPositions = [
      { x: -24, z: -20 }, { x: -24, z: -32 },
      { x: 24, z: 20 }, { x: 24, z: 32 },
      { x: 0, z: 30 }, { x: 0, z: -30 }
    ];
    siloPositions.forEach(p => {
      const silo = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 7, 16), fuelMat);
      silo.position.set(p.x, 3.5, p.z);
      silo.castShadow = true;
      this.addEnvMesh(silo);
      this.colliders.push({ box: new THREE.Box3().setFromObject(silo), type: 'box', mesh: silo });
    });

    // Sandbag Fortifications (Curved half-walls)
    const sandbags = [
      { x: -10, z: 0, r: 0 }, { x: 10, z: 0, r: 0 },
      { x: 0, z: 10, r: Math.PI / 2 }, { x: 0, z: -10, r: Math.PI / 2 },
      { x: -30, z: 15, r: Math.PI / 4 }, { x: 30, z: -15, r: Math.PI / 4 }
    ];
    sandbags.forEach(sb => {
      const bagMesh = new THREE.Mesh(new THREE.BoxGeometry(6, 1.4, 1.2), sandbagMat);
      bagMesh.position.set(sb.x, 0.7, sb.z);
      bagMesh.rotation.y = sb.r;
      bagMesh.castShadow = true;
      this.addEnvMesh(bagMesh);
      this.colliders.push({ box: new THREE.Box3().setFromObject(bagMesh), type: 'box', mesh: bagMesh });
    });

    // Central Bunker Complex
    const bunker = new THREE.Mesh(new THREE.BoxGeometry(14, 4.5, 14), rockWallMat);
    bunker.position.set(0, 2.25, 0);
    bunker.castShadow = true;
    this.addEnvMesh(bunker);
    this.colliders.push({ box: new THREE.Box3().setFromObject(bunker), type: 'box', mesh: bunker });

    this.spawnPoints.alpha = [new THREE.Vector3(-45, 0, -40), new THREE.Vector3(-40, 0, -45)];
    this.spawnPoints.omega = [new THREE.Vector3(45, 0, 40), new THREE.Vector3(40, 0, 45)];
    this.spawnPoints.ffa = [
      new THREE.Vector3(-35, 0, -35), new THREE.Vector3(35, 0, 35),
      new THREE.Vector3(-35, 0, 35), new THREE.Vector3(35, 0, -35)
    ];

    this.patrolWaypoints = [
      new THREE.Vector3(-20, 0, 0), new THREE.Vector3(20, 0, 0),
      new THREE.Vector3(0, 0, -20), new THREE.Vector3(0, 0, 20)
    ];

    this.spawnPickup(-12, 0.5, -12, 'health');
    this.spawnPickup(12, 0.5, 12, 'health');
    this.spawnPickup(12, 0.5, -12, 'ammo');
    this.spawnPickup(-12, 0.5, 12, 'ammo');
  }

  /* ================= MAP 3: CYBER LOGISTICS ================= */
  buildCyberLogistics() {
    const cyberFloorMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.3, metalness: 0.9 });
    const neonWallMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.7 });
    const neonGlowBlue = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.7 });
    const neonGlowPurple = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xa855f7, emissiveIntensity: 0.7 });

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), cyberFloorMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.addEnvMesh(ground);

    const grid = new THREE.GridHelper(120, 40, 0x00f0ff, 0x4f46e5);
    grid.position.y = 0.02;
    this.addEnvMesh(grid);

    this.buildWall(0, 5, -60, 120, 10, 2, neonWallMat);
    this.buildWall(0, 5, 60, 120, 10, 2, neonWallMat);
    this.buildWall(-60, 5, 0, 2, 10, 120, neonWallMat);
    this.buildWall(60, 5, 0, 2, 10, 120, neonWallMat);

    // Glowing Neon Hologram Columns
    for (let x = -30; x <= 30; x += 30) {
      for (let z = -30; z <= 30; z += 30) {
        if (x === 0 && z === 0) continue;
        const col = new THREE.Mesh(new THREE.BoxGeometry(3, 8, 3), neonWallMat);
        col.position.set(x, 4, z);
        col.castShadow = true;
        this.addEnvMesh(col);
        this.colliders.push({ box: new THREE.Box3().setFromObject(col), type: 'box', mesh: col });

        // Accent ring
        const ring = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.4, 3.2), (x + z) % 2 === 0 ? neonGlowBlue : neonGlowPurple);
        ring.position.set(x, 4, z);
        this.addEnvMesh(ring);
      }
    }

    // High ground monorail bridge (center)
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 40), neonWallMat);
    bridge.position.set(0, 4.5, 0);
    this.addEnvMesh(bridge);
    this.colliders.push({ box: new THREE.Box3().setFromObject(bridge), type: 'box', mesh: bridge });

    this.spawnPoints.alpha = [new THREE.Vector3(-45, 0, 0), new THREE.Vector3(-40, 0, -10)];
    this.spawnPoints.omega = [new THREE.Vector3(45, 0, 0), new THREE.Vector3(40, 0, 10)];
    this.spawnPoints.ffa = [
      new THREE.Vector3(-35, 0, 0), new THREE.Vector3(35, 0, 0),
      new THREE.Vector3(0, 0, -35), new THREE.Vector3(0, 0, 35)
    ];

    this.patrolWaypoints = [
      new THREE.Vector3(-20, 0, -20), new THREE.Vector3(20, 0, -20),
      new THREE.Vector3(20, 0, 20), new THREE.Vector3(-20, 0, 20)
    ];

    this.spawnPickup(-10, 0.5, 0, 'health');
    this.spawnPickup(10, 0.5, 0, 'health');
    this.spawnPickup(0, 5.0, 0, 'ammo'); // On high monorail
  }

  addEnvMesh(mesh) {
    this.scene.add(mesh);
    this.environmentMeshes.push(mesh);
  }

  buildWall(x, y, z, w, h, d, mat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.addEnvMesh(mesh);

    this.colliders.push({
      box: new THREE.Box3().setFromObject(mesh),
      type: 'box',
      mesh
    });
    return mesh;
  }

  buildShippingContainer(x, y, z, rotY, color) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const w = 3.2, h = 3.0, d = 7.5;
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.5 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.4, metalness: 0.7 });

    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
    box.castShadow = true;
    box.receiveShadow = true;
    group.add(box);

    const postGeo = new THREE.BoxGeometry(0.15, h + 0.05, 0.15);
    const p1 = new THREE.Mesh(postGeo, trimMat); p1.position.set(-w/2, 0, -d/2); group.add(p1);
    const p2 = new THREE.Mesh(postGeo, trimMat); p2.position.set(w/2, 0, -d/2); group.add(p2);
    const p3 = new THREE.Mesh(postGeo, trimMat); p3.position.set(-w/2, 0, d/2); group.add(p3);
    const p4 = new THREE.Mesh(postGeo, trimMat); p4.position.set(w/2, 0, d/2); group.add(p4);

    this.addEnvMesh(group);
    this.colliders.push({ box: new THREE.Box3().setFromObject(box), type: 'box', mesh: box });
  }

  buildJerseyBarrier(x, z, rotY, mat) {
    const group = new THREE.Group();
    group.position.set(x, 0.6, z);
    group.rotation.y = rotY;

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 3.2), mat);
    base.position.y = -0.3;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const top = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 3.2), mat);
    top.position.y = 0.3;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    this.addEnvMesh(group);
    this.colliders.push({ box: new THREE.Box3().setFromObject(group), type: 'box', mesh: group });
  }

  buildCentralPlaza(concreteMat, steelMat, stripeMat) {
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(10, 10.5, 0.5, 24), concreteMat);
    platform.position.set(0, 0.25, 0);
    this.addEnvMesh(platform);

    const pillar = new THREE.Mesh(new THREE.BoxGeometry(3.0, 5.0, 3.0), steelMat);
    pillar.position.set(0, 2.5, 0);
    pillar.castShadow = true;
    this.addEnvMesh(pillar);

    const coreGlow = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.4, 3.1), stripeMat);
    coreGlow.position.set(0, 2.5, 0);
    this.addEnvMesh(coreGlow);

    this.colliders.push({ box: new THREE.Box3().setFromObject(pillar), type: 'box', mesh: pillar });
  }

  buildWatchtower(x, y, z, steelMat, concreteMat, rotY) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const legGeo = new THREE.CylinderGeometry(0.18, 0.18, 5.0, 8);
    const l1 = new THREE.Mesh(legGeo, steelMat); l1.position.set(-2.5, 2.5, -2.5); group.add(l1);
    const l2 = new THREE.Mesh(legGeo, steelMat); l2.position.set(2.5, 2.5, -2.5); group.add(l2);
    const l3 = new THREE.Mesh(legGeo, steelMat); l3.position.set(-2.5, 2.5, 2.5); group.add(l3);
    const l4 = new THREE.Mesh(legGeo, steelMat); l4.position.set(2.5, 2.5, 2.5); group.add(l4);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.3, 6.0), concreteMat);
    deck.position.set(0, 5.0, 0);
    group.add(deck);

    const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 7.5), steelMat);
    ramp.position.set(-2.5, 2.5, -5.5);
    ramp.rotation.x = -Math.atan2(5.0, 5.5);
    group.add(ramp);

    this.addEnvMesh(group);
    this.colliders.push({ box: new THREE.Box3().setFromObject(deck), type: 'box', mesh: deck });
  }

  spawnPickup(x, y, z, type = 'health') {
    const isHealth = type === 'health';
    const mat = new THREE.MeshStandardMaterial({
      color: isHealth ? 0x10b981 : 0x00d2ff,
      emissive: isHealth ? 0x059669 : 0x0284c7,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.3
    });

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    this.addEnvMesh(mesh);

    const pickup = {
      mesh,
      type,
      active: true,
      respawnTimer: 0,
      initialPos: new THREE.Vector3(x, y, z)
    };
    this.pickups.push(pickup);
    return pickup;
  }

  updatePickups(dt) {
    const time = Date.now() * 0.003;
    this.pickups.forEach(p => {
      if (p.active) {
        p.mesh.rotation.y += dt * 1.8;
        p.mesh.position.y = p.initialPos.y + Math.sin(time) * 0.12;
      } else {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.active = true;
          p.mesh.visible = true;
        }
      }
    });
  }

  collectPickup(pickup) {
    pickup.active = false;
    pickup.mesh.visible = false;
    pickup.respawnTimer = 18.0;
  }

  checkCollision(position, radius = 0.4) {
    const playerSphere = new THREE.Sphere(position, radius);
    for (let i = 0; i < this.colliders.length; i++) {
      if (this.colliders[i].box.intersectsSphere(playerSphere)) {
        return true;
      }
    }
    if (Math.abs(position.x) > 57 || Math.abs(position.z) > 57) {
      return true;
    }
    return false;
  }

  getRandomSpawn(team = 'alpha') {
    const list = this.spawnPoints[team] || this.spawnPoints['alpha'];
    if (!list || list.length === 0) return new THREE.Vector3(0, 0, 0);
    const idx = Math.floor(Math.random() * list.length);
    const pt = list[idx].clone();
    pt.x += (Math.random() - 0.5) * 3;
    pt.z += (Math.random() - 0.5) * 3;
    return pt;
  }
}

window.TrainingArena = TrainingArena;
