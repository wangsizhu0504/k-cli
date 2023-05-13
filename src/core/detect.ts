import path from 'node:path'
import fs from 'node:fs'
import { findUp } from 'find-up'
import terminalLink from 'terminal-link'
import { execaCommand } from 'execa'
import prompts from 'prompts'
import { AGENTS, INSTALL_PAGE, LOCKS } from './enums'
import { cmdExists } from './util'
import type { Agent } from './enums'
import type { DetectOptions } from './type'

export async function detect({ autoInstall, cwd }: DetectOptions) {
  let agent: Agent | null = null
  const lockFilePath = await findUp(Object.keys(LOCKS), { cwd })
  // package.json path
  let packageJsonPath: string | undefined

  if (lockFilePath)
    packageJsonPath = path.resolve(lockFilePath, '../package.json')
  else packageJsonPath = await findUp('package.json', { cwd })

  if (packageJsonPath && fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

      // pnpm@6.0
      if (typeof pkg.packageManager === 'string') {
        const [name, version] = pkg.packageManager.split('@')

        // yarn 2.x ==> yarn@berry
        if (name === 'yarn' && parseInt(version) > 1)
          agent = 'yarn@berry'
        // pnpm6.x
        else if (name === 'pnpm' && parseInt(version) < 7)
          agent = 'pnpm@6'
        else if (name in AGENTS)
          agent = name
        else console.warn('[wi] 无法识别的包管理工具', pkg.packageManager)
      }
    } catch (error) {}
  }

  // 根据lockFile定位agent
  if (!agent && lockFilePath)
    agent = LOCKS[path.basename(lockFilePath)]

  // autoInstall:false，判断本地是否无环境，无则提示是否全局安装对应的环境
  if (agent && !cmdExists(agent.split('@')[0])) {
    if (!autoInstall) {
      console.warn(
        `[wi] Detected ${agent} but it doesn't seem to be installed.\n`,
      )

      if (process.env.CI)
        process.exit(1)

      const link = terminalLink(agent, INSTALL_PAGE[agent])

      const { tryInstall } = await prompts({
        name: 'tryInstall',
        type: 'confirm',
        message: `你希望全局安装 ${link} 吗?`,
      })
      if (!tryInstall)
        process.exit(1)
    }
    await execaCommand(`npm i -g ${agent}`, { stdio: 'inherit', cwd })
  }

  return agent
}
