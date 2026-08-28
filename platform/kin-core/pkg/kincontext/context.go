package kincontext

import "time"

// Visibility is the KIN-wide sharing boundary, ordered from broadest to narrowest.
type Visibility string

const (
	VisibilityPublic  Visibility = "public"
	VisibilityEvent   Visibility = "event"
	VisibilityFriends Visibility = "friends"
	VisibilityTrusted Visibility = "trusted"
	VisibilityPrivate Visibility = "private"
)

// Grant records the exact context fields approved for one relationship action.
type Grant struct {
	OwnerID      string
	AudienceID   string
	Visibility   Visibility
	Fields       []string
	Purpose      string
	GrantedAt    time.Time
	ExpiresAt    *time.Time
	GrantVersion int64
}

// Active reports whether the grant is usable at the supplied time.
func (g Grant) Active(now time.Time) bool {
	return g.GrantVersion > 0 && (g.ExpiresAt == nil || now.Before(*g.ExpiresAt))
}

// SharedContext is the durable memory produced by a completed handshake.
type SharedContext struct {
	RelationshipID  string
	ParticipantIDs  []string
	MetAt           time.Time
	Venue           string
	WhyWeMet        []string
	CommonInterests []string
	ProjectOverlap  []string
	Conversation    []string
	FollowUps       []FollowUp
	Revision        int64
}

type FollowUp struct {
	ID          string
	OwnerID     string
	Description string
	Status      string
	DueAt       *time.Time
}
