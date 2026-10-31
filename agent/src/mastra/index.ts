import { Mastra } from "@mastra/core";
import { loadEnv } from "../env.ts";
import { investigate } from "../workflow.ts";

loadEnv();

export const mastra = new Mastra({ workflows: { investigate } });
