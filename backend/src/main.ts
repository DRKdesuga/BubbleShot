import { createAppServer } from "./server.js";

const port = Number(process.env.PORT ?? 3000);

createAppServer()
  .then(({ httpServer }) => {
    httpServer.listen(port, () => {
      console.log(`Backend listening on http://localhost:${port}`);
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

