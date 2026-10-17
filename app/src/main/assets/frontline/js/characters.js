/**
 * PROJECT FRONTLINE - Procedural 3D Character Rigging & Animation
 * Low-poly tactical military operators with customizable visor hues, camo uniforms,
 * grenade throwing poses, and hit flinch physics.
 */

class CharacterBuilder {
  static createOperator({ team = 'alpha', skin = 'standard', visorHue = null, isPlayer = false }) {
    const root = new THREE.Group();
    root.name = `operator_${team}`;

    const isAlpha = team === 'alpha';
    let armorColor = isAlpha ? 0x1e293b : 0x27272a;
    let suitColor = isAlpha ? 0x0f172a : 0x18181b;
    let accentColor = isAlpha ? 0x00d2ff : 0xff3b30;
    let visorColor = visorHue || (isAlpha ? 0x38bdf8 : 0xf97316);

    if (skin === 'desert') {
      armorColor = 0xa88350;
      suitColor = 0x785a30;
    } else if (skin === 'urban') {
      armorColor = 0x475569;
      suitColor = 0x334155;
    } else if (skin === 'carbon') {
      armorColor = 0x111827;
      suitColor = 0x030712;
      accentColor = 0xf59e0b;
    } else if (skin === 'gold') {
      armorColor = 0xd4af37;
      accentColor = 0xffffff;
    }

    const suitMat = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.8, metalness: 0.2 });
    const armorMat = new THREE.MeshStandardMaterial({ color: armorColor, roughness: 0.5, metalness: 0.5 });
    const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.3, metalness: 0.4 });
    const visorMat = new THREE.MeshStandardMaterial({
      color: visorColor,
      emissive: visorColor,
      emissiveIntensity: 0.85,
      roughness: 0.1,
      metalness: 0.9
    });

    const hips = new THREE.Group();
    hips.position.y = 0.95;
    root.add(hips);

    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.24), armorMat);
    pelvis.castShadow = true;
    hips.add(pelvis);

    const spine = new THREE.Group();
    spine.position.y = 0.15;
    hips.add(spine);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.28), armorMat);
    chest.position.y = 0.2;
    chest.castShadow = true;
    spine.add(chest);

    // Tactical pouches
    const pouch1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.08), suitMat);
    pouch1.position.set(-0.11, 0.16, 0.17);
    spine.add(pouch1);
    const pouch2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.08), suitMat);
    pouch2.position.set(0.11, 0.16, 0.17);
    spine.add(pouch2);

    // Team patch
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), accentMat);
    patch.position.set(0, 0.28, 0.145);
    spine.add(patch);

    // Head
    const headPivot = new THREE.Group();
    headPivot.position.y = 0.42;
    spine.add(headPivot);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 8), suitMat);
    neck.position.y = 0.04;
    headPivot.add(neck);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), armorMat);
    helmet.scale.set(1, 1.15, 1.1);
    helmet.position.set(0, 0.18, 0);
    helmet.castShadow = true;
    headPivot.add(helmet);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.12), visorMat);
    visor.position.set(0, 0.17, 0.16);
    headPivot.add(visor);

    // Shoulders
    const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.16), armorMat);
    shoulderL.position.set(-0.27, 0.32, 0);
    spine.add(shoulderL);
    const shoulderR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.16), armorMat);
    shoulderR.position.set(0.27, 0.32, 0);
    spine.add(shoulderR);

    // Arms
    const armLPivot = new THREE.Group();
    armLPivot.position.set(-0.24, 0.3, 0);
    spine.add(armLPivot);
    const upperArmL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.12), suitMat);
    upperArmL.position.y = -0.12;
    armLPivot.add(upperArmL);
    const forearmLPivot = new THREE.Group();
    forearmLPivot.position.y = -0.24;
    armLPivot.add(forearmLPivot);
    const forearmL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.24, 0.1), suitMat);
    forearmL.position.y = -0.1;
    forearmLPivot.add(forearmL);

    const armRPivot = new THREE.Group();
    armRPivot.position.set(0.24, 0.3, 0);
    spine.add(armRPivot);
    const upperArmR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.12), suitMat);
    upperArmR.position.y = -0.12;
    armRPivot.add(upperArmR);
    const forearmRPivot = new THREE.Group();
    forearmRPivot.position.y = -0.24;
    armRPivot.add(forearmRPivot);
    const forearmR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.24, 0.1), suitMat);
    forearmR.position.y = -0.1;
    forearmRPivot.add(forearmR);

    // Weapon socket
    const weaponSocket = new THREE.Group();
    weaponSocket.name = 'weapon_socket';
    weaponSocket.position.set(0, -0.22, 0.05);
    forearmRPivot.add(weaponSocket);

    // Legs
    const legLPivot = new THREE.Group();
    legLPivot.position.set(-0.11, -0.05, 0);
    hips.add(legLPivot);
    const thighL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.16), suitMat);
    thighL.position.y = -0.18;
    thighL.castShadow = true;
    legLPivot.add(thighL);
    const kneeLPivot = new THREE.Group();
    kneeLPivot.position.y = -0.36;
    legLPivot.add(kneeLPivot);
    const shinL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.36, 0.14), suitMat);
    shinL.position.y = -0.18;
    shinL.castShadow = true;
    kneeLPivot.add(shinL);
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.22), armorMat);
    bootL.position.set(0, -0.35, 0.04);
    kneeLPivot.add(bootL);

    const legRPivot = new THREE.Group();
    legRPivot.position.set(0.11, -0.05, 0);
    hips.add(legRPivot);
    const thighR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.16), suitMat);
    thighR.position.y = -0.18;
    thighR.castShadow = true;
    legRPivot.add(thighR);
    const kneeRPivot = new THREE.Group();
    kneeRPivot.position.y = -0.36;
    legRPivot.add(kneeRPivot);
    const shinR = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.36, 0.14), suitMat);
    shinR.position.y = -0.18;
    shinR.castShadow = true;
    kneeRPivot.add(shinR);
    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.22), armorMat);
    bootR.position.set(0, -0.35, 0.04);
    kneeRPivot.add(bootR);

    // Hitboxes
    const headHitbox = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    headHitbox.position.set(0, 1.62, 0);
    headHitbox.name = 'hitbox_head';
    root.add(headHitbox);

    const bodyHitbox = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    bodyHitbox.position.set(0, 1.05, 0);
    bodyHitbox.name = 'hitbox_body';
    root.add(bodyHitbox);

    root.userData = {
      team,
      hips,
      spine,
      headPivot,
      armLPivot,
      armRPivot,
      forearmLPivot,
      forearmRPivot,
      legLPivot,
      legRPivot,
      kneeLPivot,
      kneeRPivot,
      weaponSocket,
      headHitbox,
      bodyHitbox,
      animTime: 0,
      isDead: false,
      deathProgress: 0,
      flinchTime: 0,
      throwGrenadeTimer: 0
    };

    return root;
  }

  static animateOperator(operator, dt, state) {
    if (!operator || !operator.userData) return;
    const u = operator.userData;

    if (u.isDead) {
      u.deathProgress = Math.min(1.0, u.deathProgress + dt * 2.5);
      const ease = 1 - Math.pow(1 - u.deathProgress, 3);
      operator.rotation.x = -Math.PI / 2 * ease;
      operator.position.y = Math.max(0.1, operator.position.y - dt * 2.0);
      u.hips.position.y = 0.2 + (0.95 - 0.2) * (1 - ease);
      return;
    }

    u.animTime += dt * (state.isSprinting ? 12 : state.isMoving ? 8 : 2.5);

    const targetHipsY = state.isCrouching ? 0.55 : 0.95;
    u.hips.position.y += (targetHipsY - u.hips.position.y) * Math.min(1, dt * 10);
    u.spine.rotation.x = state.isCrouching ? 0.3 : 0.05;

    if (state.isMoving) {
      const stride = state.isSprinting ? 0.85 : 0.55;
      const legAngle = Math.sin(u.animTime) * stride;

      u.legLPivot.rotation.x = legAngle;
      u.legRPivot.rotation.x = -legAngle;
      u.kneeLPivot.rotation.x = legAngle > 0 ? legAngle * 0.9 : 0;
      u.kneeRPivot.rotation.x = -legAngle > 0 ? -legAngle * 0.9 : 0;

      u.hips.rotation.y = Math.sin(u.animTime * 0.5) * 0.08;
      u.hips.rotation.z = Math.cos(u.animTime) * 0.04;
    } else {
      u.legLPivot.rotation.x += (0 - u.legLPivot.rotation.x) * dt * 8;
      u.legRPivot.rotation.x += (0 - u.legRPivot.rotation.x) * dt * 8;
      u.kneeLPivot.rotation.x += (0 - u.kneeLPivot.rotation.x) * dt * 8;
      u.kneeRPivot.rotation.x += (0 - u.kneeRPivot.rotation.x) * dt * 8;
      u.hips.rotation.y = 0;
      u.hips.rotation.z = 0;

      const breath = Math.sin(u.animTime * 0.8) * 0.02;
      u.spine.position.y = 0.15 + breath;
    }

    if (u.throwGrenadeTimer > 0) {
      u.throwGrenadeTimer -= dt;
      // Overhand grenade windup and release
      u.armLPivot.rotation.set(-2.2, -0.2, 0.4);
      u.forearmLPivot.rotation.set(-0.5, 0, 0);
    } else if (state.isADS) {
      u.armRPivot.rotation.set(-1.42, 0.15, -0.05);
      u.armLPivot.rotation.set(-1.38, -0.25, 0.2);
    } else {
      u.armRPivot.rotation.set(-1.1, 0.3, -0.2);
      u.armLPivot.rotation.set(-1.0, -0.4, 0.4);
    }

    if (u.flinchTime > 0) {
      u.flinchTime -= dt;
      u.spine.rotation.x += 0.15;
      u.spine.rotation.z += 0.08;
    }
  }
}

window.CharacterBuilder = CharacterBuilder;
