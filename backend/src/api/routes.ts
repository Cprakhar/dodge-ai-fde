import { Router } from "express";
import { z } from "zod";
import { IngestionService } from "../ingestion/ingestionService.js";
import { QueryService } from "../query/queryService.js";
import { GraphRepository } from "../graph/repository.js";

const QueryBodySchema = z.object({
  question: z.string().min(1)
});

export function createRoutes(
  ingestionService: IngestionService,
  queryService: QueryService,
  repository: GraphRepository
): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  router.post("/ingest", async (req, res, next) => {
    try {
      const reset = Boolean(req.query.reset === "true");
      const stats = await ingestionService.ingestAll({ reset });
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  router.post("/query", async (req, res, next) => {
    try {
      const parsed = QueryBodySchema.parse(req.body);
      const result = await queryService.executeQuestion(parsed.question);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/graph/neighbors/:nodeId", async (req, res, next) => {
    try {
      const rows = await repository.getNodeAndNeighbors(req.params.nodeId);
      res.json({ rows });
    } catch (error) {
      next(error);
    }
  });

  router.get("/graph/all", async (_req, res, next) => {
    try {
      const graph = await repository.getFullGraph();
      res.json(graph);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
