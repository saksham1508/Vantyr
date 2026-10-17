/**
 * PROJECT FRONTLINE - UI Navigation, Armory, Battle Pass, Career Stats & HUD Manager
 */

class FrontlineApp {
  constructor() {
    this.currentScreen = 'boot';
    this.selectedMode = 'TDM';
    this.selectedMap = 'training';
    this.selectedWeapon = 'AR-47';
    this.selectedSkin = 'standard';
    this.selectedVisorColor = 0x38bdf8; // Default Cyan

    this.profile = this.loadProfile();

    this.canvas = document.getElementById('webgl-canvas');
    this.input = new InputController();
    this.game = new GameEngine(this.canvas, this.input);

    this.lobbyScene = null;
    this.lobbyCamera = null;
    this.lobbyOperator = null;
    this.lobbyWeapon = null;
    this.lobbyAnimFrame = null;

    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    this.initLobbyScene();
    this.bindUIEvents();
    this.updateProfileUI();
    this.applySettingsToInput();
  }

  loadProfile() {
    const defaultProfile = {
      level: 1,
      xp: 0,
      xpNext: 500,
      matchesPlayed: 0,
      matchesWon: 0,
      totalKills: 0,
      totalHeadshots: 0,
      totalDamage: 0,
      battlePassTier: 1,
      battlePassXP: 0,
      unlockedSkins: ['standard'],
      settings: {
        touchSensitivityX: 1.0,
        touchSensitivityY: 0.85,
        mouseSensitivity: 1.0,
        soundVolume: 0.85,
        musicVolume: 0.5,
        invertY: false,
        autoAim: true
      }
    };

    try {
      const saved = localStorage.getItem('frontline_profile_v2');
      if (saved) return Object.assign(defaultProfile, JSON.parse(saved));
    } catch (_) {}
    return defaultProfile;
  }

  saveProfile() {
    try {
      localStorage.setItem('frontline_profile_v2', JSON.stringify(this.profile));
    } catch (_) {}
  }

  applySettingsToInput() {
    const s = this.profile.settings;
    if (this.input) {
      this.input.touchSensitivityX = s.touchSensitivityX;
      this.input.touchSensitivityY = s.touchSensitivityY;
      this.input.mouseSensitivity = 0.0022 * s.mouseSensitivity;
      this.input.invertY = s.invertY;
      this.input.autoAimAssist = s.autoAim;
    }
    if (window.soundSystem) {
      window.soundSystem.setMasterVolume(s.soundVolume);
      window.soundSystem.setMusicVolume(s.musicVolume);
    }
  }

  initLobbyScene() {
    this.lobbyScene = new THREE.Scene();
    this.lobbyScene.background = new THREE.Color(0x0c1222);

    const w = (window.innerWidth && window.innerWidth > 0) ? window.innerWidth : 800;
    const h = (window.innerHeight && window.innerHeight > 0) ? window.innerHeight : 480;
    this.lobbyCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.lobbyCamera.position.set(0, 1.25, 3.2);
    this.lobbyCamera.lookAt(0, 1.0, 0);

    window.addEventListener('resize', () => {
      if (this.lobbyCamera && window.innerWidth > 0 && window.innerHeight > 0) {
        this.lobbyCamera.aspect = window.innerWidth / window.innerHeight;
        this.lobbyCamera.updateProjectionMatrix();
      }
    });

    const amb = new THREE.AmbientLight(0x38bdf8, 1.0);
    this.lobbyScene.add(amb);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(2, 4, 3);
    this.lobbyScene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00d2ff, 1.8);
    rimLight.position.set(-3, 2, -2);
    this.lobbyScene.add(rimLight);

    const podium = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.4, 0.2, 32),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 })
    );
    podium.position.y = -0.1;
    this.lobbyScene.add(podium);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.18, 1.25, 32),
      new THREE.MeshBasicMaterial({ color: 0x00d2ff, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    this.lobbyScene.add(ring);

    this.updateLobbyShowcase();
  }

  updateLobbyShowcase() {
    if (this.lobbyOperator) this.lobbyScene.remove(this.lobbyOperator);

    this.lobbyOperator = CharacterBuilder.createOperator({
      team: 'alpha',
      skin: this.selectedSkin,
      visorHue: this.selectedVisorColor,
      isPlayer: false
    });

    this.lobbyWeapon = WeaponModelBuilder.createWeaponModel(this.selectedWeapon, this.selectedSkin);
    const socket = this.lobbyOperator.userData.weaponSocket;
    if (socket) socket.add(this.lobbyWeapon);

    this.lobbyScene.add(this.lobbyOperator);
  }

  animateLobby() {
    if (this.currentScreen !== 'lobby' && this.currentScreen !== 'loadout' && this.currentScreen !== 'battlepass') return;
    this.lobbyAnimFrame = requestAnimationFrame(() => this.animateLobby());

    const time = Date.now() * 0.001;
    if (this.lobbyOperator) {
      this.lobbyOperator.rotation.y = time * 0.45;
      CharacterBuilder.animateOperator(this.lobbyOperator, 0.016, {
        isMoving: false, isSprinting: false, isCrouching: false, isADS: false
      });
    }

    if (this.game && this.game.renderer) {
      this.game.renderer.render(this.lobbyScene, this.lobbyCamera);
    }
  }

  switchScreen(screenName) {
    this.currentScreen = screenName;
    document.querySelectorAll('.screen-container').forEach(el => el.classList.remove('active'));

    const targetEl = document.getElementById(`screen-${screenName}`);
    if (targetEl) targetEl.classList.add('active');

    if (screenName === 'lobby' || screenName === 'loadout' || screenName === 'battlepass') {
      this.updateLobbyShowcase();
      cancelAnimationFrame(this.lobbyAnimFrame);
      this.animateLobby();
    } else {
      cancelAnimationFrame(this.lobbyAnimFrame);
    }

    if (screenName === 'game') {
      document.getElementById('hud-container').classList.add('active');
      document.getElementById('touch-controls-layer').classList.add('active');
      this.startMinimapLoop();
    } else {
      document.getElementById('hud-container').classList.remove('active');
      document.getElementById('touch-controls-layer').classList.remove('active');
      if (window.soundSystem) window.soundSystem.stopCombatMusic();
    }
  }

  bindUIEvents() {
    document.getElementById('btn-boot-start')?.addEventListener('click', () => {
      if (window.soundSystem) window.soundSystem.initAudio();
      this.switchScreen('lobby');
    });

    document.getElementById('btn-lobby-deploy')?.addEventListener('click', () => {
      if (window.soundSystem) window.soundSystem.playUIClick();
      this.startMatch();
    });

    // Mode Selector
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedMode = card.getAttribute('data-mode') || 'TDM';
        if (window.soundSystem) window.soundSystem.playUIClick();
      });
    });

    // Map Selector
    document.querySelectorAll('.map-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedMap = card.getAttribute('data-map') || 'training';
        if (window.soundSystem) window.soundSystem.playUIClick();
      });
    });

    // Navigation Tabs
    document.getElementById('btn-nav-loadout')?.addEventListener('click', () => {
      if (window.soundSystem) window.soundSystem.playUIClick();
      this.switchScreen('loadout');
    });

    document.getElementById('btn-nav-pass')?.addEventListener('click', () => {
      if (window.soundSystem) window.soundSystem.playUIClick();
      this.renderBattlePass();
      this.switchScreen('battlepass');
    });

    document.getElementById('btn-nav-career')?.addEventListener('click', () => {
      if (window.soundSystem) window.soundSystem.playUIClick();
      this.renderCareerStats();
      document.getElementById('modal-career')?.classList.add('active');
    });
    document.getElementById('btn-close-career')?.addEventListener('click', () => {
      document.getElementById('modal-career')?.classList.remove('active');
    });

    document.getElementById('btn-loadout-back')?.addEventListener('click', () => {
      if (window.soundSystem) window.soundSystem.playUIClick();
      this.switchScreen('lobby');
    });
    document.getElementById('btn-pass-back')?.addEventListener('click', () => {
      if (window.soundSystem) window.soundSystem.playUIClick();
      this.switchScreen('lobby');
    });

    // Weapon Selection
    document.querySelectorAll('.weapon-select-card').forEach(wCard => {
      wCard.addEventListener('click', () => {
        document.querySelectorAll('.weapon-select-card').forEach(c => c.classList.remove('selected'));
        wCard.classList.add('selected');
        this.selectedWeapon = wCard.getAttribute('data-weapon') || 'AR-47';
        this.updateWeaponStatsDisplay(this.selectedWeapon);
        this.updateLobbyShowcase();
        if (window.soundSystem) window.soundSystem.playUIClick();
      });
    });

    // Camo Skins
    document.querySelectorAll('.skin-pill').forEach(sPill => {
      sPill.addEventListener('click', () => {
        const skinId = sPill.getAttribute('data-skin');
        const skinDef = WEAPON_SKINS[skinId];
        if (skinDef && this.profile.level < skinDef.levelReq) {
          alert(`Locked! Requires Operator Level ${skinDef.levelReq}`);
          return;
        }
        document.querySelectorAll('.skin-pill').forEach(c => c.classList.remove('selected'));
        sPill.classList.add('selected');
        this.selectedSkin = skinId;
        this.updateLobbyShowcase();
        if (window.soundSystem) window.soundSystem.playUIClick();
      });
    });

    // Visor Hue Color Selector
    document.querySelectorAll('.visor-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.visor-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        this.selectedVisorColor = parseInt(pill.getAttribute('data-color'), 16);
        this.updateLobbyShowcase();
        if (window.soundSystem) window.soundSystem.playUIClick();
      });
    });

    // Squad Radio Commands
    document.getElementById('btn-hud-squad')?.addEventListener('click', () => {
      const menu = document.getElementById('hud-squad-menu');
      menu.classList.toggle('active');
    });

    document.querySelectorAll('.squad-cmd-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-cmd');
        document.getElementById('hud-squad-menu')?.classList.remove('active');
        if (this.game) {
          this.game.bots.forEach(b => b.receiveSquadCommand(cmd, this.game.player.pos));
          this.addKillfeed({
            attacker: 'RADIO SQUAD',
            victim: `ORDER: ${cmd}`,
            weapon: 'COMMS',
            isHeadshot: false,
            isPlayerKill: true
          });
        }
        if (window.soundSystem) window.soundSystem.playReloadStage(2);
      });
    });

    // Settings
    document.getElementById('btn-nav-settings')?.addEventListener('click', () => {
      document.getElementById('modal-settings')?.classList.add('active');
      if (window.soundSystem) window.soundSystem.playUIClick();
    });
    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      document.getElementById('modal-settings')?.classList.remove('active');
      this.saveProfile();
      this.applySettingsToInput();
      if (window.soundSystem) window.soundSystem.playUIClick();
    });

    document.getElementById('slider-touch-sens')?.addEventListener('input', (e) => {
      this.profile.settings.touchSensitivityX = parseFloat(e.target.value);
      this.profile.settings.touchSensitivityY = parseFloat(e.target.value) * 0.85;
      this.applySettingsToInput();
    });

    document.getElementById('slider-audio-vol')?.addEventListener('input', (e) => {
      this.profile.settings.soundVolume = parseFloat(e.target.value);
      this.applySettingsToInput();
    });

    document.getElementById('slider-music-vol')?.addEventListener('input', (e) => {
      this.profile.settings.musicVolume = parseFloat(e.target.value);
      this.applySettingsToInput();
    });

    document.getElementById('btn-hud-pause')?.addEventListener('click', () => this.togglePauseMenu());
    document.getElementById('btn-resume-game')?.addEventListener('click', () => this.togglePauseMenu(false));
    document.getElementById('btn-quit-match')?.addEventListener('click', () => {
      if (this.game) this.game.running = false;
      this.togglePauseMenu(false);
      this.switchScreen('lobby');
    });

    document.getElementById('btn-results-playagain')?.addEventListener('click', () => {
      if (window.soundSystem) window.soundSystem.playUIClick();
      this.startMatch();
    });
    document.getElementById('btn-results-lobby')?.addEventListener('click', () => {
      if (window.soundSystem) window.soundSystem.playUIClick();
      this.switchScreen('lobby');
    });

    document.getElementById('btn-hud-scoreboard')?.addEventListener('click', () => {
      const modal = document.getElementById('modal-scoreboard');
      modal.classList.toggle('active');
      if (modal.classList.contains('active')) this.renderScoreboard();
    });
    document.getElementById('btn-close-scoreboard')?.addEventListener('click', () => {
      document.getElementById('modal-scoreboard')?.classList.remove('active');
    });
  }

  updateProfileUI() {
    const p = this.profile;
    const lvlEl = document.getElementById('lobby-player-level');
    const xpBar = document.getElementById('lobby-xp-progress');
    const xpText = document.getElementById('lobby-xp-text');

    if (lvlEl) lvlEl.innerText = `LEVEL ${p.level}`;
    if (xpBar) xpBar.style.width = `${Math.min(100, (p.xp / p.xpNext) * 100)}%`;
    if (xpText) xpText.innerText = `${p.xp} / ${p.xpNext} XP`;

    document.querySelectorAll('.skin-pill').forEach(pill => {
      const skinId = pill.getAttribute('data-skin');
      const def = WEAPON_SKINS[skinId];
      if (def && p.level < def.levelReq) pill.classList.add('locked');
      else pill.classList.remove('locked');
    });
  }

  updateWeaponStatsDisplay(weaponKey) {
    const def = WEAPON_DEFINITIONS[weaponKey];
    if (!def) return;

    document.getElementById('stat-bar-damage').style.width = `${Math.min(100, (def.damage * (def.pellets || 1) / 100) * 100)}%`;
    document.getElementById('stat-bar-fire-rate').style.width = `${(def.fireRate / 1000) * 100}%`;
    document.getElementById('stat-bar-accuracy').style.width = `${((0.05 / def.spreadBase) * 20)}%`;
    document.getElementById('stat-bar-range').style.width = `${(def.range / 220) * 100}%`;
    document.getElementById('weapon-desc').innerText = def.desc;
  }

  startMatch() {
    this.switchScreen('game');
    this.game.currentSkin = this.selectedSkin;
    this.game.equipWeapon(this.selectedWeapon);
    this.game.startMatch(this.selectedMode, this.selectedMap);
  }

  togglePauseMenu(show) {
    const modal = document.getElementById('modal-pause');
    if (!modal) return;
    if (show === undefined) modal.classList.toggle('active');
    else if (show) modal.classList.add('active');
    else modal.classList.remove('active');
  }

  toggleScoreboard(show) {
    const modal = document.getElementById('modal-scoreboard');
    if (!modal) return;
    if (show) {
      modal.classList.add('active');
      this.renderScoreboard();
    } else {
      modal.classList.remove('active');
    }
  }

  toggleSniperScope(active) {
    const scopeEl = document.getElementById('hud-sniper-scope');
    if (!scopeEl) return;
    if (active) scopeEl.classList.add('active');
    else scopeEl.classList.remove('active');
  }

  renderScoreboard() {
    const alphaContainer = document.getElementById('scoreboard-alpha-rows');
    const omegaContainer = document.getElementById('scoreboard-omega-rows');
    if (!alphaContainer || !omegaContainer) return;
    alphaContainer.innerHTML = '';
    omegaContainer.innerHTML = '';

    const p = this.game.player;
    alphaContainer.innerHTML += `
      <div class="score-row player-row">
        <span class="score-name">${p.name} (YOU)</span>
        <span class="score-k">${p.kills}</span>
        <span class="score-d">${p.deaths}</span>
        <span class="score-a">${p.assists}</span>
        <span class="score-pts">${p.kills * 100 + p.damageDealt * 0.1}</span>
      </div>
    `;

    this.game.bots.forEach(b => {
      const row = `
        <div class="score-row">
          <span class="score-name">${b.name}</span>
          <span class="score-k">${Math.floor(Math.random() * 5)}</span>
          <span class="score-d">${b.isDead ? 1 : 0}</span>
          <span class="score-a">${Math.floor(Math.random() * 3)}</span>
          <span class="score-pts">${Math.floor(Math.random() * 400)}</span>
        </div>
      `;
      if (b.team === 'alpha') alphaContainer.innerHTML += row;
      else omegaContainer.innerHTML += row;
    });
  }

  renderCareerStats() {
    const p = this.profile;
    const kd = p.deaths > 0 ? (p.totalKills / p.deaths).toFixed(2) : p.totalKills.toFixed(2);
    const winRate = p.matchesPlayed > 0 ? Math.round((p.matchesWon / p.matchesPlayed) * 100) : 0;

    document.getElementById('stat-career-matches').innerText = p.matchesPlayed;
    document.getElementById('stat-career-wins').innerText = `${winRate}%`;
    document.getElementById('stat-career-kills').innerText = p.totalKills;
    document.getElementById('stat-career-kd').innerText = kd;
    document.getElementById('stat-career-headshots').innerText = p.totalHeadshots;
    document.getElementById('stat-career-level').innerText = `LVL ${p.level}`;
  }

  renderBattlePass() {
    const container = document.getElementById('battlepass-track');
    if (!container) return;
    container.innerHTML = '';

    const rewards = [
      { tier: 1, name: 'Standard Uniform', free: true },
      { tier: 2, name: 'Desert Camo AR-47', free: true },
      { tier: 3, name: 'Cyan Visor HUD', free: true },
      { tier: 4, name: '500 Combat Credits', free: false },
      { tier: 5, name: 'Urban Camo SMG-9', free: true },
      { tier: 6, name: 'Crimson Visor Glow', free: false },
      { tier: 7, name: 'Carbon Fiber Finish', free: true },
      { tier: 8, name: 'Tactical Holo Sight', free: false },
      { tier: 9, name: 'Smoke Grenade Skin', free: true },
      { tier: 10, name: 'Crimson Fury SR-50', free: true },
      { tier: 15, name: 'Frontline Gold Camo', free: false }
    ];

    rewards.forEach(r => {
      const unlocked = this.profile.level >= r.tier;
      container.innerHTML += `
        <div class="bp-tier-card ${unlocked ? 'unlocked' : ''}">
          <div class="bp-tier-header">TIER ${r.tier} ${r.free ? '(FREE)' : '(PREMIUM)'}</div>
          <div class="bp-reward-name">${r.name}</div>
          <div class="bp-status">${unlocked ? 'CLAIMED ✓' : `REQ LVL ${r.tier}`}</div>
        </div>
      `;
    });
  }

  updatePlayerHUD({ health, maxHealth, shield, maxShield, grenades, killstreak }) {
    document.getElementById('hud-health-bar').style.width = `${(health / maxHealth) * 100}%`;
    document.getElementById('hud-health-text').innerText = `${health}`;
    document.getElementById('hud-shield-bar').style.width = `${(shield / maxShield) * 100}%`;
    document.getElementById('hud-shield-text').innerText = `${shield}`;

    const nadeBadge = document.getElementById('hud-grenades-count');
    if (nadeBadge) nadeBadge.innerText = `x${grenades}`;

    const ksBadge = document.getElementById('hud-killstreak-count');
    if (ksBadge) {
      ksBadge.innerText = `${killstreak}/7`;
      if (killstreak >= 3) ksBadge.parentElement.classList.add('ready');
      else ksBadge.parentElement.classList.remove('ready');
    }
  }

  updateWeaponHUD({ weaponKey, magAmmo, reserveAmmo, isReloading }) {
    document.getElementById('hud-weapon-name').innerText = weaponKey;
    const ammoEl = document.getElementById('hud-ammo-counter');
    if (isReloading) {
      ammoEl.innerText = 'RELOADING...';
      ammoEl.style.color = '#f59e0b';
    } else {
      ammoEl.innerText = `${magAmmo} / ${reserveAmmo}`;
      ammoEl.style.color = magAmmo <= 5 ? '#ef4444' : '#ffffff';
    }
  }

  startReloadProgress(durationMs) {
    const circle = document.getElementById('reload-radial-progress');
    if (!circle) return;
    circle.style.transition = 'none';
    circle.style.strokeDashoffset = '100';
    requestAnimationFrame(() => {
      circle.style.transition = `stroke-dashoffset ${durationMs}ms linear`;
      circle.style.strokeDashoffset = '0';
    });
  }

  updateMatchHUD({ timer, alphaScore, omegaScore }) {
    const mins = Math.floor(timer / 60);
    const secs = timer % 60;
    document.getElementById('hud-match-timer').innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    document.getElementById('hud-score-alpha').innerText = alphaScore;
    document.getElementById('hud-score-omega').innerText = omegaScore;
  }

  showHitmarker(isHeadshot) {
    const hm = document.getElementById('hud-hitmarker');
    if (!hm) return;
    hm.className = 'hitmarker active ' + (isHeadshot ? 'headshot' : 'body');
    setTimeout(() => hm.classList.remove('active'), 120);
  }

  showDamageIndicator(angle) {
    const ind = document.getElementById('hud-damage-indicator');
    if (!ind) return;
    ind.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
    ind.classList.add('active');
    setTimeout(() => ind.classList.remove('active'), 350);
  }

  addKillfeed({ attacker, victim, weapon, isHeadshot, isPlayerKill, isPlayerDeath }) {
    const feed = document.getElementById('hud-killfeed');
    if (!feed) return;

    const item = document.createElement('div');
    item.className = 'killfeed-item ' + (isPlayerKill ? 'player-kill' : (isPlayerDeath ? 'player-death' : ''));
    item.innerHTML = `
      <span class="kf-attacker">${attacker}</span>
      <span class="kf-weapon">[${weapon}]</span>
      ${isHeadshot ? '<span class="kf-hs">🎯</span>' : ''}
      <span class="kf-victim">${victim}</span>
    `;

    feed.appendChild(item);
    setTimeout(() => {
      item.classList.add('fade-out');
      setTimeout(() => item.remove(), 400);
    }, 4500);
  }

  startMinimapLoop() {
    const draw = () => {
      if (this.currentScreen !== 'game') return;
      this.renderMinimap();
      requestAnimationFrame(draw);
    };
    draw();
  }

  renderMinimap() {
    if (!this.minimapCtx || !this.game || !this.game.arena) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const mapScale = w / 120;
    const toMapX = (worldX) => (worldX + 60) * mapScale;
    const toMapY = (worldZ) => (worldZ + 60) * mapScale;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#334155';
    this.game.arena.colliders.forEach(c => {
      const min = c.box.min;
      const max = c.box.max;
      const rx = toMapX(min.x);
      const ry = toMapY(min.z);
      const rw = (max.x - min.x) * mapScale;
      const rh = (max.z - min.z) * mapScale;
      ctx.fillRect(rx, ry, Math.max(2, rw), Math.max(2, rh));
    });

    this.game.arena.pickups.forEach(p => {
      if (p.active) {
        ctx.fillStyle = p.type === 'health' ? '#10b981' : '#00d2ff';
        ctx.beginPath();
        ctx.arc(toMapX(p.initialPos.x), toMapY(p.initialPos.z), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Bots (UAV reveal or standard squad visibility)
    const isUAV = this.game.uavActiveTimer > 0;
    this.game.bots.forEach(b => {
      if (!b.isDead) {
        if (b.team === 'alpha' || isUAV || this.game.player.pos.distanceTo(b.mesh.position) < 30) {
          const bx = toMapX(b.mesh.position.x);
          const by = toMapY(b.mesh.position.z);
          ctx.fillStyle = b.team === 'alpha' ? '#38bdf8' : '#ef4444';
          ctx.beginPath();
          ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });

    // Player
    const px = toMapX(this.game.player.pos.x);
    const py = toMapY(this.game.player.pos.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(this.game.yaw);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 4);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  showMatchResults(data) {
    this.switchScreen('results');

    this.profile.matchesPlayed++;
    if (data.isVictory) this.profile.matchesWon++;
    this.profile.totalKills += data.kills;
    this.profile.totalHeadshots += data.headshots;

    this.profile.xp += data.earnedXP;
    let leveledUp = false;
    while (this.profile.xp >= this.profile.xpNext) {
      this.profile.xp -= this.profile.xpNext;
      this.profile.level++;
      this.profile.xpNext = Math.floor(this.profile.xpNext * 1.35);
      leveledUp = true;
    }
    this.saveProfile();
    this.updateProfileUI();

    const titleEl = document.getElementById('results-outcome-title');
    if (titleEl) {
      titleEl.innerText = data.isVictory ? 'TACTICAL VICTORY' : 'MISSION DEFEAT';
      titleEl.className = 'results-title ' + (data.isVictory ? 'victory' : 'defeat');
    }

    document.getElementById('res-kills').innerText = data.kills;
    document.getElementById('res-deaths').innerText = data.deaths;
    document.getElementById('res-damage').innerText = data.damage;
    document.getElementById('res-acc').innerText = `${data.accuracy}%`;
    document.getElementById('res-xp').innerText = `+${data.earnedXP} XP`;

    const unlockBanner = document.getElementById('results-unlock-banner');
    if (unlockBanner) {
      if (leveledUp) {
        unlockBanner.style.display = 'block';
        unlockBanner.innerText = `LEVEL UP! REACHED LEVEL ${this.profile.level}! CHECK BATTLE PASS & ARMORY.`;
      } else {
        unlockBanner.style.display = 'none';
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new FrontlineApp();
});
