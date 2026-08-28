import test from "node:test";
import assert from "node:assert/strict";
import { addAgent, countStrongRelationships, createWorld, mulberry32, relationshipKey, stepWorld } from "./simulation.js";

test("seeded worlds are deterministic", () => {
  const a = createWorld(5, 1000, 700, 42);
  const b = createWorld(5, 1000, 700, 42);
  assert.deepEqual(a.agents, b.agents);
});

test("relationship keys are stable regardless of order", () => {
  assert.equal(relationshipKey({ id: 9 }, { id: 2 }), "2:9");
  assert.equal(relationshipKey({ id: 2 }, { id: 9 }), "2:9");
});

test("close compatible agents strengthen a relationship", () => {
  const world = createWorld(2, 800, 600, 7);
  Object.assign(world.agents[0], { x: 400, y: 300, vx: 0, vy: 0, affinity: 0.5 });
  Object.assign(world.agents[1], { x: 410, y: 300, vx: 0, vy: 0, affinity: 0.5 });
  for (let i = 0; i < 240; i += 1) stepWorld(world, 16.667);
  assert.ok(countStrongRelationships(world, 0.1) >= 1);
});

test("new agents are inserted at the interaction point", () => {
  const world = createWorld(1, 800, 600, 1);
  const agent = addAgent(world, 120, 240, mulberry32(9));
  assert.equal(agent.x, 120);
  assert.equal(agent.y, 240);
  assert.equal(world.agents.length, 2);
  assert.equal(world.events.at(-1).type, "birth");
});
