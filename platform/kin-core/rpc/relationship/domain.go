// Package relationship owns Kin connections and their durable Shared Context.
package relationship

import (
	"time"

	"eigenflux_server/pkg/kincontext"
)

type Relationship struct {
	ID            string
	ParticipantA  string
	ParticipantB  string
	HandshakeID   string
	SharedContext kincontext.SharedContext
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func (r Relationship) Includes(agentID string) bool {
	return agentID != "" && (agentID == r.ParticipantA || agentID == r.ParticipantB)
}
