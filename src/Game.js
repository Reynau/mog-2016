const { Turn } = require('../src/Turn.js')
const C = require('../src/constants.js')

class Game {
  constructor ({ size = 10 } = {}) {
    const board = Array(size).fill().map(() => Array(size).fill(C.EMPTY_CELL))
    this.turn = new Turn(board, [], [])
    this.turns = [this.turn]
    this.players = {}
    this.sockets = []
  }

  onPlayerJoin (socket) {
    let bikeId = 0
    while (this.sockets[bikeId] != null) ++bikeId
    this.sockets[bikeId] = socket
    this.players[socket.id] = bikeId
    if (this.turns.length > 1) return
    this.turn.addPlayer(bikeId)
    this.sendState()
  }

  onChangeDir (socket, dir) {
    const bikeId = this.players[socket.id]
    this.turn.setInput(bikeId, dir)
  }

  onPlayerLeave (socket) {
    const bikeId = this.players[socket.id]
    this.turn.setInput(bikeId, C.SELF_DESTRUCT)

    delete this.players[socket.id]
    this.sockets[bikeId] = null
  }

  gameHasStarted () {
    return this.turns.length > 1
  }

  gameCanStart () {
    let nplayers = 0
    this.sockets.forEach((socket) => socket && ++nplayers)
    return (nplayers >= 2)
  }

  gameShouldRestart () {
    let nplayers = 0
    this.turn.bikes.forEach((bike) => bike && bike.alive && ++nplayers)
    return (nplayers < 2)
  }

  tick () {
    if (this.gameHasStarted() && this.gameShouldRestart()) {
      const board = this.turn.board.map((row) => row.map((col) => 0))
      this.turn = new Turn(board, [], [])
      this.turns = [this.turn]
      this.sockets.forEach((socket, playerId) => {
        if (socket) {
          this.players[socket.id] = playerId
          this.turn.addPlayer(playerId)
        }
      })
    } else if (this.gameCanStart() || this.gameHasStarted()) {
      const nextTurn = this.turn.evolve()
      this.turns.push(nextTurn)
      this.turn = nextTurn
      this.sendState()
    }
  }

  sendState () {
    const state = {
      turn: this.turn,
      players: this.players
    }
    this.sockets.forEach((socket) => socket && socket.emit('game:state', state))
  }
}
exports.Game = Game
