import crypto from 'crypto';

const isProd = process.env.NODE_ENV === 'production';

const safeStringify = (obj) => {
  try {
    return JSON.stringify(obj);
  } catch {
    return '[unserializable]';
  }
};

export const logger = {
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
  debug: (...args) => {
    if (!isProd) console.debug(...args);
  },
};

export const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} - ${ms}ms`;
    if (res.statusCode >= 500) logger.error(line);
    else if (res.statusCode >= 400) logger.warn(line);
    else logger.info(line);
  });
  next();
};

export const attachRequestId = (req, res, next) => {
  const id = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
};

