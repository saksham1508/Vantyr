/**
 * PROJECT FRONTLINE - Unified Input & Touch Controls
 * Multi-touch joystick, drag look, Fire, ADS, Reload, Jump, Crouch, Weapon Switch,
 * Grenade throw, Killstreak trigger, and Auto-Fire assistant.
 */

class InputController {
  constructor() {
    this.moveVector = new THREE.Vector2();
    this.lookDelta = new THREE.Vector2();
    this.isFiring = false;
    this.isADS = false;
    this.isCrouching = false;
    this.isJumping = false;
    this.isSprinting = false;
    this.reloadRequested = false;
    this.grenadeRequested = false;
    this.killstreakRequested = false;
    this.weaponSwitchRequested = null;
    this.autoAimAssist = true;
    this.autoFireEnabled = false;

    // Sensitivities
    this.touchSensitivityX = 1.0;
    this.touchSensitivityY = 0.85;
    this.mouseSensitivity = 0.0022;
    this.invertY = false;

    // Touch tracking
    this.joystickTouchId = null;
    this.lookTouchId = null;
    this.joystickOrigin = { x: 0, y: 0 };
    this.lastLookPos = { x: 0, y: 0 };

    this.keys = {};

    this.initDesktopEvents();
    this.initTouchEvents();
  }

  initDesktopEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyR') this.reloadRequested = true;
      if (e.code === 'KeyG') this.grenadeRequested = true;
      if (e.code === 'Digit4' || e.code === 'KeyK') this.killstreakRequested = true;
      if (e.code === 'KeyC') this.isCrouching = !this.isCrouching;
      if (e.code === 'Space') this.isJumping = true;
      if (e.code === 'Digit1') this.weaponSwitchRequested = 'AR-47';
      if (e.code === 'Digit2') this.weaponSwitchRequested = 'SMG-9';
      if (e.code === 'Digit3') this.weaponSwitchRequested = 'SR-50';
      if (e.code === 'Escape' && window.app) window.app.togglePauseMenu();
      if (e.code === 'Tab') {
        e.preventDefault();
        if (window.app) window.app.toggleScoreboard(true);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Space') this.isJumping = false;
      if (e.code === 'Tab' && window.app) window.app.toggleScoreboard(false);
    });

    const canvas = document.getElementById('webgl-canvas');
    if (canvas) {
      canvas.addEventListener('click', () => {
        if (window.app && window.app.currentScreen === 'game' && !document.pointerLockElement) {
          canvas.requestPointerLock?.();
        }
      });
    }

    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement) {
        this.lookDelta.x += e.movementX * this.mouseSensitivity;
        this.lookDelta.y += (this.invertY ? -1 : 1) * e.movementY * this.mouseSensitivity;
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (!document.pointerLockElement) return;
      if (e.button === 0) this.isFiring = true;
      if (e.button === 2) this.isADS = true;
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isFiring = false;
      if (e.button === 2) this.isADS = false;
    });

    document.addEventListener('contextmenu', (e) => {
      if (document.pointerLockElement) e.preventDefault();
    });
  }

  initTouchEvents() {
    const joyZone = document.getElementById('joystick-zone');
    const joyStick = document.getElementById('joystick-thumb');
    const joyBase = document.getElementById('joystick-base');
    const lookZone = document.getElementById('touch-look-zone');

    const btnFire = document.getElementById('btn-fire');
    const btnADS = document.getElementById('btn-ads');
    const btnReload = document.getElementById('btn-reload');
    const btnJump = document.getElementById('btn-jump');
    const btnCrouch = document.getElementById('btn-crouch');
    const btnSwitch = document.getElementById('btn-weapon-switch');
    const btnGrenade = document.getElementById('btn-grenade');
    const btnKillstreak = document.getElementById('btn-killstreak');

    if (btnFire) {
      btnFire.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.isFiring = true;
        btnFire.classList.add('active');
      }, { passive: false });

      btnFire.addEventListener('touchend', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.isFiring = false;
        btnFire.classList.remove('active');
      }, { passive: false });

      btnFire.addEventListener('touchcancel', () => {
        this.isFiring = false;
        btnFire.classList.remove('active');
      });
    }

    if (btnADS) {
      btnADS.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.isADS = !this.isADS;
        if (this.isADS) btnADS.classList.add('active');
        else btnADS.classList.remove('active');
      }, { passive: false });
    }

    if (btnReload) {
      btnReload.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.reloadRequested = true;
        btnReload.classList.add('active');
        setTimeout(() => btnReload.classList.remove('active'), 200);
      }, { passive: false });
    }

    if (btnGrenade) {
      btnGrenade.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.grenadeRequested = true;
        btnGrenade.classList.add('active');
        setTimeout(() => btnGrenade.classList.remove('active'), 250);
      }, { passive: false });
    }

    if (btnKillstreak) {
      btnKillstreak.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.killstreakRequested = true;
        btnKillstreak.classList.add('active');
        setTimeout(() => btnKillstreak.classList.remove('active'), 250);
      }, { passive: false });
    }

    if (btnJump) {
      btnJump.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.isJumping = true;
        btnJump.classList.add('active');
      }, { passive: false });

      btnJump.addEventListener('touchend', () => {
        this.isJumping = false;
        btnJump.classList.remove('active');
      });
    }

    if (btnCrouch) {
      btnCrouch.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.isCrouching = !this.isCrouching;
        if (this.isCrouching) btnCrouch.classList.add('active');
        else btnCrouch.classList.remove('active');
      }, { passive: false });
    }

    if (btnSwitch) {
      btnSwitch.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (window.app && window.app.game) window.app.game.cycleNextWeapon();
      }, { passive: false });
    }

    // Joystick
    if (joyZone) {
      const maxRadius = 45;
      joyZone.addEventListener('touchstart', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (this.joystickTouchId === null) {
            this.joystickTouchId = touch.identifier;
            const rect = joyZone.getBoundingClientRect();
            this.joystickOrigin = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
            if (joyBase) {
              joyBase.style.left = `${this.joystickOrigin.x}px`;
              joyBase.style.top = `${this.joystickOrigin.y}px`;
              joyBase.classList.add('visible');
            }
            break;
          }
        }
      }, { passive: true });

      joyZone.addEventListener('touchmove', (e) => {
        for (let i = 0; i < e.touches.length; i++) {
          const touch = e.touches[i];
          if (touch.identifier === this.joystickTouchId) {
            const rect = joyZone.getBoundingClientRect();
            const currX = touch.clientX - rect.left;
            const currY = touch.clientY - rect.top;
            let dx = currX - this.joystickOrigin.x;
            let dy = currY - this.joystickOrigin.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > maxRadius) {
              dx = (dx / dist) * maxRadius;
              dy = (dy / dist) * maxRadius;
            }
            if (joyStick) joyStick.style.transform = `translate(${dx}px, ${dy}px)`;
            this.moveVector.x = dx / maxRadius;
            this.moveVector.y = -dy / maxRadius;
            this.isSprinting = dist > maxRadius * 0.85;
            break;
          }
        }
      }, { passive: true });

      const resetJoy = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.joystickTouchId) {
            this.joystickTouchId = null;
            this.moveVector.set(0, 0);
            this.isSprinting = false;
            if (joyStick) joyStick.style.transform = 'translate(0px, 0px)';
            if (joyBase) joyBase.classList.remove('visible');
            break;
          }
        }
      };
      joyZone.addEventListener('touchend', resetJoy, { passive: true });
      joyZone.addEventListener('touchcancel', resetJoy, { passive: true });
    }

    // Look Zone
    if (lookZone) {
      lookZone.addEventListener('touchstart', (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (this.lookTouchId === null) {
            this.lookTouchId = touch.identifier;
            this.lastLookPos = { x: touch.clientX, y: touch.clientY };
            break;
          }
        }
      }, { passive: true });

      lookZone.addEventListener('touchmove', (e) => {
        for (let i = 0; i < e.touches.length; i++) {
          const touch = e.touches[i];
          if (touch.identifier === this.lookTouchId) {
            const dx = touch.clientX - this.lastLookPos.x;
            const dy = touch.clientY - this.lastLookPos.y;
            const sensX = 0.0035 * this.touchSensitivityX;
            const sensY = 0.0035 * this.touchSensitivityY;
            this.lookDelta.x += dx * sensX;
            this.lookDelta.y += (this.invertY ? -1 : 1) * dy * sensY;
            this.lastLookPos = { x: touch.clientX, y: touch.clientY };
            break;
          }
        }
      }, { passive: true });

      const resetLook = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.lookTouchId) {
            this.lookTouchId = null;
            break;
          }
        }
      };
      lookZone.addEventListener('touchend', resetLook, { passive: true });
      lookZone.addEventListener('touchcancel', resetLook, { passive: true });
    }
  }

  update(dt) {
    if (this.keys['KeyW'] || this.keys['ArrowUp']) this.moveVector.y = 1;
    else if (this.keys['KeyS'] || this.keys['ArrowDown']) this.moveVector.y = -1;
    else if (this.joystickTouchId === null) this.moveVector.y = 0;

    if (this.keys['KeyD'] || this.keys['ArrowRight']) this.moveVector.x = 1;
    else if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.moveVector.x = -1;
    else if (this.joystickTouchId === null) this.moveVector.x = 0;

    if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) this.isSprinting = true;
  }

  consumeLookDelta() {
    const delta = this.lookDelta.clone();
    this.lookDelta.set(0, 0);
    return delta;
  }
}

window.InputController = InputController;
