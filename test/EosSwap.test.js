import SwapApp, { SwapInterface } from 'swap.app'
import EosSwap from 'swap.swaps/EosSwap'

import Eos from 'eosjs'

const eosMockProvider = Eos({
  mockTransactions: 'pass',
  httpEndpoint: 'https://jungle.eosio.cr',
  chainId: '038f4b0fc8ff18a4f0842a8f0564611f6e96e8535901dd45e43ac8691a1c4dca',
  keyProvider: '5K7B6Pgwkv4Yydmw94Hk95uZnW2T4PMNRMKoJzAbfKPRQRkEcEm',
  verbose: true
})

const secret = 'c0933f9be51a284acb6b1a6617a48d795bdeaa80'
const secretHash = '548119730d99447352c0788ed58b923d3dd07484'
const amount = 100

const swapAccount = 'swaponline11'
const participantAccount = 'swaponline12'

SwapApp.env = {
  eos: eosMockProvider
}
SwapApp.services = {
  auth: {
    accounts: {
      eos: {
        getAccount: () => participantAccount
      }
    }
  }
}

let swap = null

beforeAll(() => {
  swap = new EosSwap({ contract: swapAccount })
})

test(`should implement SwapInterface`, () => {
  expect(swap).toBeInstanceOf(SwapInterface)
})

test(`should allow user to open swap`, async () => {
  const result = await swap.create({ secretHash, participantAccount, amount })

  expect(result.transaction.transaction.actions).toEqual([])
})