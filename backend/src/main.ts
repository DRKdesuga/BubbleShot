import { createAppServer } from "./server.js";

const port = Number(process.env.NEXT_PORT || process.env.PORT || 3000);

const host = process.env.HOST || "127.0.0.1";

createAppServer()
  .then(({ httpServer }) => {
    httpServer.listen(port, host, () => {
      console.log(`Backend listening on http://${host}:${port}`);
    });

    function shutdown(signal: string): void {
      console.log(`Received ${signal}, shutting down.`);
      httpServer.close(() => {
        process.exit(0);
      });
    }

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  })
  .catch((err) => {
    console.error("Failed to start application:", err);
    process.exit(1);
  });

