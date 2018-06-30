jest.mock('swap.app/SwapApp')

import SwapApp, { SwapInterface } from 'swap.app'

import EosSwap from 'swap.swaps/EosSwap'

const contractAccount = 'swaponline.swapeos'
const ownerAccount = 'inita'

test(`should implement SwapInterface`, () => {
  const eos = new EosSwap()

  expect(eos).toBeInstanceOf(SwapInterface)
})

test(`should initialize contract instance`, () => {
  const eos = new EosSwap()
  eos._initSwap()
  eos.test()

  console.log(eos)

  expect(eos.contractAccount).toBe(contractAccount)
  expect(eos.userAccount).toBe(userAccount)
})