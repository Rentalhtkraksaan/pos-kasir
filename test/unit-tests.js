/**
 * ============================================================================
 * UNIT TEST SUITE: MASTER SECURITY & RESELLER LICENSE ENGINE
 * Execution compatible with Node.js and Browser environments
 * ============================================================================
 */

const KasirSecurity = typeof require !== 'undefined' ? require('../js/license-core.js') : window.KasirSecurity;

async function runUnitTests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      passed++;
      results.push({ name: testName, status: 'PASSED', details });
      console.log(` \x1b[32m✔ [PASS]\x1b[0m ${testName}`);
    } else {
      failed++;
      results.push({ name: testName, status: 'FAILED', details });
      console.error(` \x1b[31m✖ [FAIL]\x1b[0m ${testName} - ${details}`);
    }
  }

  console.log('\n============================================================');
  console.log(' RUNNING KASIR SECURITY & RESELLER ENGINE TEST SUITE');
  console.log('============================================================\n');

  try {
    // ------------------------------------------------------------------------
    // TEST GROUP 1: Machine Fingerprint Generation
    // ------------------------------------------------------------------------
    console.log('--- 1. Hardware Fingerprint Tests ---');
    const machineId1 = await KasirSecurity.MachineFingerprint.generateMachineId();
    const machineId2 = await KasirSecurity.MachineFingerprint.generateMachineId();

    assert(
      /^MACH-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(machineId1),
      'Machine ID matches canonical format MACH-XXXX-XXXX-XXXX-XXXX',
      `Generated: ${machineId1}`
    );

    assert(
      machineId1 === machineId2,
      'Machine ID is deterministic across multiple calls on same environment',
      `Call 1: ${machineId1} === Call 2: ${machineId2}`
    );

    // ------------------------------------------------------------------------
    // TEST GROUP 2: Serial Key Generation & Offline HMAC Verification
    // ------------------------------------------------------------------------
    console.log('\n--- 2. License Key Generation & Offline Verification Tests ---');
    const targetMachId = 'MACH-A1B2-C3D4-E5F6-7890';
    const otherMachId = 'MACH-9999-8888-7777-6666';

    // 2.1 Lifetime Key Generation
    const lifetimeKey = await KasirSecurity.LicenseEngine.generateLicenseKey('T1', targetMachId, 'LIFETIME');
    assert(
      lifetimeKey.startsWith('POS-T1-9999999999-'),
      'Lifetime key format starts with POS-T1-9999999999-',
      `Key: ${lifetimeKey}`
    );

    // 2.2 Valid Key Verification on Bound Machine
    const verifyValid = await KasirSecurity.LicenseEngine.verifyLicenseKey(lifetimeKey, targetMachId);
    assert(
      verifyValid.valid === true && verifyValid.tier === 'T1' && verifyValid.isLifetime === true,
      'Valid license succeeds on target Machine-ID',
      JSON.stringify(verifyValid)
    );

    // 2.3 Key Verification Fails on Different Machine-ID (Hardware Lock)
    const verifyWrongMachine = await KasirSecurity.LicenseEngine.verifyLicenseKey(lifetimeKey, otherMachId);
    assert(
      verifyWrongMachine.valid === false,
      'Hardware Lock rejects key on unapproved Machine-ID',
      `Reason: ${verifyWrongMachine.reason}`
    );

    // 2.4 Cryptographic Tamper Detection (Tampering Tier from T1 to T3)
    const tamperedTierKey = lifetimeKey.replace('POS-T1-', 'POS-T3-');
    const verifyTamperedTier = await KasirSecurity.LicenseEngine.verifyLicenseKey(tamperedTierKey, targetMachId);
    assert(
      verifyTamperedTier.valid === false,
      'Anti-Tamper rejects illegally modified Tier upgrade in key',
      `Reason: ${verifyTamperedTier.reason}`
    );

    // 2.5 Expired License Verification
    const pastTimestamp = Math.floor(Date.now() / 1000) - 86400 * 30; // 30 days ago
    const expiredKey = await KasirSecurity.LicenseEngine.generateLicenseKey('T2', targetMachId, pastTimestamp);
    const verifyExpired = await KasirSecurity.LicenseEngine.verifyLicenseKey(expiredKey, targetMachId);
    assert(
      verifyExpired.valid === false && verifyExpired.expired === true,
      'Expired key is correctly flagged as expired and revoked',
      `Reason: ${verifyExpired.reason}`
    );

    // ------------------------------------------------------------------------
    // TEST GROUP 3: Reseller Quota & Wholesale Discount Engine
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Reseller Quota & Wholesale Wallet Tests ---');
    const wallet = new KasirSecurity.ResellerWallet('TEST_WALLET_KEY_' + Date.now());

    // 3.1 50% Wholesale Discount Calculations Check
    const t1Wholesale = KasirSecurity.TIER_CONFIG.T1.wholesalePrice;
    const t1Retail = KasirSecurity.TIER_CONFIG.T1.retailPrice;
    assert(
      t1Wholesale === 50000 && t1Retail === 100000,
      'Tier 1 Wholesale is 50% discount (Rp 50.000 vs Rp 100.000 retail)'
    );

    // 10 Activations = Rp 500.000
    const batch10Cost = t1Wholesale * 10;
    assert(
      batch10Cost === 500000,
      'Batch of 10x Tier 1 Activations equals Rp 500.000'
    );

    // 3.2 Top-up Wallet Balance
    const startBalance = wallet.state.balanceIdr;
    wallet.topUp(1000000, 'Test Inflow');
    assert(
      wallet.state.balanceIdr === startBalance + 1000000,
      'Reseller wallet top-up increases balance properly',
      `New balance: Rp ${wallet.state.balanceIdr.toLocaleString('id-ID')}`
    );

    // 3.3 Batch Purchase Deducts Balance & Adds Quota
    const prevT1Quota = wallet.state.quotas.T1 || 0;
    const prevBal = wallet.state.balanceIdr;
    wallet.purchaseBatchQuota('T1', 10);
    assert(
      wallet.state.quotas.T1 === prevT1Quota + 10 && wallet.state.balanceIdr === prevBal - 500000,
      'Purchase batch 10x T1 deducts Rp 500.000 and increments T1 quota by 10'
    );

    // 3.4 Issue License Key Deducts Quota & Generates Valid Key
    const prevQuotaBeforeIssue = wallet.state.quotas.T1;
    const issuedRecord = await wallet.issueLicense('T1', targetMachId, 'Toko Berkah Mandiri', 365);
    assert(
      wallet.state.quotas.T1 === prevQuotaBeforeIssue - 1,
      'Issuing license decrements reseller quota by 1'
    );

    const verifyIssued = await KasirSecurity.LicenseEngine.verifyLicenseKey(issuedRecord.serialKey, targetMachId);
    assert(
      verifyIssued.valid === true && verifyIssued.tier === 'T1',
      'Serial key issued from Reseller Panel verifies successfully offline',
      issuedRecord.serialKey
    );

    // ------------------------------------------------------------------------
    // TEST GROUP 4: Anti-Tamper & AES-GCM 256-bit Encryption
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Anti-Tamper AES-GCM 256 & Clock Protection Tests ---');

    // 4.1 Encrypt and Decrypt Roundtrip
    const sensitivePayload = {
      storeName: 'Sinar Kencana POS',
      dailyProfit: 1450000,
      pinHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      secretSeed: 'SEC_891023'
    };

    const encrypted = await KasirSecurity.AntiTamper.encrypt(sensitivePayload);
    assert(
      typeof encrypted.cipherText === 'string' && encrypted.cipherText.length > 32 && encrypted.iv.length === 24,
      'AES-GCM 256 encryption produces hex ciphertext and 96-bit (24 hex) IV'
    );

    const decrypted = await KasirSecurity.AntiTamper.decrypt(encrypted);
    assert(
      decrypted.storeName === sensitivePayload.storeName && decrypted.dailyProfit === sensitivePayload.dailyProfit,
      'AES-GCM 256 decryption successfully recovers exact original data'
    );

    // 4.2 Tampered Ciphertext Authentication Tag Failure
    let tamperedCipher = encrypted.cipherText.substring(0, encrypted.cipherText.length - 4) + 'FFFF';
    let decryptFailed = false;
    try {
      await KasirSecurity.AntiTamper.decrypt({ iv: encrypted.iv, cipherText: tamperedCipher });
    } catch (e) {
      decryptFailed = true;
    }
    assert(
      decryptFailed === true,
      'AES-GCM rejects tampered ciphertext or altered tag (GCM authentication check)'
    );

    // 4.3 Monotonic Clock Rollback Detection Check
    const clockCheck = KasirSecurity.AntiTamper.verifyClockIntegrity();
    assert(
      clockCheck.intact === true,
      'Normal clock check passes without rollback flag'
    );

  } catch (globalErr) {
    failed++;
    console.error('Fatal Test Exception:', globalErr);
  }

  console.log('\n============================================================');
  console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (${results.length} total)`);
  console.log('============================================================\n');

  return { passed, failed, total: results.length, results };
}

// Run immediately if executed via Node CLI
if (typeof process !== 'undefined' && process.release && process.release.name === 'node') {
  runUnitTests().then(summary => {
    if (summary.failed > 0) process.exit(1);
  });
}

if (typeof window !== 'undefined') {
  window.runKasirSecurityUnitTests = runUnitTests;
}
