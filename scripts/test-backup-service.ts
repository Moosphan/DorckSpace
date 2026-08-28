import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createBackup, restoreBackup, validateBackup } from '../src/main/services/backup-service'

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), 'mydashboard-backup-source-'))
  const output = mkdtempSync(join(tmpdir(), 'mydashboard-backup-output-'))
  mkdirSync(join(root, 'database'), { recursive: true })
  mkdirSync(join(root, 'articles'), { recursive: true })
  mkdirSync(join(root, 'media', 'covers'), { recursive: true })
  writeFileSync(join(root, 'database', 'dashboard.db'), 'database-fixture')
  writeFileSync(join(root, 'articles', 'draft.md'), '# Draft')
  writeFileSync(join(root, 'media', 'covers', 'cover.txt'), 'cover')
  return { root, output }
}

test('creates a hashed backup and restores it round-trip', () => {
  const fixture = createFixture()
  const restoreRoot = mkdtempSync(join(tmpdir(), 'mydashboard-backup-restore-'))
  try {
    const backup = createBackup(fixture.root, fixture.output, { now: new Date('2026-08-28T12:00:00.000Z') })
    assert.equal(backup.manifest.formatVersion, 1)
    assert.equal(backup.manifest.createdAt, '2026-08-28T12:00:00.000Z')
    assert.deepEqual(
      backup.manifest.files.map((file) => file.path),
      ['articles/draft.md', 'database/dashboard.db', 'media/covers/cover.txt'],
    )
    assert.equal(validateBackup(backup.backupPath).files.length, 3)

    restoreBackup(backup.backupPath, restoreRoot)
    assert.equal(readFileSync(join(restoreRoot, 'database', 'dashboard.db'), 'utf8'), 'database-fixture')
    assert.equal(readFileSync(join(restoreRoot, 'articles', 'draft.md'), 'utf8'), '# Draft')
    assert.equal(readFileSync(join(restoreRoot, 'media', 'covers', 'cover.txt'), 'utf8'), 'cover')
  } finally {
    rmSync(fixture.root, { recursive: true, force: true })
    rmSync(fixture.output, { recursive: true, force: true })
    rmSync(restoreRoot, { recursive: true, force: true })
  }
})

test('rejects a backup when a payload hash no longer matches', () => {
  const fixture = createFixture()
  try {
    const backup = createBackup(fixture.root, fixture.output)
    writeFileSync(join(backup.backupPath, 'articles', 'draft.md'), 'tampered')
    assert.throws(() => validateBackup(backup.backupPath), /hash/i)
  } finally {
    rmSync(fixture.root, { recursive: true, force: true })
    rmSync(fixture.output, { recursive: true, force: true })
  }
})
