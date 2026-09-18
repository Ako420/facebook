const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalise = (value) => value.trim().replace(/\/+$/, '');

export const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(normalise)
  .filter(Boolean);

const matchers = allowedOrigins.map((entry) => {
  if (!entry.includes('*')) {
    const expected = entry.toLowerCase();
    return (origin) => origin.toLowerCase() === expected;
  }

  const pattern = new RegExp(`^${entry.split('*').map(escapeRegex).join('[^.]*')}$`, 'i');
  return (origin) => pattern.test(origin);
});

export const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const candidate = normalise(origin);
  if (matchers.some((match) => match(candidate))) return true;
  console.warn(`Blocked CORS origin: ${origin}`);
  return false;
};

export const corsOptions = {
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
  maxAge: 86400,
};
