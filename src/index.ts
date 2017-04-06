import * as Koa from 'koa'
import * as r from 'koa-route'
import * as IO from 'socket.io'
import * as http from 'http'
import * as kcors from 'kcors'
import * as Session from 'slackr-bot'

import * as config from '../config.json'

const session = new Session({
  token: config['slackbot-token'],
  devChannel: '#bottest',
})

const times: {[key: string]: number} = {}
const WAIT = 15 * 1000

const BOT_ID = '<@U4TFP66EB>'
session.on(/<@U4TFP66EB> ([\w-_z]+?):\s+(.+)/, (message, match: RegExpMatchArray) => {
  const monitor = (match[1] || '').toLowerCase()
  const command = match[2]

  const socket = clients[monitor]
  if (!socket) {
    message.reply(`no monitor named \`${monitor}\` is connected`)
    return
  }

  const lastChanged = times[monitor]

  if (lastChanged) {
    const now = new Date().getTime()
    const diff = now - lastChanged

    if (diff < WAIT) {
      message.reply(`Woah, ${message.userName}, slow down`)
      return;
    }
  }

  socket.emit('command', {
    command,
    commandSetBy: message.userName,
  })

  times[monitor] = new Date().getTime()
})

const app = new Koa()
app.use(kcors())
app.use(require('koa-json')())

app.use(r.get('/health', (ctx) => {
  const names = Object.keys(clients)
  ctx.body = {
    clients: {
      names,
    },
  }
}))

const server = http.createServer(app.callback())
const io = IO(server)

const clients: {[key: string]: SocketIO.Socket} = {}

io.on('connection', (socket) => {
  socket.on('register', (msg) => {
    if (msg.name) {
      const name = (msg.name as string).toLowerCase()

      const old = clients[name]
      if (old) {
        console.log('disconnecting ' + name)
        old.disconnect()
      }

      console.log(`Connecting to monitor: ${name}`)
      clients[name] = socket
    }
  })

  socket.on('disconnect', () => {
    for (let key in clients) {
      const sock = clients[key]
      if (sock.id === socket.id) {
        delete clients[key]
        break
      }
    }
  })
})


server.listen(3001, () => {
  console.log(`Server started on: http://localhost:3001`)
})
