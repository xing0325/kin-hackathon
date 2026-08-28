/** Stable hand-written frontend subset. Generate full clients from openapi.json. */
export type AgentEventType =
  | "device.online"
  | "device.offline"
  | "presence.heartbeat"
  | "handshake.gesture"
  | "handshake.confirmed"
  | "button.pressed"
  | "sensor.reading";

export interface AgentEvent {
  event_id: string;
  device_id: string;
  type: AgentEventType;
  occurred_at: string;
  payload: Record<string, unknown>;
}

/** ROROLEE / AgentStack forwarding envelope for official Agent_link packets. */
export interface AgentLinkWireEvent {
  event_id: string;
  device_name: "NODE-A7B2" | "NODE-7FAE" | string;
  wire_event_id: 1 | 100;
  data_base64: string;
  occurred_at: string;
  match_id: string;
  proof_nonce: string;
}

export interface MatchView {
  id: string;
  user_a_id: string;
  user_b_id: string;
  score: number;
  reasons: string[];
  status: "candidate" | "handshaking" | "connected" | "expired" | "cancelled";
  expires_at: string;
  peer?: { id: string; handle: string; display_name: string };
}

export interface HandshakeView {
  id: string;
  match_id: string;
  status: "pending" | "connected" | "expired" | "cancelled";
  user_a_confirmed: boolean;
  user_b_confirmed: boolean;
  gesture_a_seen: boolean;
  gesture_b_seen: boolean;
  completed_at?: string;
  relationship_id?: string;
}

export interface RelationshipView {
  id: string;
  user_a_id: string;
  user_b_id: string;
  handshake_id: string;
  shared_context: {
    title: string;
    why_you_met: string[];
    user_a_building: string;
    user_b_building: string;
    next_step: string;
  };
  visibility: string;
  created_at: string;
}
