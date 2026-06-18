import { createHash } from 'crypto'

export function routePullRequest(event) {
  const changed = event.changed || []
  const domains = {
    rtl: changed.some((file) => file.startsWith('rtl/')),
    firmware: changed.some((file) => file.startsWith('drivers/') || file.startsWith('firmware/')),
    model: changed.some((file) => file.startsWith('models/')),
  }
  const bytecode = [
    'OP_PR_CONTEXT',
    domains.rtl && 'OP_RTL_DELTA',
    domains.firmware && 'OP_REGMAP_DELTA',
    domains.model && 'OP_MODEL_CONTEXT',
    'OP_ROUTE_APP',
    domains.rtl && 'OP_EDA_SIM',
    domains.rtl && 'OP_FORMAL',
    domains.firmware && 'OP_DRIVER_CHECK',
    'OP_WORM_RECEIPT'
  ].filter(Boolean)
  const seal = createHash('sha256').update(JSON.stringify({ event, bytecode })).digest('hex')
  return { domains, bytecode, seal }
}

