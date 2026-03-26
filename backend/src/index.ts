import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { Neo4jClient } from "./graph/neo4jClient.js";
import { GraphRepository } from "./graph/repository.js";
import { IngestionService } from "./ingestion/ingestionService.js";
import { QueryService } from "./query/queryService.js";
import { createRoutes } from "./api/routes.js";

const app = express();
const neo4j = new Neo4jClient();
const repository = new GraphRepository(neo4j.getDriver());
const ingestionService = new IngestionService(repository);
const queryService = new QueryService(repository);

app.use(cors());
app.use(express.json());
app.use(createRoutes(ingestionService, queryService, repository));

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  res.status(400).json({ error: message });
});

const server = app.listen(env.PORT, () => {
  console.log(`Backend listening on ${env.PORT}`);
});

async function shutdown(): Promise<void> {
  server.close();
  await neo4j.close();
}

process.on("SIGINT", () => {
  shutdown().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  shutdown().finally(() => process.exit(0));
});
