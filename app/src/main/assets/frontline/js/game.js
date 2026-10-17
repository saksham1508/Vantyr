/**
 * PROJECT FRONTLINE - Core 3D Game Engine & Match Loop
 * Full-blown tactical shooter engine:
 * - Multi-map loading (Training, Desert, Cyber)
 * - Frag Grenades with projectile physics, bouncing, and radial blast
 * - Killstreak Abilities (UAV Recon, Care Package, Mortar Strike)
 * - Shotgun multi-pellet ballistics & Sniper Scope overlays
 * - Floating 3D combat damage text
 * - Dynamic camera screen shake
 */

class GameEngine {
  constructor(canvas, input) {
    this.canvas = canvas;
    this.input = input;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.running = false;

    // Game Mode & Settings
    this.gameMode = 'TDM';
    this.currentMapId = 'training';
    this.targetScore = 25;
    this.matchDuration = 300;
    this.matchTimer = 300;
    this.alphaScore = 0;
    this.omegaScore = 0;
    this.arenaRound = 1;
    this.alphaRoundsWon = 0;
    this.omegaRoundsWon = 0;

    // BR Mode Zone
    this.brZoneRadius = 70;
    this.brZoneCenter = new THREE.Vector3(0, 0, 0);
    this.brZoneMesh = null;

    // Player State
    this.player = {
      team: 'alpha',
      name: 'Player',
      health: 100,
      maxHealth: 100,
      shield: 50,
      maxShield: 50,
      grenades: 2,
      maxGrenades: 2,
      isDead: false,
      kills: 0,
      killstreak: 0,
      deaths: 0,
      assists: 0,
      damageDealt: 0,
      headshots: 0,
      pos: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      isGrounded: true,
      lastDamageTime: 0,
      respawnTimer: 0
    };

    // Killstreak Status
    this.uavActiveTimer = 0; // When > 0, UAV reveals enemies

    // Camera Rig & Angles
    this.yaw = 0;
    this.pitch = 0;
    this.cameraDistance = 2.8;
    this.cameraHeight = 1.6;
    this.cameraShoulderOffset = 0.55;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.screenShake = 0;

    // Weapon Inventory (All 5 classes)
    this.availableWeapons = ['AR-47', 'SMG-9', 'SR-50', 'SG-12', 'PL-9'];
    this.currentWeaponIndex = 0;
    this.currentWeaponKey = 'AR-47';
    this.currentSkin = 'standard';
    this.weaponState = {};

    // Entities & Projectiles
    this.arena = null;
    this.playerMesh = null;
    this.playerWeaponMesh = null;
    this.bots = [];
    this.tracers = [];
    this.particles = [];
    this.grenades = [];
    this.floatingTexts = [];

    this.stats = { shotsFired: 0, shotsHit: 0 };

    this.initRenderer();
    this.initScene();
    this.initWeaponStates();
    this.initPlayer();
  }

  initRenderer() {
    const w = (window.innerWidth && window.innerWidth > 0) ? window.innerWidth : 800;
    const h = (window.innerHeight && window.innerHeight > 0) ? window.innerHeight : 480;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    const onResize = () => {
      if (this.camera && this.renderer && window.innerWidth > 0 && window.innerHeight > 0) {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', onResize);
    setTimeout(onResize, 100);
    setTimeout(onResize, 400);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d);
    this.scene.fog = new THREE.FogExp2(0x0a0f1d, 0.012);

    const w = (window.innerWidth && window.innerWidth > 0) ? window.innerWidth : 800;
    const h = (window.innerHeight && window.innerHeight > 0) ? window.innerHeight : 480;
    this.camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 300);
    this.scene.add(this.camera);

    const ambientLight = new THREE.AmbientLight(0x273549, 1.2);
    this.scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xfff7ed, 1.6);
    sun.position.set(45, 60, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    const shadowD = 65;
    sun.shadow.camera.left = -shadowD;
    sun.shadow.camera.right = shadowD;
    sun.shadow.camera.top = shadowD;
    sun.shadow.camera.bottom = -shadowD;
    this.scene.add(sun);

    this.arena = new TrainingArena(this.scene, this.currentMapId);

    const brGeo = new THREE.CylinderGeometry(70, 70, 20, 32, 1, true);
    const brMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    this.brZoneMesh = new THREE.Mesh(brGeo, brMat);
    this.brZoneMesh.position.set(0, 10, 0);
    this.brZoneMesh.visible = false;
    this.scene.add(this.brZoneMesh);
  }

  setMap(mapId) {
    this.currentMapId = mapId;
    if (this.arena) {
      this.arena.buildMap(mapId);
    }
  }

  initWeaponStates() {
    this.availableWeapons.forEach(k => {
      const def = WEAPON_DEFINITIONS[k];
      this.weaponState[k] = {
        magAmmo: def.magSize,
        reserveAmmo: def.reserveAmmo,
        isReloading: false,
        reloadTimer: 0,
        fireTimer: 0
      };
    });
  }

  initPlayer() {
    this.playerMesh = CharacterBuilder.createOperator({
      team: this.player.team,
      skin: this.currentSkin,
      isPlayer: true
    });
    this.scene.add(this.playerMesh);

    this.equipWeapon(this.currentWeaponKey);
    this.respawnPlayer();
  }

  equipWeapon(weaponKey) {
    this.currentWeaponKey = weaponKey;
    const socket = this.playerMesh.userData.weaponSocket;
    if (socket) {
      while (socket.children.length > 0) socket.remove(socket.children[0]);
      this.playerWeaponMesh = WeaponModelBuilder.createWeaponModel(weaponKey, this.currentSkin);
      socket.add(this.playerWeaponMesh);
    }
    this.updateHUDAmmo();
  }

  cycleNextWeapon() {
    this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.availableWeapons.length;
    this.equipWeapon(this.availableWeapons[this.currentWeaponIndex]);
    if (window.soundSystem) window.soundSystem.playReloadStage(2);
  }

  respawnPlayer() {
    this.player.health = this.player.maxHealth;
    this.player.shield = this.player.maxShield;
    this.player.grenades = this.player.maxGrenades;
    this.player.isDead = false;
    this.player.velocity.set(0, 0, 0);
    this.player.isGrounded = true;

    if (this.playerMesh.userData) {
      this.playerMesh.userData.isDead = false;
      this.playerMesh.userData.deathProgress = 0;
      this.playerMesh.rotation.x = 0;
    }

    const spawn = this.arena.getRandomSpawn(this.player.team);
    this.player.pos.copy(spawn);
    this.playerMesh.position.copy(spawn);

    this.yaw = this.player.team === 'alpha' ? 0.8 : -2.3;
    this.pitch = 0;

    this.updateHUDHealth();
    this.updateHUDAmmo();
  }

  startMatch(mode = 'TDM', mapId = 'training') {
    this.gameMode = mode;
    this.setMap(mapId);
    this.matchTimer = mode === 'ARENA' ? 120 : 300;
    this.alphaScore = 0;
    this.omegaScore = 0;
    this.arenaRound = 1;
    this.alphaRoundsWon = 0;
    this.omegaRoundsWon = 0;
    this.brZoneRadius = 70;
    this.player.killstreak = 0;

    if (this.brZoneMesh) this.brZoneMesh.visible = (mode === 'BR');

    this.clearBots();
    this.spawnSquadBots();
    this.respawnPlayer();

    this.running = true;
    this.clock.start();

    // Start high-octane background synth combat music
    if (window.soundSystem) {
      window.soundSystem.startCombatMusic();
    }

    this.animate();
  }

  clearBots() {
    this.bots.forEach(b => { if (b.mesh) this.scene.remove(b.mesh); });
    this.bots = [];
  }

  spawnSquadBots() {
    const weapons = ['AR-47', 'SMG-9', 'SR-50', 'SG-12', 'PL-9'];

    if (this.gameMode === 'TDM') {
      const alphaNames = ['Viper-2', 'Echo-3', 'Specter-4'];
      alphaNames.forEach((name, idx) => {
        const bot = new BotController({
          id: `bot_alpha_${idx}`,
          name,
          team: 'alpha',
          weaponKey: weapons[idx % weapons.length],
          difficulty: 'regular',
          arena: this.arena,
          scene: this.scene,
          game: this
        });
        this.bots.push(bot);
      });

      const omegaNames = ['Reaper-1', 'Titan-2', 'Ghost-3', 'Havoc-4'];
      omegaNames.forEach((name, idx) => {
        const bot = new BotController({
          id: `bot_omega_${idx}`,
          name,
          team: 'omega',
          weaponKey: weapons[(idx + 1) % weapons.length],
          difficulty: 'veteran',
          arena: this.arena,
          scene: this.scene,
          game: this
        });
        this.bots.push(bot);
      });
    } else if (this.gameMode === 'ARENA') {
      const alphaNames = ['Viper-2', 'Echo-3'];
      alphaNames.forEach((name, idx) => {
        this.bots.push(new BotController({
          id: `bot_alpha_${idx}`, name, team: 'alpha', weaponKey: weapons[idx], arena: this.arena, scene: this.scene, game: this
        }));
      });
      const omegaNames = ['Reaper-1', 'Titan-2', 'Ghost-3'];
      omegaNames.forEach((name, idx) => {
        this.bots.push(new BotController({
          id: `bot_omega_${idx}`, name, team: 'omega', weaponKey: weapons[idx + 1], arena: this.arena, scene: this.scene, game: this
        }));
      });
    } else {
      const ffaNames = ['Apex', 'Raptor', 'Vortex', 'Sentinel', 'Onyx', 'Kodiak', 'Striker'];
      ffaNames.forEach((name, idx) => {
        this.bots.push(new BotController({
          id: `bot_ffa_${idx}`, name, team: `ffa_${idx}`, weaponKey: weapons[idx % weapons.length], arena: this.arena, scene: this.scene, game: this
        }));
      });
    }
  }

  animate() {
    if (!this.running) return;
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);

    this.updateMatch(dt);
    this.updatePlayer(dt);
    this.updateCamera(dt);
    this.updateBots(dt);
    this.updateTracers(dt);
    this.updateGrenades(dt);
    this.updateParticles(dt);
    this.updateFloatingText(dt);
    this.arena.updatePickups(dt);
    this.checkPickups();

    this.renderer.render(this.scene, this.camera);
  }

  updateMatch(dt) {
    this.matchTimer -= dt;
    if (this.uavActiveTimer > 0) this.uavActiveTimer -= dt;

    if (this.matchTimer <= 0) {
      this.endMatch();
      return;
    }

    if (this.gameMode === 'BR' && this.brZoneRadius > 10) {
      this.brZoneRadius -= dt * 0.45;
      if (this.brZoneMesh) {
        this.brZoneMesh.scale.set(this.brZoneRadius / 70, 1, this.brZoneRadius / 70);
      }
      const dist = this.player.pos.distanceTo(this.brZoneCenter);
      if (dist > this.brZoneRadius) this.damagePlayer(dt * 8, false, null);
    }

    if (window.app) {
      window.app.updateMatchHUD({
        timer: Math.max(0, Math.floor(this.matchTimer)),
        alphaScore: this.alphaScore,
        omegaScore: this.omegaScore,
        targetScore: this.targetScore,
        round: this.arenaRound
      });
    }
  }

  updatePlayer(dt) {
    if (this.player.isDead) {
      this.player.respawnTimer -= dt;
      if (this.player.respawnTimer <= 0 && this.gameMode === 'TDM') {
        this.respawnPlayer();
      }
      CharacterBuilder.animateOperator(this.playerMesh, dt, {
        isMoving: false, isSprinting: false, isCrouching: false, isADS: false
      });
      return;
    }

    if (Date.now() - this.player.lastDamageTime > 5000) {
      if (this.player.health < this.player.maxHealth) {
        this.player.health = Math.min(this.player.maxHealth, this.player.health + dt * 10);
        this.updateHUDHealth();
      }
    }

    this.input.update(dt);
    const lookDelta = this.input.consumeLookDelta();
    this.yaw -= lookDelta.x;
    this.pitch = Math.max(-1.1, Math.min(1.1, this.pitch - lookDelta.y));

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const moveX = this.input.moveVector.x;
    const moveY = this.input.moveVector.y;
    const isMoving = Math.abs(moveX) > 0.05 || Math.abs(moveY) > 0.05;

    let speed = 5.2;
    if (this.input.isSprinting && !this.input.isADS && !this.input.isCrouching && moveY > 0.2) {
      speed = 7.8;
    } else if (this.input.isCrouching) {
      speed = 2.8;
    } else if (this.input.isADS) {
      speed = 3.2;
    }

    const moveDir = forward.clone().multiplyScalar(moveY).add(right.clone().multiplyScalar(moveX));
    if (moveDir.lengthSq() > 0.01) moveDir.normalize();

    const nextPos = this.player.pos.clone().add(moveDir.clone().multiplyScalar(speed * dt));
    if (!this.arena.checkCollision(nextPos, 0.45)) {
      this.player.pos.copy(nextPos);
    } else {
      const slideX = this.player.pos.clone().add(new THREE.Vector3(moveDir.x * speed * dt, 0, 0));
      if (!this.arena.checkCollision(slideX, 0.45)) this.player.pos.copy(slideX);
      const slideZ = this.player.pos.clone().add(new THREE.Vector3(0, 0, moveDir.z * speed * dt));
      if (!this.arena.checkCollision(slideZ, 0.45)) this.player.pos.copy(slideZ);
    }

    // Jump
    if (this.input.isJumping && this.player.isGrounded) {
      this.player.velocity.y = 5.5;
      this.player.isGrounded = false;
      if (window.soundSystem) window.soundSystem.playFootstep();
    }
    if (!this.player.isGrounded) {
      this.player.velocity.y -= 18.0 * dt;
      this.player.pos.y += this.player.velocity.y * dt;
      if (this.player.pos.y <= 0) {
        this.player.pos.y = 0;
        this.player.velocity.y = 0;
        this.player.isGrounded = true;
      }
    }

    // Footsteps
    if (isMoving && this.player.isGrounded) {
      if (!this.lastStepTime) this.lastStepTime = 0;
      const stepInterval = this.input.isSprinting ? 280 : 440;
      if (Date.now() - this.lastStepTime > stepInterval) {
        this.lastStepTime = Date.now();
        if (window.soundSystem) window.soundSystem.playFootstep();
      }
    }

    this.playerMesh.position.copy(this.player.pos);
    this.playerMesh.rotation.y = this.yaw + Math.PI;

    if (this.playerMesh.userData && this.playerMesh.userData.headPivot) {
      this.playerMesh.userData.headPivot.rotation.x = this.pitch * 0.6;
    }

    if (this.input.weaponSwitchRequested) {
      this.equipWeapon(this.input.weaponSwitchRequested);
      this.input.weaponSwitchRequested = null;
    }

    // Grenade throw from player
    if (this.input.grenadeRequested && this.player.grenades > 0) {
      this.input.grenadeRequested = false;
      this.player.grenades--;
      this.throwPlayerGrenade();
    }

    // Killstreak activation
    if (this.input.killstreakRequested) {
      this.input.killstreakRequested = false;
      this.activateKillstreak();
    }

    // Reload
    const ws = this.weaponState[this.currentWeaponKey];
    const def = WEAPON_DEFINITIONS[this.currentWeaponKey];

    if (this.input.reloadRequested && !ws.isReloading && ws.magAmmo < def.magSize && ws.reserveAmmo > 0) {
      this.input.reloadRequested = false;
      this.startPlayerReload();
    }
    if (ws.isReloading) {
      ws.reloadTimer -= dt * 1000;
      if (ws.reloadTimer <= 0) this.finishPlayerReload();
    }

    // Shooting
    ws.fireTimer -= dt * 1000;
    if (this.input.isFiring && !ws.isReloading) {
      if (ws.magAmmo > 0) {
        if (ws.fireTimer <= 0) {
          this.shootPlayerWeapon();
          ws.fireTimer = def.fireInterval;
        }
      } else if (ws.reserveAmmo > 0 && !ws.isReloading) {
        this.startPlayerReload();
      }
    }

    // Recoil recovery
    this.recoilPitch = Math.max(0, this.recoilPitch - dt * def.recoilRecovery * 0.05);
    this.recoilYaw = THREE.MathUtils.lerp(this.recoilYaw, 0, dt * def.recoilRecovery);
    this.screenShake = Math.max(0, this.screenShake - dt * 3.5);

    CharacterBuilder.animateOperator(this.playerMesh, dt, {
      isMoving,
      isSprinting: this.input.isSprinting && isMoving,
      isCrouching: this.input.isCrouching,
      isADS: this.input.isADS
    });
  }

  updateCamera(dt) {
    const isADS = this.input.isADS;
    const def = WEAPON_DEFINITIONS[this.currentWeaponKey];
    const targetDist = isADS ? (def.hasScopeOverlay ? 1.0 : 1.6) : this.cameraDistance;
    const targetFov = isADS ? (65 / (def.adsZoom || 1.3)) : 65;

    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * 14);
    this.camera.updateProjectionMatrix();

    // Toggle sniper optical scope overlay
    if (window.app) {
      window.app.toggleSniperScope(isADS && !!def.hasScopeOverlay);
    }

    const shoulderOffset = isADS ? 0.38 : this.cameraShoulderOffset;
    const heightOffset = this.input.isCrouching ? 1.15 : this.cameraHeight;

    const rotMatrix = new THREE.Matrix4().makeRotationY(this.yaw);
    const rightVec = new THREE.Vector3(1, 0, 0).applyMatrix4(rotMatrix);

    const targetLookAt = this.player.pos.clone().add(new THREE.Vector3(0, heightOffset, 0));
    targetLookAt.add(rightVec.clone().multiplyScalar(shoulderOffset));

    const pitchWithRecoil = this.pitch + this.recoilPitch;
    const yawWithRecoil = this.yaw + this.recoilYaw;

    const camX = targetLookAt.x + targetDist * Math.sin(yawWithRecoil) * Math.cos(pitchWithRecoil);
    const camY = targetLookAt.y + targetDist * Math.sin(pitchWithRecoil);
    const camZ = targetLookAt.z + targetDist * Math.cos(yawWithRecoil) * Math.cos(pitchWithRecoil);

    const desiredCamPos = new THREE.Vector3(camX, camY, camZ);

    // Camera Collision Raycast
    const rayDir = desiredCamPos.clone().sub(targetLookAt);
    const rayDist = rayDir.length();
    rayDir.normalize();

    const ray = new THREE.Ray(targetLookAt, rayDir);
    let closestClip = rayDist;

    for (let i = 0; i < this.arena.colliders.length; i++) {
      const col = this.arena.colliders[i];
      const hit = ray.intersectBox(col.box, new THREE.Vector3());
      if (hit) {
        const d = targetLookAt.distanceTo(hit);
        if (d < closestClip) closestClip = Math.max(0.4, d - 0.2);
      }
    }

    const actualCamPos = targetLookAt.clone().add(rayDir.multiplyScalar(closestClip));

    // Screen Shake effect
    if (this.screenShake > 0) {
      actualCamPos.x += (Math.random() - 0.5) * this.screenShake * 0.15;
      actualCamPos.y += (Math.random() - 0.5) * this.screenShake * 0.15;
    }

    this.camera.position.copy(actualCamPos);

    const aimLookAt = targetLookAt.clone().add(
      new THREE.Vector3(
        -Math.sin(yawWithRecoil) * Math.cos(pitchWithRecoil),
        -Math.sin(pitchWithRecoil),
        -Math.cos(yawWithRecoil) * Math.cos(pitchWithRecoil)
      ).multiplyScalar(50)
    );
    this.camera.lookAt(aimLookAt);
  }

  shootPlayerWeapon() {
    const ws = this.weaponState[this.currentWeaponKey];
    const def = WEAPON_DEFINITIONS[this.currentWeaponKey];

    ws.magAmmo--;
    this.stats.shotsFired++;
    this.updateHUDAmmo();

    if (window.soundSystem) {
      window.soundSystem.playGunshot(this.currentWeaponKey, true, false);
    }

    this.recoilPitch += def.recoilPitch * (this.input.isADS ? 0.6 : 1.0);
    this.recoilYaw += (Math.random() - 0.5) * def.recoilYaw;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    const muzzle = this.playerWeaponMesh ? (this.playerWeaponMesh.getObjectByName('muzzle_point') || this.playerWeaponMesh) : this.playerMesh;
    const origin = new THREE.Vector3();
    muzzle.getWorldPosition(origin);

    const numPellets = def.pellets || 1;
    for (let p = 0; p < numPellets; p++) {
      const spread = this.input.isADS ? def.spreadADS : (this.input.isCrouching ? def.spreadBase * 0.7 : def.spreadBase);
      const aimDir = raycaster.ray.direction.clone();
      aimDir.x += (Math.random() - 0.5) * spread;
      aimDir.y += (Math.random() - 0.5) * spread;
      aimDir.z += (Math.random() - 0.5) * spread;
      aimDir.normalize();

      this.fireTracer(origin, aimDir, this.player, def);
    }

    this.spawnMuzzleFlash(origin);
  }

  fireTracer(origin, dir, attacker, weaponDef) {
    const ray = new THREE.Ray(origin, dir);
    let closestDist = weaponDef.range || 120;
    let hitObject = null;
    let isHeadshot = false;
    let hitPoint = origin.clone().add(dir.clone().multiplyScalar(closestDist));

    const isAttackerPlayer = (attacker === this.player);

    if (isAttackerPlayer) {
      for (let i = 0; i < this.bots.length; i++) {
        const bot = this.bots[i];
        if (bot.isDead || bot.team === attacker.team) continue;

        const headBox = bot.mesh.userData.headHitbox;
        if (headBox) {
          const headSphere = new THREE.Sphere(headBox.getWorldPosition(new THREE.Vector3()), 0.28);
          const headHit = ray.intersectSphere(headSphere, new THREE.Vector3());
          if (headHit && origin.distanceTo(headHit) < closestDist) {
            closestDist = origin.distanceTo(headHit);
            hitObject = bot;
            isHeadshot = true;
            hitPoint.copy(headHit);
          }
        }

        const bodyBox = bot.mesh.userData.bodyHitbox;
        if (bodyBox) {
          const bodySphere = new THREE.Sphere(bodyBox.getWorldPosition(new THREE.Vector3()), 0.45);
          const bodyHit = ray.intersectSphere(bodySphere, new THREE.Vector3());
          if (bodyHit && origin.distanceTo(bodyHit) < closestDist) {
            closestDist = origin.distanceTo(bodyHit);
            hitObject = bot;
            isHeadshot = false;
            hitPoint.copy(bodyHit);
          }
        }
      }
    } else {
      if (!this.player.isDead && attacker.team !== this.player.team) {
        const playerSphere = new THREE.Sphere(this.player.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0.55);
        const hit = ray.intersectSphere(playerSphere, new THREE.Vector3());
        if (hit && origin.distanceTo(hit) < closestDist) {
          closestDist = origin.distanceTo(hit);
          hitObject = this.player;
          hitPoint.copy(hit);
        }
      }
    }

    for (let i = 0; i < this.arena.colliders.length; i++) {
      const col = this.arena.colliders[i];
      const hit = ray.intersectBox(col.box, new THREE.Vector3());
      if (hit && origin.distanceTo(hit) < closestDist) {
        closestDist = origin.distanceTo(hit);
        hitObject = null;
        hitPoint.copy(hit);
      }
    }

    this.createVisualTracer(origin, hitPoint, weaponDef);

    if (hitObject) {
      const mult = isHeadshot ? weaponDef.headshotMultiplier : 1.0;
      const damage = Math.round(weaponDef.damage * mult);

      if (hitObject === this.player) {
        this.damagePlayer(damage, isHeadshot, attacker);
      } else {
        hitObject.takeDamage(damage, isHeadshot, attacker);
        if (isAttackerPlayer) {
          this.stats.shotsHit++;
          this.player.damageDealt += damage;
          if (window.soundSystem) window.soundSystem.playHitMarker(isHeadshot);
          if (window.app) window.app.showHitmarker(isHeadshot);

          // Spawn floating damage indicator
          this.spawnFloatingText(hitPoint, `-${damage}`, isHeadshot ? '#ef4444' : '#ffffff');
        }
      }
      this.spawnBloodImpact(hitPoint);
    } else {
      this.spawnSparks(hitPoint);
    }
  }

  createVisualTracer(start, end, weaponDef) {
    const dir = end.clone().sub(start);
    const len = dir.length();
    dir.normalize();

    const tracerMat = new THREE.MeshBasicMaterial({ color: 0xfff3a8, transparent: true, opacity: 0.9 });
    const geo = new THREE.CylinderGeometry(0.015, 0.015, Math.min(2.5, len), 4);
    const mesh = new THREE.Mesh(geo, tracerMat);

    mesh.position.copy(start);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.scene.add(mesh);

    this.tracers.push({ mesh, start: start.clone(), end: end.clone(), dir, speed: 180, progress: 0, totalDist: len });
  }

  updateTracers(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tr = this.tracers[i];
      tr.progress += tr.speed * dt;
      tr.mesh.position.add(tr.dir.clone().multiplyScalar(tr.speed * dt));
      if (tr.progress >= tr.totalDist) {
        this.scene.remove(tr.mesh);
        tr.mesh.geometry.dispose();
        tr.mesh.material.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }

  /* ================= TACTICAL FRAG GRENADES ================= */
  throwPlayerGrenade() {
    if (this.playerMesh.userData) this.playerMesh.userData.throwGrenadeTimer = 0.6;
    const origin = this.player.pos.clone().add(new THREE.Vector3(0, 1.8, 0));

    const forward = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      -Math.sin(this.pitch) + 0.35,
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();

    this.throwGrenade(origin, forward, this.player);
  }

  throwGrenade(origin, dir, thrower) {
    const grenadeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x15803d, metalness: 0.8, roughness: 0.3 })
    );
    grenadeMesh.position.copy(origin);
    this.scene.add(grenadeMesh);

    this.grenades.push({
      mesh: grenadeMesh,
      pos: origin.clone(),
      velocity: dir.clone().multiplyScalar(18),
      thrower,
      fuse: 2.2 // seconds
    });
  }

  updateGrenades(dt) {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.fuse -= dt;

      g.velocity.y -= 16 * dt; // Gravity
      const nextPos = g.pos.clone().add(g.velocity.clone().multiplyScalar(dt));

      // Ground bounce
      if (nextPos.y <= 0.16) {
        nextPos.y = 0.16;
        g.velocity.y = -g.velocity.y * 0.45;
        g.velocity.x *= 0.7;
        g.velocity.z *= 0.7;
      }

      g.pos.copy(nextPos);
      g.mesh.position.copy(nextPos);
      g.mesh.rotation.x += dt * 8;

      if (g.fuse <= 0) {
        this.detonateGrenade(g);
        this.scene.remove(g.mesh);
        g.mesh.geometry.dispose();
        g.mesh.material.dispose();
        this.grenades.splice(i, 1);
      }
    }
  }

  detonateGrenade(g) {
    const blastPos = g.pos;
    if (window.soundSystem) window.soundSystem.playExplosion();
    this.screenShake = 1.0;

    // Visual Shockwave Sphere
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffa500, transparent: true, opacity: 0.8 })
    );
    sphere.position.copy(blastPos);
    this.scene.add(sphere);

    let progress = 0;
    const expandAnim = () => {
      progress += 0.08;
      sphere.scale.setScalar(1 + progress * 6);
      sphere.material.opacity = Math.max(0, 0.8 - progress);
      if (progress < 1) requestAnimationFrame(expandAnim);
      else {
        this.scene.remove(sphere);
        sphere.geometry.dispose();
        sphere.material.dispose();
      }
    };
    expandAnim();

    // Radial Damage within 9 meters
    const maxRadius = 9.0;
    const maxDamage = 110;

    // Check player
    if (!this.player.isDead) {
      const d = this.player.pos.distanceTo(blastPos);
      if (d < maxRadius) {
        const falloff = 1 - (d / maxRadius);
        this.damagePlayer(Math.round(maxDamage * falloff), false, g.thrower);
      }
    }

    // Check bots
    this.bots.forEach(b => {
      if (!b.isDead) {
        const d = b.mesh.position.distanceTo(blastPos);
        if (d < maxRadius) {
          const falloff = 1 - (d / maxRadius);
          b.takeDamage(Math.round(maxDamage * falloff), false, g.thrower);
        }
      }
    });
  }

  /* ================= KILLSTREAKS ================= */
  activateKillstreak() {
    if (this.player.killstreak >= 7) {
      // Mortar Strike
      this.player.killstreak = 0;
      if (window.soundSystem) window.soundSystem.playAnnouncer('killstreak');
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const mortarPos = this.player.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 30, 0, (Math.random() - 0.5) * 30));
          this.detonateGrenade({ pos: mortarPos, thrower: this.player });
        }, i * 600);
      }
    } else if (this.player.killstreak >= 5) {
      // Care Package: Instantly restore health, armor, and grenades
      this.player.killstreak = 0;
      this.player.health = this.player.maxHealth;
      this.player.shield = this.player.maxShield;
      this.player.grenades = this.player.maxGrenades;
      this.updateHUDHealth();
      if (window.soundSystem) window.soundSystem.playReloadStage(2);
    } else if (this.player.killstreak >= 3) {
      // UAV Recon: 15 seconds radar reveal
      this.player.killstreak = 0;
      this.uavActiveTimer = 15.0;
      if (window.soundSystem) window.soundSystem.playAnnouncer('killstreak');
    }
  }

  spawnFloatingText(pos, text, color = '#ffffff') {
    const el = document.createElement('div');
    el.className = 'floating-damage';
    el.style.color = color;
    el.innerText = text;
    document.body.appendChild(el);

    this.floatingTexts.push({ el, pos: pos.clone(), life: 0.8, maxLife: 0.8 });
  }

  updateFloatingText(dt) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.pos.y += dt * 1.5;

      const screenPos = ft.pos.clone().project(this.camera);
      const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

      ft.el.style.left = `${x}px`;
      ft.el.style.top = `${y}px`;
      ft.el.style.opacity = `${ft.life / ft.maxLife}`;

      if (ft.life <= 0 || screenPos.z > 1) {
        ft.el.remove();
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  spawnMuzzleFlash(pos) {
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff7c2, transparent: true, opacity: 0.8 })
    );
    flash.position.copy(pos);
    this.scene.add(flash);
    setTimeout(() => {
      this.scene.remove(flash);
      flash.geometry.dispose();
      flash.material.dispose();
    }, 40);
  }

  spawnSparks(pos) {
    for (let i = 0; i < 4; i++) {
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
      spark.position.copy(pos);
      this.scene.add(spark);
      this.particles.push({
        mesh: spark,
        vel: new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 4, (Math.random() - 0.5) * 5),
        life: 0.25
      });
    }
  }

  spawnBloodImpact(pos) {
    for (let i = 0; i < 4; i++) {
      const drop = new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 4), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      drop.position.copy(pos);
      this.scene.add(drop);
      this.particles.push({
        mesh: drop,
        vel: new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2.5, (Math.random() - 0.5) * 3),
        life: 0.2
      });
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vel.y -= 9.8 * dt;
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  damagePlayer(amount, isHeadshot, attacker) {
    if (this.player.isDead) return;
    this.player.lastDamageTime = Date.now();

    if (this.player.shield > 0) {
      const absorb = Math.min(this.player.shield, amount * 0.7);
      this.player.shield -= absorb;
      amount -= absorb;
    }

    this.player.health = Math.max(0, this.player.health - amount);
    this.updateHUDHealth();
    if (window.soundSystem) window.soundSystem.playDamageTaken();

    if (attacker && window.app) {
      const attackerPos = attacker.mesh ? attacker.mesh.position : attacker.pos;
      const toAttacker = attackerPos.clone().sub(this.player.pos);
      const angle = Math.atan2(toAttacker.x, toAttacker.z) - this.yaw;
      window.app.showDamageIndicator(angle);
    }

    if (this.player.health <= 0) this.eliminatePlayer(attacker);
  }

  eliminatePlayer(attacker) {
    this.player.isDead = true;
    this.player.deaths++;
    this.player.killstreak = 0;
    this.player.respawnTimer = 3.0;

    if (this.playerMesh.userData) this.playerMesh.userData.isDead = true;

    this.onEntityEliminated({
      victim: this.player,
      attacker,
      weapon: attacker ? (attacker.weaponKey || 'Unknown') : 'Storm',
      isHeadshot: false
    });
  }

  onEntityEliminated({ victim, attacker, weapon, isHeadshot }) {
    const isVictimPlayer = (victim === this.player);
    const isAttackerPlayer = (attacker === this.player);

    const attackerTeam = attacker ? attacker.team : 'none';
    if (attackerTeam === 'alpha') this.alphaScore++;
    else if (attackerTeam === 'omega') this.omegaScore++;

    if (isAttackerPlayer) {
      this.player.kills++;
      this.player.killstreak++;
      if (isHeadshot) this.player.headshots++;
      if (window.soundSystem) window.soundSystem.playKillSound();
    }

    const attackerName = attacker ? attacker.name : 'The Zone';
    const victimName = victim.name;

    if (window.app) {
      window.app.addKillfeed({
        attacker: attackerName,
        victim: victimName,
        weapon: weapon || 'Firearm',
        isHeadshot,
        isPlayerKill: isAttackerPlayer,
        isPlayerDeath: isVictimPlayer
      });
    }

    if (this.gameMode === 'TDM') {
      if (this.alphaScore >= this.targetScore || this.omegaScore >= this.targetScore) {
        this.endMatch();
      }
    } else if (this.gameMode === 'ARENA') {
      this.checkArenaRoundEnd();
    } else if (this.gameMode === 'BR') {
      const livingBots = this.bots.filter(b => !b.isDead).length;
      if (isVictimPlayer || livingBots === 0) this.endMatch();
    }
  }

  checkArenaRoundEnd() {
    const alphaLiving = (this.player.isDead ? 0 : 1) + this.bots.filter(b => b.team === 'alpha' && !b.isDead).length;
    const omegaLiving = this.bots.filter(b => b.team === 'omega' && !b.isDead).length;

    if (alphaLiving === 0 || omegaLiving === 0) {
      if (alphaLiving > omegaLiving) this.alphaRoundsWon++;
      else this.omegaRoundsWon++;

      this.arenaRound++;
      if (this.alphaRoundsWon >= 3 || this.omegaRoundsWon >= 3) {
        this.endMatch();
      } else {
        setTimeout(() => {
          this.bots.forEach(b => b.respawn());
          this.respawnPlayer();
        }, 2000);
      }
    }
  }

  updateBots(dt) {
    const allTargets = [this.player, ...this.bots];
    this.bots.forEach(b => b.update(dt, allTargets));
  }

  checkPickups() {
    if (this.player.isDead) return;
    this.arena.pickups.forEach(p => {
      if (p.active && this.player.pos.distanceTo(p.initialPos) < 1.4) {
        this.arena.collectPickup(p);
        if (p.type === 'health') {
          this.player.health = Math.min(this.player.maxHealth, this.player.health + 35);
          this.player.shield = Math.min(this.player.maxShield, this.player.shield + 20);
          this.updateHUDHealth();
          if (window.soundSystem) window.soundSystem.playReloadStage(2);
        } else {
          const ws = this.weaponState[this.currentWeaponKey];
          const def = WEAPON_DEFINITIONS[this.currentWeaponKey];
          ws.reserveAmmo = Math.min(def.reserveAmmo * 2, ws.reserveAmmo + def.magSize * 2);
          this.player.grenades = Math.min(this.player.maxGrenades, this.player.grenades + 1);
          this.updateHUDAmmo();
          if (window.soundSystem) window.soundSystem.playReloadStage(3);
        }
      }
    });
  }

  startPlayerReload() {
    const ws = this.weaponState[this.currentWeaponKey];
    const def = WEAPON_DEFINITIONS[this.currentWeaponKey];
    ws.isReloading = true;
    ws.reloadTimer = def.reloadTime;

    if (window.soundSystem) {
      window.soundSystem.playReloadStage(1);
      setTimeout(() => window.soundSystem.playReloadStage(2), def.reloadTime * 0.4);
      setTimeout(() => window.soundSystem.playReloadStage(3), def.reloadTime * 0.85);
    }
    if (window.app) window.app.startReloadProgress(def.reloadTime);
  }

  finishPlayerReload() {
    const ws = this.weaponState[this.currentWeaponKey];
    const def = WEAPON_DEFINITIONS[this.currentWeaponKey];
    const needed = def.magSize - ws.magAmmo;
    const amount = Math.min(needed, ws.reserveAmmo);
    ws.magAmmo += amount;
    ws.reserveAmmo -= amount;
    ws.isReloading = false;
    this.updateHUDAmmo();
  }

  updateHUDHealth() {
    if (window.app) {
      window.app.updatePlayerHUD({
        health: Math.ceil(this.player.health),
        maxHealth: this.player.maxHealth,
        shield: Math.ceil(this.player.shield),
        maxShield: this.player.maxShield,
        grenades: this.player.grenades,
        killstreak: this.player.killstreak
      });
    }
  }

  updateHUDAmmo() {
    const ws = this.weaponState[this.currentWeaponKey];
    if (window.app) {
      window.app.updateWeaponHUD({
        weaponKey: this.currentWeaponKey,
        magAmmo: ws.magAmmo,
        reserveAmmo: ws.reserveAmmo,
        isReloading: ws.isReloading
      });
    }
  }

  endMatch() {
    this.running = false;
    let isVictory = false;

    if (this.gameMode === 'TDM') isVictory = this.alphaScore >= this.omegaScore;
    else if (this.gameMode === 'ARENA') isVictory = this.alphaRoundsWon >= this.omegaRoundsWon;
    else isVictory = !this.player.isDead;

    if (window.soundSystem) window.soundSystem.playMatchEnd(isVictory);

    const accuracy = this.stats.shotsFired > 0 ? Math.round((this.stats.shotsHit / this.stats.shotsFired) * 100) : 0;
    const earnedXP = (this.player.kills * 100) + (this.player.headshots * 50) + (isVictory ? 500 : 150) + Math.floor(this.player.damageDealt * 0.2);

    if (window.app) {
      window.app.showMatchResults({
        isVictory,
        mode: this.gameMode,
        kills: this.player.kills,
        deaths: this.player.deaths,
        assists: this.player.assists,
        damage: Math.round(this.player.damageDealt),
        accuracy,
        headshots: this.player.headshots,
        earnedXP,
        alphaScore: this.alphaScore,
        omegaScore: this.omegaScore
      });
    }
  }
}

window.GameEngine = GameEngine;
