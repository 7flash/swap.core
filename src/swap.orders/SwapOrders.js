import SwapApp, { Collection, ServiceInterface, util, constants } from 'swap.app'
import SwapRoom from 'swap.room'
import aggregation from './aggregation'
import events from './events'
import Order from './Order'


const getUniqueId = (() => {
  let id = Date.now()
  return () => `${SwapApp.services.room.peer}-${++id}`
})()

class SwapOrders extends aggregation(ServiceInterface, Collection) {

  static get name() {
    return 'orders'
  }

  constructor() {
    super()

    this._serviceName = 'orders'
    this._dependsOn   = [ SwapRoom ]
  }

  initService() {
    SwapApp.services.room.subscribe('ready', this._handleReady)
    SwapApp.services.room.subscribe('user online', this._handleUserOnline)
    SwapApp.services.room.subscribe('user offline', this._handleUserOffline)
    SwapApp.services.room.subscribe('new orders', this._handleNewOrders)
    SwapApp.services.room.subscribe('new order', this._handleNewOrder)
    SwapApp.services.room.subscribe('remove order', this._handleRemoveOrder)
  }

  _handleReady = () => {
    this._persistMyOrders()
  }

  _handleUserOnline = (peer) => {
    let myOrders = this.getMyOrders()

    if (myOrders.length) {
      // clean orders from other additional props
      myOrders = myOrders.map((item) => util.pullProps(
        item,
        'id',
        'owner',
        'buyCurrency',
        'sellCurrency',
        'buyAmount',
        'sellAmount',
        'isRequested',
        'isProcessing',
      ))

      SwapApp.services.room.sendMessage(peer, [
        {
          event: 'new orders',
          data: {
            orders: myOrders,
          },
        },
      ])
    }
  }

  _handleUserOffline = (peer) => {
    const peerOrders = this.getPeerOrders(peer)

    if (peerOrders.length) {
      peerOrders.forEach(({ id }) => {
        this._handleRemove(id)
      })
    }
  }

  _handleNewOrders = ({ fromPeer, orders }) => {
    // ductape to check if such orders already exist
    const filteredOrders = orders.filter(({ id, owner: { peer } }) => (
      !this.getByKey(id) && peer === fromPeer
    ))

    this._handleMultipleCreate(filteredOrders)
  }

  _handleNewOrder = ({ fromPeer, order }) => {
    if (order && order.owner && order.owner.peer === fromPeer) {
      if (this._checkIncomeOrderFormat(order)) {
        this._handleCreate(order)
      }
    }
  }

  _handleRemoveOrder = ({ fromPeer, orderId }) => {
    const order = this.getByKey(orderId)

    if (order && order.owner && order.owner.peer === fromPeer) {
      this._handleRemove(orderId)
    }
  }

  _checkIncomeOrderFormat(data) {
    const format = {
      id: '?String',
      owner: {
        peer: 'String',
        reputation: '?String',
        ...(() => {
          const result = {}
          constants.COINS.forEach((coin) => {
            result[coin] = util.typeforce.t.maybe({
              address: 'String', // TODO add check address length
              publicKey: '?String',
            })
          })
          return result
        })(),
      },
      buyCurrency: 'String',
      sellCurrency: 'String',
      buyAmount: util.typeforce.isNumeric,
      sellAmount: util.typeforce.isNumeric,
      isProcessing: '?Boolean',
      isRequested: '?Boolean',
    }

    const isValid = util.typeforce.check(format, data, true)

    if (!isValid) {
      console.log('Wrong income order format. Excepted:', format, 'got:', data)
    }

    return isValid
  }

  _persistMyOrders() {
    this.getMyOrders().forEach((orderData) => {
      this._handleCreate(orderData)
    })
  }

  /**
   *
   * @param {object} data
   * @param {string} data.id
   * @param {object} data.owner
   * @param {string} data.owner.peer
   * @param {number} data.owner.reputation
   * @param {object} data.owner.<currency>
   * @param {string} data.owner.<currency>.address
   * @param {string} data.owner.<currency>.publicKey
   * @param {string} data.buyCurrency
   * @param {string} data.sellCurrency
   * @param {number} data.buyAmount
   * @param {number} data.sellAmount
   * @param {boolean} data.isProcessing
   * @param {boolean} data.isRequested
   */
  _create(data) {
    const order = new Order(this, {
      ...data,
      id: data.id || getUniqueId(),
    })

    this.append(order, order.id)

    return order
  }

  _handleCreate(data) {
    const order = this._create(data)

    if (order) {
      events.dispatch('new order', order)
    }
  }

  _handleMultipleCreate(ordersData) {
    const orders = []

    ordersData.forEach((data) => {
      if (this._checkIncomeOrderFormat(data)) {
        const order = this._create(data)

        orders.push(order)
      }
    })

    if (orders.length) {
      events.dispatch('new orders', orders)
    }
  }

  /**
   *
   * @param {string} orderId
   */
  _handleRemove(orderId) {
    try {
      const order = this.getByKey(orderId)

      if (order) {
        this.removeByKey(orderId)
        events.dispatch('remove order', order)
      }
    }
    catch (err) {}
  }

  _saveMyOrders() {
    let myOrders = this.items.filter(({ owner: { peer } }) => peer === SwapApp.services.room.peer)

    // clean orders from other additional props
    // TODO need to add functionality to sync `requests` for users who going offline / online
    // problem: when I going online and persisting my orders need to show only online users requests,
    // but then user comes online need to change status. Ofc we can leave this bcs developers can do this themselves
    // with filters - skip requests where user is offline, but it looks like not very good
    myOrders = myOrders.map((item) => util.pullProps(
      item,
      'id',
      'owner',
      'buyCurrency',
      'sellCurrency',
      'buyAmount',
      'sellAmount',
      'participant',
      'requests',
      'isRequested',
      'isProcessing',
    ))

    SwapApp.env.storage.setItem('myOrders', myOrders)
  }

  getMyOrders() {
    return SwapApp.env.storage.getItem('myOrders') || []
  }

  getPeerOrders(peer) {
    return this.items.filter(({ owner }) => peer === owner.peer)
  }

  /**
   *
   * @param {object} data
   * @param {string} data.buyCurrency
   * @param {string} data.sellCurrency
   * @param {number} data.buyAmount
   * @param {number} data.sellAmount
   */
  create(data) {
    const isValid = util.typeforce.check({
      buyCurrency: 'String',
      sellCurrency: 'String',
      buyAmount: util.typeforce.isNumeric,
      sellAmount: util.typeforce.isNumeric,
    }, data, true)

    if (!isValid) {
      return
    }

    const order = this._create({
      ...data,
      owner: SwapApp.services.auth.getPublicData(),
    })
    this._saveMyOrders()

    SwapApp.services.room.sendMessage([
      {
        event: 'new order',
        data: {
          order: util.pullProps(
            order,
            'id',
            'owner',
            'buyCurrency',
            'sellCurrency',
            'buyAmount',
            'sellAmount',
            'isRequested',
            'isProcessing',
          ),
        },
      },
    ])
  }

  /**
   *
   * @param {string} orderId
   */
  remove(orderId) {
    this.removeByKey(orderId)
    SwapApp.services.room.sendMessage([
      {
        event: 'remove order',
        data: {
          orderId,
        },
      },
    ])
    this._saveMyOrders()
  }

  on(eventName, handler) {
    events.subscribe(eventName, handler)
    return this
  }

  off(eventName, handler) {
    events.unsubscribe(eventName, handler)
    return this
  }
}


export default SwapOrders