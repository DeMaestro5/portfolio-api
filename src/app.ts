import express, { Request, Response, NextFunction } from 'express';
import Logger from './core/Logger';
import cors from 'cors';
import { corsUrl, environment } from './config';
import './cache'; // initialize cache
import {
  NotFoundError,
  ApiError,
  InternalError,
  ErrorType,
} from './core/ApiError';
import routes from './routes';

process.on('uncaughtException', (e) => {
  Logger.error(e);
});

const app = express();

app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      if (
        req.originalUrl.includes('/webhook') ||
        req.url.includes('/webhook')
      ) {
        req.rawBody = buf;
      }
    },
  }),
);
app.use(
  express.urlencoded({ limit: '10mb', extended: true, parameterLimit: 50000 }),
);
const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) {
    if (!origin) return callback(null, true);

    // Define allowed origins
    const allowedOrigins = [
      'https://portfolio-six-black-53.vercel.app/',
      corsUrl,
      'http://localhost:5173', // Development
      'http://127.0.0.1:3000', // Development alternative
    ].filter(Boolean); // Remove any undefined values

    // Check for exact matches first
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Check for Vercel preview deployments (*.vercel.app)
    if (origin.endsWith('.vercel.app')) {
      if (origin.includes('Portfolio')) {
        return callback(null, true);
      }
    }

    // In development, be more permissive
    if (environment === 'development') {
      // Allow any localhost with different ports
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }
    }

    Logger.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Important for sending cookies and auth headers
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Cache-Control',
    'Pragma',
  ],
};

app.use(cors(corsOptions));

// Routes
app.use('/', routes);

// catch 404 and forward to error handler
app.use((req, res, next) => next(new NotFoundError()));

// Middleware Error Handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ApiError) {
    ApiError.handle(err, res);
    if (err.type === ErrorType.INTERNAL)
      Logger.error(
        `500 - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`,
      );
  } else {
    Logger.error(
      `500 - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`,
    );
    Logger.error(err);
    if (environment === 'development') {
      return res.status(500).send(err);
    }
    ApiError.handle(new InternalError(), res);
  }
});

export default app;
