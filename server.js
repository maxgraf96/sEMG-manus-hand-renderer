import express from 'express';
import fs from 'node:fs/promises'
import { Server } from 'socket.io'
import * as zmq from 'zeromq';
// import { createServer } from 'http'

// Constants
const isProduction = process.env.NODE_ENV === 'production'
const port = process.env.PORT || 5173
const base = process.env.BASE || '/'

// Cached production assets
const templateHtml = isProduction
  ? await fs.readFile('./dist/client/index.html', 'utf-8')
  : ''
const ssrManifest = isProduction
  ? await fs.readFile('./dist/client/.vite/ssr-manifest.json', 'utf-8')
  : undefined

// Create http server
const app = express()
// const server = createServer(app)

// Add Vite or respective production middlewares
let vite
if (!isProduction) {
  const { createServer } = await import('vite')
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    base
  })
  app.use(vite.middlewares)
} else {
  const compression = (await import('compression')).default
  const sirv = (await import('sirv')).default
  app.use(compression())
  app.use(base, sirv('./dist/client', { extensions: [] }))
}

// Serve HTML
app.use('*', async (req, res) => {
  try {
    const url = req.originalUrl.replace(base, '')

    let template
    let render
    if (!isProduction) {
      // Always read fresh template in development
      template = await fs.readFile('./index.html', 'utf-8')
      template = await vite.transformIndexHtml(url, template)
      render = (await vite.ssrLoadModule('./entry_server.js')).render
    } else {
      template = templateHtml
      render = (await import('./dist/server/entry_server.js')).render
    }

    const rendered = await render(url, ssrManifest)

    const html = template
      .replace(`<!--app-head-->`, rendered.head ?? '')
      .replace(`<!--app-html-->`, rendered.html ?? '')

    res.status(200).set({ 'Content-Type': 'text/html' }).send(html)
  } catch (e) {
    vite?.ssrFixStacktrace(e)
    console.log(e.stack)
    res.status(500).end(e.stack)
  }
})

// Start http server
const server = app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`)
});

// Get your libraries
const io = new Server(server, {
    allowEIO3: true,
    cors: {credentials: true, origin: `http://localhost:${port}`},
});

let sock = zmq.socket('sub')
sock.connect('tcp://127.0.0.1:55516');
sock.subscribe('');
console.log('ZMQ sub connected to port 55516');

//Connect to SocketIO
io.on('connection', function(socket) {
  console.log('a user connected');
})

//Create a function that will get triggered by ZeroMQ. Data is the binary stream that is recieved by ZeroMQ.
function trigger(data) {
  data = JSON.parse(data)

  console.log(data[0])

  io.emit("joint_angles", data)
}

//Connect your triggerfunction and zeromq.
sock.on('message', trigger)
