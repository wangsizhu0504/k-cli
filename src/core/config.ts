import fs from 'node:fs'
import path from 'node:path'
import { findUp } from 'find-up'
import ini from 'ini'
import { LOCKS } from './enums'
import type { Agent } from './enums'

interface Config {
  currentAgent: Agent | 'prompt'
  globalAgent: Agent
}

const defaultConfig: Config = {
  currentAgent: 'prompt',
  globalAgent: 'npm',
}

const home = process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME
// 配置文件默认地址为 ~/.zirc
const defaultRCPath = path.join(home || '~/', '.wirc')
const customRCPath = process.env.WI_CONFIG_FILE

const rcPath = customRCPath || defaultRCPath

let config: Config | undefined

// 根据不同的配置文件定位 agent
export async function getConfig(): Promise<Config> {
  if (!config) {
    const result = (await findUp('package.json')) || ''
    let packageManager = ''

    // packageManager: pnpm@7.0.0
    if (result)
      packageManager = JSON.parse(fs.readFileSync(result, 'utf8')).packageManager ?? ''

    // parse agent/version
    const [, agent, version]
      = packageManager.match(
        new RegExp(`^(${Object.values(LOCKS).join('|')})@(\d).*?$`),
      ) || []

    // 最终改写默认agent 需要额外处理 yarn 2.x
    if (agent) {
      config = Object.assign({}, defaultConfig, {
        defaultAgent: (agent === 'yarn' && parseInt(version) > 1) ? 'yarn@berry' : agent,
      })
    }

    else if (!fs.existsSync(rcPath)) {
      config = defaultConfig
    } else {
      config = Object.assign({}, defaultConfig, ini.parse(fs.readFileSync(rcPath, 'utf-8')))
    }
  }
  return config
}

export async function getDefaultAgent() {
  const { currentAgent } = await getConfig()
  if (currentAgent === 'prompt' && process.env.CI)
    return 'npm'
  return currentAgent
}

export async function getGlobalAgent() {
  const { globalAgent } = await getConfig()
  return globalAgent
}
