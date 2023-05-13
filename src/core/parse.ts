import prompts from 'prompts'
import type { Choice } from 'prompts'
import { version } from '../../package.json'
import { exclude, getPackageJson } from './util'
import type { Runner } from './type'
import { dump, loadStorage } from './storage'
import { AGENTS } from './enums'
import type { Agent, Command } from './enums'

export function getCommand(
  agent: Agent,
  command: Command,
  args: string[] = [],
) {
  if (!(agent in AGENTS))
    throw new Error(`暂不支持 agent "${agent}"`)

  const agentCommand = AGENTS[agent][command]

  // includes run
  if (typeof agentCommand === 'function')
    return agentCommand(args)

  if (!agentCommand)
    throw new Error(`命令 "${command}" 在 "${agent}" 暂不支持`)
  // replace {0}
  return agentCommand.replace('{0}', args.join(' ')).trim()
}

export const getNrCommand = <Runner>((agent, args) => {
  if (args.length === 0)
    args.push('start')

  return getCommand(agent, 'run', args)
})

/** 解析命令语句，并替换 */
export const parseWi = <Runner>((agent, args) => {
  if (args.length === 1 && args[0] === '-v') {
    console.log(`V${version}`)
    process.exit(1)
  }

  // wi -g iroiro
  if (args.includes('-g'))
    return getCommand(agent, 'global', exclude(args, '-g'))

  // wi --frozen
  if (args.includes('--frozen'))
    return getCommand(agent, 'frozen', exclude(args, '--frozen'))

  // wi
  if (args.length === 0 || args.every(i => i.startsWith('-')))
    return getCommand(agent, 'install', args)
  // wi @types/node -D ...
  return getCommand(agent, 'add', args)
})

export const parseWr = <Runner>(async (agent, args, ctx) => {
  const storage = (await loadStorage())!

  // wr -
  if (args[0] === '-') {
    if (!storage?.lastRunCommand) {
      console.error('Last command not found')
      process.exit(1)
    }
    args[0] = storage.lastRunCommand
  }

  // wr ,识别scripts，进入选择运行
  if (args.length === 0) {
    const pkg = getPackageJson(ctx?.cwd)
    const scripts = pkg.scripts || {}
    const names = Object.entries(scripts) as [string, string][]

    if (!names.length)
      return

    const choices: Choice[] = names
      .filter(item => !item[0].startsWith('?'))
      .map(([value, cmd]) => ({
        title: value,
        value,
        description: scripts[`?${value}`] || cmd,
      }))

    if (storage?.lastRunCommand) {
      const last = choices.find(i => i.value === storage.lastRunCommand)
      if (last)
        choices.unshift(last)
    }

    try {
      const { fn } = await prompts({
        name: 'fn',
        message: '请选择要运行的 script',
        type: 'autocomplete',
        choices,
      })

      if (!fn) return

      args.push(fn)
    } catch (error) {
      process.exit(1)
    }
  }

  // wr dev --port=3000
  if (storage.lastRunCommand !== args[0]) {
    storage.lastRunCommand = args[0]
    dump()
  }

  return getNrCommand(agent, args)
})

// upgrade 工作目录全依赖更新
export const parseWu = <Runner>((agent, args) => {
  if (args.includes('-i'))
    return getCommand(agent, 'upgrade-interactive', exclude(args, '-i'))

  return getCommand(agent, 'upgrade', args)
})

// uninstall
export const parseWun = <Runner>((agent, args) => {
  if (args.includes('-g'))
    return getCommand(agent, 'global_uninstall', exclude(args, '-g'))

  return getCommand(agent, 'uninstall', args)
})

export const parseWlx = <Runner>((agent, args) => {
  return getCommand(agent, 'execute', args)
})
