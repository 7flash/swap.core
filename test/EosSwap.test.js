import { SwapInterface } from 'swap.app'

import EosSwap from 'swap.swaps/EosSwap'

let eos = null

beforeAll(() => {
  eos = new EosSwap()
})

test(`should implement SwapInterface`, () => {
  expect(eos).toBeInstanceOf(SwapInterface)
})