import http from "http";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { handleDynamicOGTags } from "./og-middleware";

const app = express();
// Increase body parser limits to handle image uploads (up to 50MB)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Dynamic OG tags middleware for social media crawlers
  app.use(async (req, res, next) => {
    const handled = await handleDynamicOGTags(req, res, next);
    if (!handled) {
      next();
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  // Bind explicitly to IPv4 to avoid ENOTSUP when IPv6 (::1) is not supported
  const host = process.env.HOST || "127.0.0.1";

  // server.listen(
  //   {
  //     port,
  //     host,
  //     reusePort: true,
  //   },
  //   () => {
  //     log(`serving on http://${host}:${port}`);
  //   }
  // );

  const DEFAULT_PORT = parseInt(process.env.PORT || "5000", 10);

  const tryHosts = [process.env.HOST || "127.0.0.1", "0.0.0.0", "::"];

  async function attemptListen(
    port: number,
    host: string
  ): Promise<http.Server> {
    return new Promise((resolve, reject) => {
      const srv = http.createServer(app); // app already defined above

      const onError = (err: NodeJS.ErrnoException) => {
        srv.removeListener("listening", onListening);
        try {
          srv.close();
        } catch {}
        reject(err);
      };

      const onListening = () => {
        srv.removeListener("error", onError);
        resolve(srv);
      };

      srv.once("error", onError);
      srv.once("listening", onListening);

      try {
        srv.listen(port, host);
      } catch (syncErr) {
        srv.removeListener("error", onError);
        srv.removeListener("listening", onListening);
        try {
          srv.close();
        } catch {}
        reject(syncErr);
      }
    });
  }

  (async () => {
    const port = DEFAULT_PORT;
    let boundServer: http.Server | null = null;
    const errors: { host: string; err: any }[] = [];

    for (const host of tryHosts) {
      try {
        console.log(`Trying to listen on ${host}:${port} ...`);
        boundServer = await attemptListen(port, host);
        console.log(`Server listening on http://${host}:${port}`);
        break;
      } catch (err: any) {
        errors.push({ host, err });
        console.error(`Failed on ${host}:${port}`, err.code, err.message);
      }
    }

    if (!boundServer) {
      console.error("All attempts failed:", errors);
      process.exit(1);
    }

    boundServer.on("error", (err) => {
      console.error("Server error:", err);
    });
  })();
})();
