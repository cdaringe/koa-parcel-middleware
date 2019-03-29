# koa-parcel-middleware

[parcel middleware](https://parceljs.org/api.html#middleware) for [koa](https://koajs.com/)

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release) [![Greenkeeper badge](https://badges.greenkeeper.io/cdaringe/koa-parcel-middleware.svg)](https://greenkeeper.io/) [![CircleCI](https://circleci.com/gh/cdaringe/koa-parcel-middleware.svg?style=svg)](https://circleci.com/gh/cdaringe/koa-parcel-middleware) [![TypeScript package](https://img.shields.io/badge/typings-included-blue.svg)](https://www.typescriptlang.org)

## why

parcel middleware enables you to:

- serve your ui application _from_ your server application
- wire in advanced features, such as server-side-rendering
- combine the parcel dev server functionality _with_ an existing server application, rather than an extra process

## install

`yarn add koa-parcel-middleware koa koa-static`

koa and koa-static are required peerDependencies.  koa-static is required such that
non-js assets (e.g. css, images, etc) may be served gracefully as requested by your ui.

## usage

```ts
// api preview
import { createMiddleware } from 'koa-parcel-middleware'
const middleware = createMiddleware({
  bundler: `parcelBundlerInstance`,
  renderHtmlMiddleware?: `<optionally-own-serving-your-entrypoint>`,
  staticMiddleware: `koaStaticInstance` // serving parcel's built assets
})
```

the following is a rich, complete example of using the middleware api.

```ts
import { createMiddleware } from 'koa-parcel-middleware' // :)
import { App } from './app' // e.g. a react <App /> component
import { promises as fs } from 'fs'
import * as path from 'path'
import * as ReactDOMServer from 'react-dom/server'
import Bundler from 'parcel-bundler'
import CombinedStream from 'combined-stream'
import Koa from 'koa'
import serveStatic from 'koa-static'

// your parcel application's _unbuilt_ entry point!
const ENTRY_FILENAME = path.resolve(__dirname, 'index.html')
const isDev = process.env.NODE_ENV === 'development'

async function start () {
  const app = new Koa()
  // your parcel application's _built_ entry point!
  const outFile = path.resolve(__dirname, 'dist', 'index.html')
  const outDir = path.resolve(__dirname, 'dist')
  const options = {
    outDir,
    outFile,
    watch: isDev,
    minify: !isDev,
    scopeHoist: false,
    hmr: isDev,
    detailedReport: isDev
  }
  const bundler = new Bundler(ENTRY_FILENAME, options)
  bundler.bundle()
  const staticMiddleware = serveStatic(outDir)
  const parcelMiddleware = createMiddleware({
    bundler,
    renderHtmlMiddleware: async (ctx, next) => {
      // optionally wire in SSR!

      // index.html
      //
      // <html>
      //   <div id="app"><!-- ssr-content --></div>
      //   <script src="app.tsx"></script>
      // </html>
      const outFileBuffer = await fs.readFile(outFile)
      const [preAppEntry, postAppEntry] = outFileBuffer.toString()
        .split(/<!--.*ssr.*-->/)
      ctx.status = 200
      const htmlStream = new CombinedStream()
      ;[
        preAppEntry,
        ReactDOMServer.renderToNodeStream(App()),
        postAppEntry
      ].map(content => htmlStream.append(content))
      ctx.body = htmlStream
      ctx.type = 'html'
      await next()
    },
    staticMiddleware
  })
  app.use((ctx, next) => parcelMiddleware(ctx, next))
  app.listen(3000)
}
start()
```
