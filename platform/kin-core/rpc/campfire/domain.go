// Package campfire owns temporary multi-agent groups and team proposals.
package campfire

import "time"

type Member struct {
	AgentID  string
	Skills   []string
	Needs    []string
	Building string
}

type Room struct {
	ID        string
	Name      string
	CreatorID string
	Members   []Member
	ExpiresAt time.Time
}

type Role struct {
	AgentID string
	Name    string
	Why     string
}

type TeamProposal struct {
	ID          string
	CampfireID  string
	ProjectName string
	Rationale   string
	Roles       []Role
	Missing     []string
}
