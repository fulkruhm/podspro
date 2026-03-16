import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';

function buildRequestId(req: Request): string {
  const incomingRequestId = req.header(REQUEST_ID_HEADER);
  if (incomingRequestId && incomingRequestId.trim().length > 0) {
    return incomingRequestId;
  }
  return randomUUID();
}

export function attachRequestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = buildRequestId(req);
  const start = process.hrtime.bigint();

  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  let logged = false;
  const logCompletion = () => {
    if (logged) {
      return;
    }
    logged = true;

    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'request.completed',
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        ip: req.ip,
      })
    );
  };

  res.on('finish', logCompletion);
  res.on('close', logCompletion);

  next();
}
