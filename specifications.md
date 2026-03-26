# Graph-Based Data Modeling and Query System

## Tech Stack
- **Backend**: Typescript, Node.js (OOPs paradigm)
- **Graph Database**: Neo4j or (SQL-based database for llm-generated queries)
- **LLM**: Groq 
- **Frontend**: React, D3.js (for graph visualization)
- **Deployment**: Docker

## Functional Requirements
1. **Graph Construction**: Convert the provided dataset into a graph structure, defining nodes for entities and edges for relationships.
2. **Graph Visualization**: Create an interactive interface to explore the graph, allowing users to expand nodes and view metadata.
3. **Conversational Query Interface**: Develop a chat interface that accepts natural language queries, processes them using an LLM, and returns relevant information from the graph.
4. **Guardrails**: Implement mechanisms to ensure that responses are grounded in the dataset, preventing hallucinations.
