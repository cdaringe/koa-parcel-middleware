import * as url from 'url'
import * as path from 'path'
import * as Koa from 'koa' // eslint-disable-line
import serveStatic from 'koa-static'
import Bundler from 'parcel-bundler' // eslint-disable-line

export interface CreateMiddlewareConfig {
  bundler: Bundler & { [key: string]: any } // @todo beef up parcel typings
  renderHtmlMiddleware?: Koa.Middleware
  staticMiddleware: ReturnType<typeof serveStatic>
}

export const createMiddleware = ({
  bundler,
  renderHtmlMiddleware,
  staticMiddleware
}: CreateMiddlewareConfig) => {
  const middleware: Koa.Middleware = async (ctx, next) => {
    function respond () {
      const { pathname } = url.parse(ctx.url)
      if (bundler.error) return ctx.throw(500, bundler.error)
      if (!pathname) return ctx.throw(500, 'empty pathname')
      if (
        pathname === '' ||
        pathname === '/' ||
        !pathname.startsWith(bundler.options.publicURL) ||
        path.extname(pathname) === ''
      ) {
        if (renderHtmlMiddleware) {
          return renderHtmlMiddleware(ctx, next)
        }
        ctx.url = `/${path.basename(bundler.mainBundle.name)}`
        return staticMiddleware(ctx, next)
      }
      ctx.url = pathname.slice(bundler.options.publicURL.length)
      return staticMiddleware(ctx, next)
    }
    return bundler.pending ? bundler.once('bundled', respond) : respond()
  }
  return middleware
}

// @link {https://github.com/parcel-bundler/parcel/blob/master/src/Server.js#L36}
