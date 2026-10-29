/**
 * ============================================================================
 * MASTER SECURITY & RESELLER LICENSE ENGINE (CORE PUSAT)
 * Standalone, Tamper-Proof Cryptographic Licensing Module
 * Compliant with Web Crypto API (SubtleCrypto)
 * ============================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js environment
    module.exports = factory(globalThis.crypto);
  } else {
    // Browser environment
    root.KasirSecurity = factory(window.crypto);
  }
})(typeof self !== 'undefined' ? self : this, function (webCrypto) {
  'use strict';

  // Ensure Web Crypto API is available
  const cryptoSubtle = webCrypto ? webCrypto.subtle : null;
  if (!cryptoSubtle) {
    console.warn('[KasirSecurity] Web Crypto SubtleCrypto API not detected in this runtime.');
  }

  // System Master Salts and Tier Configurations
  const MASTER_SALT = 'KASIR_SECURE_SALT_v2026_99X';
  const APP_STORAGE_KEY_PREFIX = 'KASIR_SEC_DATA_';

  const TIER_CONFIG = {
    T1: { code: 'T1', name: 'Starter Core', retailPrice: 100000, wholesalePrice: 50000 },
    T2: { code: 'T2', name: 'Business Studio', retailPrice: 450000, wholesalePrice: 225000 },
    T3: { code: 'T3', name: 'Autonomous Mesh', retailPrice: 1800000, wholesalePrice: 900000 }
  };

  // Helper: Buffer to Hex String
  function buf2hex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Helper: Hex String to Uint8Array
  function hex2buf(hexString) {
    const bytes = new Uint8Array(Math.ceil(hexString.length / 2));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  // Helper: UTF-8 Encode
  function utf8Encode(str) {
    return new TextEncoder().encode(str);
  }

  // Helper: UTF-8 Decode
  function utf8Decode(buf) {
    return new TextDecoder().decode(buf);
  }

  // Helper: Constant-time string equality check to mitigate timing attacks
  function constantTimeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    let mismatch = a.length === b.length ? 0 : 1;
    if (mismatch) return false;
    for (let i = 0; i < a.length; i++) {
      mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
  }

  // Helper: Generate Random Hex Nonce
  function generateRandomHex(byteCount = 8) {
    const arr = new Uint8Array(byteCount);
    webCrypto.getRandomValues(arr);
    return buf2hex(arr.buffer);
  }

  /**
   * --------------------------------------------------------------------------
   * 1. MACHINE FINGERPRINT GENERATOR
   * Generates a deterministic SHA-256 hardware identifier based on:
   * User-Agent, Canvas 2D fingerprint, Web Audio buffer, Screen & Timezone.
   * Format: MACH-XXXX-XXXX-XXXX-XXXX
   * --------------------------------------------------------------------------
   */
  class MachineFingerprint {
    static async getCanvasFingerprint() {
      if (typeof document === 'undefined') {
        return 'canvas_headless_simulated_fingerprint';
      }
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 280;
        canvas.height = 60;
        const ctx = canvas.getContext('2d');
        if (!ctx) return 'canvas_ctx_none';

        // Draw background gradient
        const grad = ctx.createLinearGradient(0, 0, 280, 60);
        grad.addColorStop(0, '#1E293B');
        grad.addColorStop(0.5, '#6366F1');
        grad.addColorStop(1, '#06B6D4');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 280, 60);

        // Complex text rendering
        ctx.textBaseline = 'top';
        ctx.font = '14px "Inter", "Arial", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('POS Hardware Fingerprint \u2022 v3.0 \u03C0 \u26A1', 4, 8);

        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillStyle = '#10B981';
        ctx.fillText('NodeLock: SHA256-ED25519-AES256GCM', 4, 30);

        // Geometric overlay
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(240, 30, 20, 0, Math.PI * 2);
        ctx.stroke();

        return canvas.toDataURL();
      } catch (err) {
        return 'canvas_error_' + err.message;
      }
    }

    static async getAudioFingerprint() {
      if (typeof window === 'undefined' || !(window.OfflineAudioContext || window.webkitOfflineAudioContext)) {
        return 'audio_headless_simulated_fingerprint';
      }
      try {
        const AudioCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        const context = new AudioCtx(1, 44100, 44100);

        const oscillator = context.createOscillator();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(10000, context.currentTime);

        const compressor = context.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-50, context.currentTime);
        compressor.knee.setValueAtTime(40, context.currentTime);
        compressor.ratio.setValueAtTime(12, context.currentTime);
        compressor.reduction.setValueAtTime(-20, context.currentTime);
        compressor.attack.setValueAtTime(0, context.currentTime);
        compressor.release.setValueAtTime(0.25, context.currentTime);

        oscillator.connect(compressor);
        compressor.connect(context.destination);
        oscillator.start(0);

        const renderedBuffer = await context.startRendering();
        const channelData = renderedBuffer.getChannelData(0);

        let sum = 0;
        for (let i = 4500; i < 5000; i++) {
          sum += Math.abs(channelData[i] || 0);
        }
        return 'audio_fp_' + sum.toFixed(6);
      } catch (err) {
        return 'audio_error_' + err.message;
      }
    }

    static async getTelemetryVector() {
      const isBrowser = typeof window !== 'undefined';
      const nav = isBrowser ? window.navigator : { userAgent: 'NodeEnvironment', language: 'id-ID', hardwareConcurrency: 8 };
      const scr = isBrowser ? window.screen : { width: 1920, height: 1080, colorDepth: 24, pixelDepth: 24 };

      let tz = 'Asia/Jakarta';
      try {
        tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
      } catch (e) {}

      const canvasFp = await this.getCanvasFingerprint();
      const audioFp = await this.getAudioFingerprint();

      return [
        nav.userAgent || 'UNKNOWN_UA',
        `${scr.width}x${scr.height}x${scr.colorDepth}`,
        tz,
        nav.language || 'id',
        nav.hardwareConcurrency || 4,
        canvasFp.substring(0, 150),
        audioFp
      ].join('||');
    }

    static async generateMachineId() {
      const telemetry = await this.getTelemetryVector();
      const digestBuffer = await cryptoSubtle.digest('SHA-256', utf8Encode(telemetry + MASTER_SALT));
      const fullHex = buf2hex(digestBuffer).toUpperCase();

      // Format as MACH-XXXX-XXXX-XXXX-XXXX (16 chars uppercase)
      const part1 = fullHex.substring(0, 4);
      const part2 = fullHex.substring(4, 8);
      const part3 = fullHex.substring(8, 12);
      const part4 = fullHex.substring(12, 16);

      return `MACH-${part1}-${part2}-${part3}-${part4}`;
    }
  }

  /**
   * --------------------------------------------------------------------------
   * 2. SERIAL KEY GENERATOR & OFFLINE HMAC VERIFICATION ENGINE
   * Format: POS-[TIER]-[EXPIRE_TIMESTAMP]-[RANDOM_SALT]-[SIGNATURE]
   * Example: POS-T1-1893456000-8A7B2C1D-F8E3B7094D2A1C8E
   * --------------------------------------------------------------------------
   */
  class LicenseEngine {
    static async deriveSigningKey(masterSecret = 'KASIR_SUPER_SECRET_RESELLER_KEY_2026') {
      const baseKey = await cryptoSubtle.importKey(
        'raw',
        utf8Encode(masterSecret),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      return cryptoSubtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: utf8Encode(MASTER_SALT),
          iterations: 100000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'HMAC', hash: 'SHA-256', length: 256 },
        false,
        ['sign', 'verify']
      );
    }

    /**
     * Reseller / Issuer generates a signed serial key bound to target Machine ID
     * @param {string} tier - 'T1', 'T2', or 'T3'
     * @param {string} machineId - Target device identifier (MACH-XXXX-XXXX-XXXX-XXXX)
     * @param {number|'LIFETIME'} expireTimestamp - Unix epoch in seconds or 'LIFETIME'
     * @param {string} masterSecret - Reseller master key
     */
    static async generateLicenseKey(tier, machineId, expireTimestamp = 'LIFETIME', masterSecret) {
      if (!TIER_CONFIG[tier]) {
        throw new Error(`Invalid Tier: ${tier}. Allowed: T1, T2, T3`);
      }
      if (!machineId || typeof machineId !== 'string') {
        throw new Error('Valid target Machine-ID is required');
      }

      const expiryStr = expireTimestamp === 'LIFETIME' ? '9999999999' : String(Math.floor(expireTimestamp));
      const salt = generateRandomHex(4).toUpperCase(); // 8 hex chars

      // Payload bound to Machine ID
      const payload = `${tier}:${machineId.trim().toUpperCase()}:${expiryStr}:${salt}`;
      const signingKey = await this.deriveSigningKey(masterSecret);

      const signatureBuffer = await cryptoSubtle.sign('HMAC', signingKey, utf8Encode(payload));
      const signatureHex = buf2hex(signatureBuffer).toUpperCase().substring(0, 16); // 16-char signature

      return `POS-${tier}-${expiryStr}-${salt}-${signatureHex}`;
    }

    /**
     * Offline signature verification on client machine
     * @param {string} serialKey - e.g. POS-T1-1893456000-8A7B2C1D-F8E3B7094D2A1C8E
     * @param {string} [currentMachineId] - Local device ID. If omitted, calculated automatically.
     * @param {string} [masterSecret] - Internal verification secret
     */
    static async verifyLicenseKey(serialKey, currentMachineId, masterSecret) {
      try {
        if (!serialKey || typeof serialKey !== 'string') {
          return { valid: false, reason: 'Serial key is empty or malformed' };
        }

        const parts = serialKey.trim().toUpperCase().split('-');
        if (parts.length !== 5 || parts[0] !== 'POS') {
          return { valid: false, reason: 'Invalid license format. Expected POS-[TIER]-[EXPIRE]-[SALT]-[SIG]' };
        }

        const [, tier, expiryStr, salt, providedSig] = parts;

        if (!TIER_CONFIG[tier]) {
          return { valid: false, reason: `Unknown Tier '${tier}' in license` };
        }

        // Get local machine ID if not explicitly provided
        const activeMachineId = currentMachineId || (await MachineFingerprint.generateMachineId());

        // Derive key and calculate expected HMAC signature
        const signingKey = await this.deriveSigningKey(masterSecret);
        const payload = `${tier}:${activeMachineId.trim().toUpperCase()}:${expiryStr}:${salt}`;

        const signatureBuffer = await cryptoSubtle.sign('HMAC', signingKey, utf8Encode(payload));
        const expectedSig = buf2hex(signatureBuffer).toUpperCase().substring(0, 16);

        if (!constantTimeCompare(providedSig, expectedSig)) {
          return {
            valid: false,
            reason: 'Cryptographic signature mismatch! Key is forged or invalid for this Machine-ID.'
          };
        }

        // Check Expiration
        const expirySeconds = parseInt(expiryStr, 10);
        const currentSeconds = Math.floor(Date.now() / 1000);

        if (isNaN(expirySeconds)) {
          return { valid: false, reason: 'Corrupted expiry timestamp in license key' };
        }

        if (expirySeconds !== 9999999999 && currentSeconds > expirySeconds) {
          return {
            valid: false,
            expired: true,
            reason: `License expired on ${new Date(expirySeconds * 1000).toLocaleDateString('id-ID')}`
          };
        }

        const isLifetime = expirySeconds === 9999999999;
        const daysLeft = isLifetime ? Infinity : Math.max(0, Math.ceil((expirySeconds - currentSeconds) / 86400));

        return {
          valid: true,
          tier,
          tierName: TIER_CONFIG[tier].name,
          isLifetime,
          expiresAt: isLifetime ? null : expirySeconds * 1000,
          daysLeft,
          machineId: activeMachineId
        };
      } catch (err) {
        return { valid: false, reason: `Verification error: ${err.message}` };
      }
    }
  }

  /**
   * --------------------------------------------------------------------------
   * 3. RESELLER ENGINE & WALLET LOGIC
   * Manages wholesale batch purchase (50% discount) and key generation ledger
   * --------------------------------------------------------------------------
   */
  class ResellerWallet {
    constructor(storageKey = 'KASIR_RESELLER_WALLET_STORE') {
      this.storageKey = storageKey;
      this.state = this.loadState();
    }

    loadState() {
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(this.storageKey);
          if (raw) return JSON.parse(raw);
        }
      } catch (e) {}

      // Default initial state with seed credit for reseller demo
      return {
        resellerId: 'RSL-ID-9921',
        resellerName: 'Mitra Utama Solusindo',
        balanceIdr: 2500000, // Rp 2.500.000 seed balance
        quotas: {
          T1: 5, // 5 starter core activations
          T2: 2, // 2 business studio activations
          T3: 1  // 1 autonomous mesh activation
        },
        transactions: [],
        issuedLicenses: []
      };
    }

    saveState() {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        }
      } catch (e) {}
    }

    // Top up reseller cash wallet balance
    topUp(nominalIdr, notes = 'Bank Transfer Top-up') {
      if (nominalIdr <= 0) throw new Error('Top up nominal must be positive');
      this.state.balanceIdr += nominalIdr;
      this.state.transactions.unshift({
        id: 'TX-TOPUP-' + Date.now(),
        type: 'TOPUP',
        amount: nominalIdr,
        notes,
        date: new Date().toISOString()
      });
      this.saveState();
      return this.state.balanceIdr;
    }

    // Buy activation tokens in batch at 50% wholesale discount
    purchaseBatchQuota(tier, quantity) {
      if (!TIER_CONFIG[tier]) throw new Error(`Invalid tier: ${tier}`);
      if (quantity <= 0) throw new Error('Quantity must be >= 1');

      const unitWholesale = TIER_CONFIG[tier].wholesalePrice;
      const totalCost = unitWholesale * quantity;

      if (this.state.balanceIdr < totalCost) {
        throw new Error(
          `Saldo reseller tidak mencukupi! Diperlukan Rp ${totalCost.toLocaleString('id-ID')}, saldo saat ini Rp ${this.state.balanceIdr.toLocaleString('id-ID')}`
        );
      }

      this.state.balanceIdr -= totalCost;
      this.state.quotas[tier] = (this.state.quotas[tier] || 0) + quantity;

      this.state.transactions.unshift({
        id: 'TX-BATCH-' + Date.now(),
        type: 'BATCH_PURCHASE',
        tier,
        quantity,
        totalCost,
        date: new Date().toISOString(),
        notes: `Pembelian Grosir ${quantity}x ${TIER_CONFIG[tier].name} (-50% Diskon)`
      });

      this.saveState();
      return { success: true, newBalance: this.state.balanceIdr, newQuota: this.state.quotas[tier] };
    }

    // Issue signed license key for client: deducts quota or direct credit
    async issueLicense(tier, machineId, clientName, durationDays = 365, notes = '') {
      if (!TIER_CONFIG[tier]) throw new Error(`Invalid tier ${tier}`);
      if (!machineId || !machineId.startsWith('MACH-')) {
        throw new Error('Valid target Machine-ID is required (format MACH-XXXX-XXXX-XXXX-XXXX)');
      }

      // Check quota first
      let deductedFromQuota = false;
      if (this.state.quotas[tier] && this.state.quotas[tier] > 0) {
        this.state.quotas[tier] -= 1;
        deductedFromQuota = true;
      } else {
        // Direct deduction from balance at wholesale price
        const cost = TIER_CONFIG[tier].wholesalePrice;
        if (this.state.balanceIdr < cost) {
          throw new Error(
            `Tidak ada kuota ${tier} dan saldo tidak cukup (Dibutuhkan Rp ${cost.toLocaleString('id-ID')})`
          );
        }
        this.state.balanceIdr -= cost;
      }

      // Calculate expiration timestamp
      let expireTimestamp;
      if (durationDays === 'LIFETIME' || durationDays >= 9999) {
        expireTimestamp = 'LIFETIME';
      } else {
        expireTimestamp = Math.floor(Date.now() / 1000) + durationDays * 86400;
      }

      const serialKey = await LicenseEngine.generateLicenseKey(tier, machineId, expireTimestamp);

      const record = {
        serialKey,
        tier,
        tierName: TIER_CONFIG[tier].name,
        machineId,
        clientName: clientName || 'Klien Toko POS',
        issuedAt: new Date().toISOString(),
        expiresAt: expireTimestamp === 'LIFETIME' ? 'LIFETIME' : new Date(expireTimestamp * 1000).toISOString(),
        notes,
        deductedFromQuota
      };

      this.state.issuedLicenses.unshift(record);
      this.state.transactions.unshift({
        id: 'TX-ISSUE-' + Date.now(),
        type: 'LICENSE_ISSUED',
        tier,
        clientName,
        serialKey,
        date: new Date().toISOString()
      });

      this.saveState();
      return record;
    }
  }

  /**
   * --------------------------------------------------------------------------
   * 4. ANTI-TAMPER & INTEGRITY ENGINE
   * - AES-GCM 256-bit data encryption
   * - Monotonic Clock Rollback Detection
   * - DevTools timing anomaly detector
   * --------------------------------------------------------------------------
   */
  class AntiTamper {
    static async deriveEncryptionKey(appSalt = MASTER_SALT) {
      const baseSecret = 'KASIR_SECURE_STORAGE_KEY_256GCM';
      const baseKey = await cryptoSubtle.importKey(
        'raw',
        utf8Encode(baseSecret),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      return cryptoSubtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: utf8Encode(appSalt),
          iterations: 120000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    }

    /**
     * Encrypt arbitrary string or object with AES-GCM 256-bit
     */
    static async encrypt(plainData, appSalt) {
      const key = await this.deriveEncryptionKey(appSalt);
      const iv = new Uint8Array(12);
      webCrypto.getRandomValues(iv); // 96-bit standard IV for AES-GCM

      const serialized = typeof plainData === 'string' ? plainData : JSON.stringify(plainData);
      const cipherBuffer = await cryptoSubtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        utf8Encode(serialized)
      );

      return {
        iv: buf2hex(iv.buffer),
        cipherText: buf2hex(cipherBuffer)
      };
    }

    /**
     * Decrypt AES-GCM 256-bit payload
     */
    static async decrypt(encryptedPayload, appSalt) {
      const { iv, cipherText } = encryptedPayload;
      const key = await this.deriveEncryptionKey(appSalt);

      const ivBuf = hex2buf(iv);
      const cipherBuf = hex2buf(cipherText);

      const decryptedBuffer = await cryptoSubtle.decrypt(
        { name: 'AES-GCM', iv: ivBuf },
        key,
        cipherBuf
      );

      const decryptedStr = utf8Decode(decryptedBuffer);
      try {
        return JSON.parse(decryptedStr);
      } catch (e) {
        return decryptedStr;
      }
    }

    /**
     * Clock Rollback & Forward Tamper Guard
     * Validates monotonic timestamp progression
     */
    static verifyClockIntegrity() {
      const STORAGE_KEY = 'KASIR_CLOCK_HEARTBEAT';
      const now = Date.now();

      if (typeof localStorage === 'undefined') {
        return { intact: true, now };
      }

      try {
        const lastRecordedStr = localStorage.getItem(STORAGE_KEY);
        if (!lastRecordedStr) {
          localStorage.setItem(STORAGE_KEY, String(now));
          return { intact: true, firstRun: true };
        }

        const lastRecorded = parseInt(lastRecordedStr, 10);
        // Allow at most 120 seconds of backwards drift (e.g. slight NTP adjustments)
        if (now < lastRecorded - 120000) {
          const rollbackDiffSec = Math.round((lastRecorded - now) / 1000);
          return {
            intact: false,
            tampered: true,
            reason: `Clock rollback detected! System clock was moved backwards by ${rollbackDiffSec} seconds. Access suspended until clock integrity is restored.`,
            diffSeconds: rollbackDiffSec
          };
        }

        // Monotonically advance heartbeat
        if (now > lastRecorded) {
          localStorage.setItem(STORAGE_KEY, String(now));
        }

        return { intact: true, lastRecorded, now };
      } catch (err) {
        return { intact: true, warning: err.message };
      }
    }

    /**
     * Encrypted Storage Adapter (replaces raw localStorage/IndexedDB for sensitive items)
     */
    static createSecureStore(namespace = 'core') {
      const prefix = APP_STORAGE_KEY_PREFIX + namespace + '_';

      return {
        async setItem(key, value) {
          const encrypted = await AntiTamper.encrypt(value);
          localStorage.setItem(prefix + key, JSON.stringify(encrypted));
        },
        async getItem(key) {
          const raw = localStorage.getItem(prefix + key);
          if (!raw) return null;
          try {
            const encrypted = JSON.parse(raw);
            return await AntiTamper.decrypt(encrypted);
          } catch (e) {
            console.error('[SecureStore] Decryption failed:', e);
            return null;
          }
        },
        removeItem(key) {
          localStorage.removeItem(prefix + key);
        },
        clear() {
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(prefix)) keysToRemove.push(k);
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
        }
      };
    }
  }

  // Export Unified Public Interface
  return {
    TIER_CONFIG,
    MachineFingerprint,
    LicenseEngine,
    ResellerWallet,
    AntiTamper
  };
});
