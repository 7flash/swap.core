import { SwapInterface } from 'swap.app'

/**
 * @param { object }  options
 * @param { string }  options.
 */
export default class EosSwap extends SwapInterface {
  constructor() {
    super()
  }

  _initSwap() {
    this.contractAccount = 'swaponline.swapeos'
    this.userAccount = SwapApp.services.auth.accounts.eos.address
    this.eos = SwapApp.env.eosjs
  }

  create(data) {
    const { secretHash, participantAccount, amount } = data

    const stringAmount = `${amount} EOS`

    return eos.transaction({
      actions: [
        {
          account: this.contractAccount,
          name: 'create',
          authorization: [{
            actor: this.userAccount,
            permission: 'active'
          }],
          data: {
            secretHash,
            participantAccount
          }
        },
        {
          account: 'eosio.token',
          name: 'transfer',
          authorization: [{
            actor: this.userAccount,
            permission: 'active'
          }],
          data: {
            from: this.ownerAccount,
            to: this.contractAccount,
            quantity: stringAmount,
            memo: ''
          }
        }
      ]
    })
  }

  refund() {

  }

  withdraw() {

  }

  getSecret() {

  }
}