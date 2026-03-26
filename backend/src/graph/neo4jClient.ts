import neo4j, { Driver } from "neo4j-driver";
import { env } from "../config/env.js";

export class Neo4jClient {
  private readonly driver: Driver;

  public constructor() {
    this.driver = neo4j.driver(
      env.NEO4J_URI,
      neo4j.auth.basic(env.NEO4J_USER, env.NEO4J_PASSWORD)
    );
  }

  public getDriver(): Driver {
    return this.driver;
  }

  public async close(): Promise<void> {
    await this.driver.close();
  }
}
