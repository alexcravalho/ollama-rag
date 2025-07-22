import { createProxyMiddleware } from 'http-proxy-middleware';
import { LITE_LLM_URL } from '../config/constants.js';

export function createLiteLLMProxy(path: string) {
  return createProxyMiddleware({
    target: LITE_LLM_URL,
    changeOrigin: true,
    pathRewrite: { [`^${path}`]: path },
    selfHandleResponse: false,
    onProxyReq: (proxyReq, req, res) => {
      console.log(
        `🔁 Proxying ${req.method} ${req.originalUrl} to ${LITE_LLM_URL}${req.originalUrl}`
      );
    },
    onError: (err, req, res) => {
      console.error('❌ Proxy error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy failed' }));
    },
  });
}
