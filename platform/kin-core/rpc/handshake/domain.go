// Package handshake owns bilateral physical confirmation and connection finalization.
package handshake

import "time"

type State string

const (
	StateReady       State = "ready"
	StateHandshaking State = "handshaking"
	StateConnected   State = "connected"
	StateExpired     State = "expired"
)

type Session struct {
	ID             string
	MatchID        string
	ParticipantA   string
	ParticipantB   string
	AConfirmedAt   *time.Time
	BConfirmedAt   *time.Time
	AGestureAt     *time.Time
	BGestureAt     *time.Time
	GestureWindow  time.Duration
	ExpiresAt      time.Time
	RelationshipID string
}

func (s Session) State(now time.Time) State {
	if s.RelationshipID != "" {
		return StateConnected
	}
	if !now.Before(s.ExpiresAt) {
		return StateExpired
	}
	if s.AConfirmedAt != nil || s.BConfirmedAt != nil || s.AGestureAt != nil || s.BGestureAt != nil {
		return StateHandshaking
	}
	return StateReady
}

func (s Session) ReadyToFinalize() bool {
	if s.AConfirmedAt == nil || s.BConfirmedAt == nil || s.AGestureAt == nil || s.BGestureAt == nil {
		return false
	}
	delta := s.AGestureAt.Sub(*s.BGestureAt)
	if delta < 0 {
		delta = -delta
	}
	return delta <= s.GestureWindow
}
