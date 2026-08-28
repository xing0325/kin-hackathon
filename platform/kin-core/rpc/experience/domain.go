// Package experience owns Needs, Experience Artifacts and permission-filtered matching.
package experience

import "time"

type Need struct {
	ID        string
	OwnerID   string
	Problem   string
	Context   map[string]any
	Status    string
	CreatedAt time.Time
}

type Artifact struct {
	ID         string
	OwnerID    string
	Problem    string
	Context    string
	Cause      string
	Worked     string
	Failed     string
	Confidence float64
	Visibility string
	CreatedAt  time.Time
}

type Match struct {
	NeedID           string
	ArtifactID       string
	Score            float64
	Explanation      string
	PermissionStatus string
}

func (a Artifact) Shareable() bool {
	return a.Visibility != "private" && a.Confidence >= 0 && a.Confidence <= 1
}
