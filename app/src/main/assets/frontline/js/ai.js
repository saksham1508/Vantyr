/**
 * PROJECT FRONTLINE - Tactical AI Bot State Machine
 * Squad combat, grenade tactics, response to player radio commands,
 * difficulty scaling (Recruit, Regular, Veteran), and cover-seeking.
 */

class BotController {
  constructor({ id, name, team, weaponKey = 'AR-47', difficulty = 'regular', arena, scene, game }) {
    this.id = id;
    this.name = name;
    this.team = team;
    this.weaponKey = weaponKey;
    this.difficulty = difficulty;
    this.arena = arena;
    this.scene = scene;
    this.game = game;

    this.weaponDef = WEAPON_DEFINITIONS[weaponKey] || WEAPON_DEFINITIONS['AR-47'];

    this.maxHealth = 100;
    this.health = 100;
    this.maxShield = 50;
    this.shield = 50;
    this.isDead = false;
    this.respawnTimer = 0;

    this.magAmmo = this.weaponDef.magSize;
    this.reserveAmmo = this.weaponDef.reserveAmmo;
    this.isReloading = false;
    this.reloadTimer = 0;

    this.state = 'PATROL'; // PATROL, SEARCH, ENGAGE, TAKE_COVER, RELOAD, FOLLOW_LEADER, HOLD
    this.target = null;
    this.lastTargetPos = new THREE.Vector3();
    this.currentWaypoint = null;
    this.waypointIndex = Math.floor(Math.random() * (arena.patrolWaypoints.length || 1));

    // Grenade capability
    this.grenadeCooldown = 15.0; // Seconds between bot grenade throws

    // Difficulty tuning
    if (this.difficulty === 'veteran') {
      this.reactionDelay = 0.16;
      this.aimErrorSpread = 0.025;
    } else if (this.difficulty === 'recruit') {
      this.reactionDelay = 0.45;
      this.aimErrorSpread = 0.07;
    } else {
      this.reactionDelay = 0.26;
      this.aimErrorSpread = 0.045;
    }

    this.reactionTimer = 0;
    this.fireTimer = 0;
    this.burstCount = 0;
    this.burstMax = 3 + Math.floor(Math.random() * 4);
    this.burstPauseTimer = 0;
    this.strafeTimer = 0;
    this.strafeDir = 1;

    this.mesh = CharacterBuilder.createOperator({ team, isPlayer: false });
    this.weaponMesh = WeaponModelBuilder.createWeaponModel(weaponKey, 'standard');
    const socket = this.mesh.userData.weaponSocket;
    if (socket) socket.add(this.weaponMesh);

    this.respawn();
    this.scene.add(this.mesh);
  }

  respawn() {
    this.health = this.maxHealth;
    this.shield = this.maxShield;
    this.magAmmo = this.weaponDef.magSize;
    this.isDead = false;
    this.isReloading = false;
    this.state = 'PATROL';
    this.target = null;

    if (this.mesh.userData) {
      this.mesh.userData.isDead = false;
      this.mesh.userData.deathProgress = 0;
      this.mesh.rotation.x = 0;
    }

    const spawnPos = this.arena.getRandomSpawn(this.team);
    this.mesh.position.copy(spawnPos);
    this.mesh.visible = true;
  }

  takeDamage(amount, isHeadshot = false, attacker = null) {
    if (this.isDead) return;

    if (this.shield > 0) {
      const shieldAbsorb = Math.min(this.shield, amount * 0.7);
      this.shield -= shieldAbsorb;
      amount -= shieldAbsorb;
    }

    this.health = Math.max(0, this.health - amount);
    if (this.mesh.userData) this.mesh.userData.flinchTime = 0.15;

    if (attacker && !this.target && attacker.team !== this.team) {
      this.target = attacker;
      this.state = 'ENGAGE';
    }

    if (this.health < 35 && this.state !== 'TAKE_COVER') {
      this.state = 'TAKE_COVER';
    }

    if (this.health <= 0) {
      this.eliminate(attacker, isHeadshot);
    }
  }

  eliminate(attacker, isHeadshot) {
    this.isDead = true;
    this.respawnTimer = 3.0;
    if (this.mesh.userData) this.mesh.userData.isDead = true;

    if (this.game && this.game.onEntityEliminated) {
      this.game.onEntityEliminated({
        victim: this,
        attacker,
        weapon: this.weaponKey,
        isHeadshot
      });
    }
  }

  receiveSquadCommand(command, playerPos) {
    if (this.isDead || this.team !== 'alpha') return;

    if (command === 'FOLLOW') {
      this.state = 'FOLLOW_LEADER';
    } else if (command === 'HOLD') {
      this.state = 'HOLD';
    } else if (command === 'ATTACK') {
      this.state = 'PATROL';
    }
  }

  update(dt, potentialTargets) {
    if (this.isDead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0 && this.game.gameMode === 'TDM') {
        this.respawn();
      }
      CharacterBuilder.animateOperator(this.mesh, dt, { isMoving: false, isSprinting: false, isCrouching: false, isADS: false });
      return;
    }

    this.grenadeCooldown -= dt;
    this.evaluatePerception(potentialTargets);

    let isMoving = false;
    let isADS = false;

    switch (this.state) {
      case 'PATROL':
        isMoving = this.executePatrol(dt);
        break;
      case 'SEARCH':
        isMoving = this.executeSearch(dt);
        break;
      case 'ENGAGE':
        isMoving = this.executeEngage(dt);
        isADS = true;
        break;
      case 'TAKE_COVER':
        isMoving = this.executeTakeCover(dt);
        break;
      case 'FOLLOW_LEADER':
        isMoving = this.executeFollowLeader(dt);
        break;
      case 'HOLD':
        isMoving = false;
        break;
    }

    if (this.isReloading) {
      this.reloadTimer -= dt * 1000;
      if (this.reloadTimer <= 0) this.finishReload();
    }

    CharacterBuilder.animateOperator(this.mesh, dt, {
      isMoving,
      isSprinting: this.state === 'PATROL' || this.state === 'TAKE_COVER',
      isCrouching: this.state === 'TAKE_COVER',
      isADS
    });
  }

  evaluatePerception(potentialTargets) {
    if (!potentialTargets || potentialTargets.length === 0) return;

    let closestEnemy = null;
    let closestDistSq = Infinity;
    const botEyePos = this.mesh.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);

    for (let i = 0; i < potentialTargets.length; i++) {
      const enemy = potentialTargets[i];
      if (enemy.isDead || enemy.team === this.team) continue;

      const enemyPos = enemy.mesh ? enemy.mesh.position : enemy.pos;
      const enemyEyePos = enemyPos.clone().add(new THREE.Vector3(0, 1.6, 0));
      const distSq = botEyePos.distanceToSquared(enemyEyePos);

      if (distSq > 80 * 80) continue;

      const toEnemy = enemyEyePos.clone().sub(botEyePos).normalize();
      const dot = forward.dot(toEnemy);
      const inFOV = this.state === 'ENGAGE' ? dot > 0.1 : (distSq < 15 * 15 || dot > 0.35);

      if (inFOV) {
        const dir = enemyEyePos.clone().sub(botEyePos);
        const dist = dir.length();
        dir.normalize();

        const ray = new THREE.Ray(botEyePos, dir);
        let blocked = false;

        for (let c = 0; c < this.arena.colliders.length; c++) {
          const col = this.arena.colliders[c];
          const hit = ray.intersectBox(col.box, new THREE.Vector3());
          if (hit && botEyePos.distanceTo(hit) < dist - 0.5) {
            blocked = true;
            // Target is behind cover! Throw tactical grenade if cooldown ready
            if (this.grenadeCooldown <= 0 && dist < 30 && this.game && this.game.throwGrenade) {
              this.throwBotGrenade(enemyPos);
              this.grenadeCooldown = 20.0;
            }
            break;
          }
        }

        if (!blocked && distSq < closestDistSq) {
          closestDistSq = distSq;
          closestEnemy = enemy;
        }
      }
    }

    if (closestEnemy) {
      this.target = closestEnemy;
      this.lastTargetPos.copy(closestEnemy.mesh ? closestEnemy.mesh.position : closestEnemy.pos);
      if (this.state !== 'TAKE_COVER') this.state = 'ENGAGE';
    } else if (this.state === 'ENGAGE') {
      this.state = 'SEARCH';
    }
  }

  throwBotGrenade(targetPos) {
    if (this.mesh.userData) this.mesh.userData.throwGrenadeTimer = 0.6;
    const origin = this.mesh.position.clone().add(new THREE.Vector3(0, 1.8, 0));
    const dir = targetPos.clone().sub(origin).normalize();
    dir.y += 0.35; // Arc
    dir.normalize();
    this.game.throwGrenade(origin, dir, this);
  }

  executePatrol(dt) {
    if (this.arena.patrolWaypoints.length === 0) return false;
    if (!this.currentWaypoint) {
      this.currentWaypoint = this.arena.patrolWaypoints[this.waypointIndex];
    }
    const dist = this.mesh.position.distanceTo(this.currentWaypoint);
    if (dist < 3.0) {
      this.waypointIndex = (this.waypointIndex + 1) % this.arena.patrolWaypoints.length;
      this.currentWaypoint = this.arena.patrolWaypoints[this.waypointIndex];
    }
    return this.moveToward(this.currentWaypoint, 4.5 * dt);
  }

  executeFollowLeader(dt) {
    const leaderPos = this.game.player.pos;
    const dist = this.mesh.position.distanceTo(leaderPos);
    if (dist > 5.0) {
      return this.moveToward(leaderPos, 5.0 * dt);
    }
    return false;
  }

  executeSearch(dt) {
    const dist = this.mesh.position.distanceTo(this.lastTargetPos);
    if (dist < 4.0) {
      this.state = 'PATROL';
      return false;
    }
    return this.moveToward(this.lastTargetPos, 5.0 * dt);
  }

  executeEngage(dt) {
    if (!this.target || this.target.isDead) {
      this.target = null;
      this.state = 'PATROL';
      return false;
    }

    const targetPos = this.target.mesh ? this.target.mesh.position : this.target.pos;
    const lookDir = targetPos.clone().sub(this.mesh.position);
    lookDir.y = 0;
    if (lookDir.lengthSq() > 0.01) {
      const targetRotation = Math.atan2(lookDir.x, lookDir.z) + Math.PI;
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetRotation, dt * 10);
    }

    this.strafeTimer -= dt;
    if (this.strafeTimer <= 0) {
      this.strafeTimer = 1.0 + Math.random() * 1.5;
      this.strafeDir = Math.random() > 0.5 ? 1 : -1;
    }

    const strafeVec = new THREE.Vector3(this.strafeDir, 0, 0).applyQuaternion(this.mesh.quaternion);
    const distToTarget = this.mesh.position.distanceTo(targetPos);

    let moveDir = strafeVec.clone();
    if (distToTarget > 25) {
      moveDir.add(new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion).multiplyScalar(0.7));
    } else if (distToTarget < 8) {
      moveDir.add(new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion).multiplyScalar(0.7));
    }
    moveDir.normalize();

    const newPos = this.mesh.position.clone().add(moveDir.multiplyScalar(3.2 * dt));
    if (!this.arena.checkCollision(newPos, 0.45)) {
      this.mesh.position.copy(newPos);
    }

    this.handleBotShooting(dt, targetPos);
    return true;
  }

  executeTakeCover(dt) {
    if (this.isReloading && this.magAmmo === this.weaponDef.magSize) {
      this.state = 'ENGAGE';
      return false;
    }
    const retreatPoint = this.arena.getRandomSpawn(this.team);
    this.moveToward(retreatPoint, 5.5 * dt);

    if (this.magAmmo < this.weaponDef.magSize && !this.isReloading) this.startReload();
    if (this.health >= 60 && !this.isReloading) this.state = 'PATROL';
    return true;
  }

  handleBotShooting(dt, targetPos) {
    if (this.isReloading) return;
    if (this.magAmmo <= 0) {
      this.startReload();
      return;
    }

    this.fireTimer -= dt * 1000;
    this.burstPauseTimer -= dt;
    if (this.burstPauseTimer > 0) return;

    if (this.fireTimer <= 0) {
      this.fireTimer = this.weaponDef.fireInterval;
      this.burstCount++;
      this.fireBullet(targetPos);
      this.magAmmo--;

      if (this.burstCount >= this.burstMax) {
        this.burstCount = 0;
        this.burstMax = 2 + Math.floor(Math.random() * 4);
        this.burstPauseTimer = 0.35 + Math.random() * 0.4;
      }
    }
  }

  fireBullet(targetPos) {
    const muzzle = this.weaponMesh.getObjectByName('muzzle_point') || this.weaponMesh;
    const origin = new THREE.Vector3();
    muzzle.getWorldPosition(origin);

    const aimTarget = targetPos.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * 1.0,
      1.1 + (Math.random() - 0.5) * 0.7,
      (Math.random() - 0.5) * 1.0
    ));
    const dir = aimTarget.sub(origin).normalize();

    if (window.soundSystem) window.soundSystem.playGunshot(this.weaponKey, false);
    if (this.game && this.game.fireTracer) {
      this.game.fireTracer(origin, dir, this, this.weaponDef);
    }
  }

  startReload() {
    if (this.isReloading || this.magAmmo === this.weaponDef.magSize || this.reserveAmmo <= 0) return;
    this.isReloading = true;
    this.reloadTimer = this.weaponDef.reloadTime;
  }

  finishReload() {
    const needed = this.weaponDef.magSize - this.magAmmo;
    const amount = Math.min(needed, this.reserveAmmo);
    this.magAmmo += amount;
    this.reserveAmmo -= amount;
    this.isReloading = false;
  }

  moveToward(dest, step) {
    const dir = dest.clone().sub(this.mesh.position);
    dir.y = 0;
    if (dir.length() < 0.1) return false;

    dir.normalize();
    const targetRot = Math.atan2(dir.x, dir.z) + Math.PI;
    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetRot, 0.15);

    const nextPos = this.mesh.position.clone().add(dir.multiplyScalar(step));
    if (!this.arena.checkCollision(nextPos, 0.45)) {
      this.mesh.position.copy(nextPos);
      return true;
    }
    return false;
  }
}

window.BotController = BotController;
