import { Hackathon } from "../schema.js";

export interface SourceAdapter {
  readonly id: string;
  readonly name: string;
  fetch(): Promise<unknown>;
  normalize(raw: unknown): Hackathon[];
}
