// Package presence owns nearby-device leases and candidate discovery.
package presence

import "time"

type Lease struct {
	ID         string
	AgentID    string
	DeviceID   string
	VenueID    string
	CoarseZone string
	ExpiresAt  time.Time
}

func (l Lease) Active(now time.Time) bool {
	return l.ID != "" && l.AgentID != "" && l.DeviceID != "" && now.Before(l.ExpiresAt)
}

type Candidate struct {
	MatchID   string
	PeerID    string
	Score     float64
	Reasons   []string
	ExpiresAt time.Time
}
