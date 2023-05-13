import { execSync } from 'node:child_process'
import os from 'node:os'
import fs from 'node:fs'
import { resolve } from 'node:path'

export function remove<T>(arr: T[], v: T) {
  const index = arr.indexOf(v)
  if (index >= 0)
    arr.splice(index, 1)

  return arr
}

export function exclude<T>(arr: T[], v: T) {
  return remove(arr.slice(), v)
}

export function cmdExists(cmd: string) {
  try {
    execSync(
      os.platform() === 'win32'
        ? `cmd /c "(help ${cmd} > nul || exit 0) && where ${cmd} > nul 2> nul"`
        : `command -v ${cmd}`,
    )
    return true
  } catch {
    return false
  }
}

export function getPackageJson(cwd = process.cwd()): any {
  const path = resolve(cwd, 'package.json')

  if (fs.existsSync(path)) {
    try {
      const raw = fs.readFileSync(path, 'utf-8')
      return JSON.parse(raw)
    } catch (error) {
      console.warn('package.json 读取失败!')
      process.exit(0)
    }
  }
}
