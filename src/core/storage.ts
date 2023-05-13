import { existsSync, promises as fs } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'

export interface Storage {
  lastRunCommand?: string
}

let storage: Storage | undefined
const storageDir = resolve(tmpdir(), 'wi')
const storagePath = resolve(storageDir, '../_storage.json')

export async function loadStorage(fn?: (storage: Storage) => Promise<boolean> | boolean) {
  if (!storage)
    storage = existsSync(storagePath) ? (JSON.parse(await fs.readFile(storagePath, 'utf-8')) || {}) : {}

  if (fn) {
    if (await fn(storage!))
      await dump()
  }
  return storage
}

export async function dump() {
  if (storage) {
    if (!existsSync(storageDir))
      await fs.mkdir(storageDir, { recursive: true })
    await fs.writeFile(storagePath, JSON.stringify(storage), 'utf-8')
  }
}
