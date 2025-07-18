export const AGGREGATORS = [
  'https://agg.walrus.eosusa.io',
  'https://aggregator.mainnet.walrus.mirai.cloud',
  'https://aggregator.suicore.com',
  'https://aggregator.walrus-mainnet.tududes.com',
  'https://aggregator.walrus-mainnet.walrus.space',
  'https://aggregator.walrus.atalma.io',
  'https://aggregator.walrus.mainnet.mozcomputing.dev',
  'https://aggregator.walrus.silentvalidator.com',
  'https://mainnet-aggregator.hoh.zone',
  'https://mainnet-aggregator.walrus.graphyte.dev',
  'https://mainnet-walrus-aggregator.kiliglab.io',
  'https://sm1-walrus-mainnet-aggregator.stakesquid.com',
  'https://sui-walrus-mainnet-aggregator.bwarelabs.com',
  'https://suiftly.mhax.io',
  'https://wal-aggregator-mainnet.staketab.org',
  'https://walmain.agg.chainflow.io',
  'https://walrus-agg.mainnet.obelisk.sh',
  'https://walrus-aggregator-mainnet.chainode.tech:9002',
  'https://walrus-aggregator.brightlystake.com',
  'https://walrus-aggregator.chainbase.online',
  'https://walrus-aggregator.n1stake.com',
  'https://walrus-aggregator.natsai.xyz',
  'https://walrus-aggregator.rockfin.io',
  'https://walrus-aggregator.rubynodes.io',
  'https://walrus-aggregator.stakely.io',
  'https://walrus-aggregator.stakin-nodes.com',
  'https://walrus-aggregator.staking4all.org',
  'https://walrus-aggregator.starduststaking.com',
  'https://walrus-aggregator.talentum.id',
  'https://walrus-aggregator.thcloud.ai',
  'https://walrus-aggregator.thepassivetrust.com',
  'https://walrus-cache-mainnet.latitude.sh',
  'https://walrus-cache-mainnet.overclock.run',
  'https://walrus-main-aggregator.4everland.org',
  'https://walrus-mainnet-aggregator-1.zkv.xyz',
  'https://walrus-mainnet-aggregator.crouton.digital',
  'https://walrus-mainnet-aggregator.dzdaic.com',
  'https://walrus-mainnet-aggregator.everstake.one',
  'https://walrus-mainnet-aggregator.imperator.co',
  'https://walrus-mainnet-aggregator.luckyresearch.org',
  'https://walrus-mainnet-aggregator.nami.cloud',
  'https://walrus-mainnet-aggregator.nodeinfra.com',
  'https://walrus-mainnet-aggregator.redundex.com',
  'https://walrus-mainnet-aggregator.rpc101.org',
  'https://walrus-mainnet-aggregator.stakecraft.com',
  'https://walrus-mainnet-aggregator.stakeengine.co.uk',
  'https://walrus-mainnet-aggregator.stakingdefenseleague.com.',
  'https://walrus-mainnet-aggregator.trusted-point.com',
  'https://walrus.aggregator.stakepool.dev.br',
  'https://walrus.blockscope.net',
  'https://walrus.globalstake.io',
  'https://walrus.lakestake.io',
  'https://walrus.lionscraft.blockscape.network:9000',
  'https://walrus.prostaking.com:9443',
  'https://walrus.veera.com',
  'https://walrusagg.pops.one',
  'http://walrus-aggregator.winsnip.site:9000',
  'http://walrus.equinoxdao.xyz:9000',
  'http://67.220.194.10:9000',
]

/**
 * @param {bigint} [seed]
 * @returns
 */
export function getRandomAggregator(seed) {
  let idx

  if (seed !== undefined) {
    idx = Number(seed % BigInt(AGGREGATORS.length))
  } else {
    idx = Math.floor(Math.random() * AGGREGATORS.length)
  }

  return AGGREGATORS[idx]
}
