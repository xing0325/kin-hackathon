const TAU = Math.PI * 2;

export function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createAgent(id, width, height, random = Math.random, options = {}) {
  const angle = random() * TAU;
  const radius = Math.min(width, height) * (0.12 + random() * 0.34);
  const stateRoll = random();
  return {
    id,
    x: options.x ?? width * 0.57 + Math.cos(angle) * radius,
    y: options.y ?? height * 0.5 + Math.sin(angle) * radius,
    vx: Math.cos(angle + Math.PI / 2) * (0.08 + random() * 0.18),
    vy: Math.sin(angle + Math.PI / 2) * (0.08 + random() * 0.18),
    energy: 0.55 + random() * 0.45,
    affinity: random(),
    phase: random() * TAU,
    size: 1.4 + random() * 2.6,
    state: stateRoll > 0.84 ? "thinking" : stateRoll > 0.72 ? "communicating" : "dormant",
    history: [],
  };
}

export function createWorld(count, width, height, seed = 2408) {
  const random = mulberry32(seed);
  return {
    width,
    height,
    time: 0,
    agents: Array.from({ length: count }, (_, index) => createAgent(index, width, height, random)),
    relationships: new Map(),
    events: [],
    nextId: count,
  };
}

export function addAgent(world, x, y, random = Math.random) {
  const agent = createAgent(world.nextId++, world.width, world.height, random, { x, y });
  agent.state = "acting";
  agent.energy = 1;
  world.agents.push(agent);
  world.events.push({ type: "birth", agentId: agent.id, x, y, at: world.time });
  return agent;
}

export function relationshipKey(a, b) {
  return a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
}

export function stepWorld(world, dt, pointer = null) {
  const step = Math.min(dt, 32) / 16.667;
  const { agents, width, height } = world;
  const nextEvents = [];
  world.time += dt;

  for (let i = 0; i < agents.length; i += 1) {
    const agent = agents[i];
    let separationX = 0;
    let separationY = 0;
    let alignmentX = 0;
    let alignmentY = 0;
    let cohesionX = 0;
    let cohesionY = 0;
    let neighbours = 0;

    for (let j = 0; j < agents.length; j += 1) {
      if (i === j) continue;
      const other = agents[j];
      const dx = other.x - agent.x;
      const dy = other.y - agent.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > 190 * 190 || distanceSquared < 0.01) continue;
      const distance = Math.sqrt(distanceSquared);
      neighbours += 1;
      alignmentX += other.vx;
      alignmentY += other.vy;
      cohesionX += other.x;
      cohesionY += other.y;

      if (distance < 38) {
        separationX -= dx / distanceSquared;
        separationY -= dy / distanceSquared;
      }

      if (distance < 116) {
        const compatibility = 1 - Math.abs(agent.affinity - other.affinity);
        const key = relationshipKey(agent, other);
        const previous = world.relationships.get(key) ?? 0;
        const proximity = 1 - distance / 116;
        const delta = proximity * compatibility * 0.0024 * step;
        const strength = Math.min(1, previous + delta);
        world.relationships.set(key, strength);

        if (previous < 0.34 && strength >= 0.34) {
          nextEvents.push({ type: "intent", a: agent.id, b: other.id, x: (agent.x + other.x) / 2, y: (agent.y + other.y) / 2, at: world.time });
        }
        if (previous < 0.72 && strength >= 0.72) {
          agent.state = "communicating";
          other.state = "communicating";
          nextEvents.push({ type: "handshake", a: agent.id, b: other.id, x: (agent.x + other.x) / 2, y: (agent.y + other.y) / 2, at: world.time });
        }
      }
    }

    if (neighbours) {
      alignmentX = alignmentX / neighbours - agent.vx;
      alignmentY = alignmentY / neighbours - agent.vy;
      cohesionX = cohesionX / neighbours - agent.x;
      cohesionY = cohesionY / neighbours - agent.y;
      agent.vx += (alignmentX * 0.008 + cohesionX * 0.000035 + separationX * 1.9) * step;
      agent.vy += (alignmentY * 0.008 + cohesionY * 0.000035 + separationY * 1.9) * step;
    }

    const wander = world.time * 0.00018 + agent.phase;
    agent.vx += Math.cos(wander * 1.7) * 0.0022 * step;
    agent.vy += Math.sin(wander * 1.3) * 0.0022 * step;

    const centerX = width * 0.56;
    const centerY = height * 0.5;
    agent.vx += (centerX - agent.x) * 0.000003 * step;
    agent.vy += (centerY - agent.y) * 0.000003 * step;

    if (pointer?.active) {
      const dx = pointer.x - agent.x;
      const dy = pointer.y - agent.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < 210 * 210 && distanceSquared > 16) {
        const force = (1 - Math.sqrt(distanceSquared) / 210) * 0.018;
        agent.vx += dx * force * 0.008 * step;
        agent.vy += dy * force * 0.008 * step;
      }
    }

    const speed = Math.hypot(agent.vx, agent.vy);
    const limit = 0.34 + agent.energy * 0.22;
    if (speed > limit) {
      agent.vx = (agent.vx / speed) * limit;
      agent.vy = (agent.vy / speed) * limit;
    }

    agent.x += agent.vx * step;
    agent.y += agent.vy * step;
    agent.vx *= 0.997;
    agent.vy *= 0.997;

    const margin = 70;
    if (agent.x < margin) agent.vx += 0.012 * step;
    if (agent.x > width - margin) agent.vx -= 0.012 * step;
    if (agent.y < margin) agent.vy += 0.012 * step;
    if (agent.y > height - margin) agent.vy -= 0.012 * step;

    if (world.time % 70 < dt) {
      agent.history.push({ x: agent.x, y: agent.y });
      if (agent.history.length > 26) agent.history.shift();
    }
  }

  for (const [key, strength] of world.relationships) {
    if (strength < 0.004) world.relationships.delete(key);
    else world.relationships.set(key, strength * Math.pow(0.99972, step));
  }

  world.events.push(...nextEvents);
  if (world.events.length > 24) world.events.splice(0, world.events.length - 24);
  return nextEvents;
}

export function countStrongRelationships(world, threshold = 0.34) {
  let count = 0;
  for (const strength of world.relationships.values()) {
    if (strength >= threshold) count += 1;
  }
  return count;
}
