package handshake

import (
	"testing"
	"time"
)

func TestSessionRequiresBilateralProof(t *testing.T) {
	now := time.Unix(100, 0)
	session := Session{ExpiresAt: now.Add(time.Minute), GestureWindow: 3 * time.Second}
	if session.State(now) != StateReady || session.ReadyToFinalize() {
		t.Fatal("empty session should be ready but not finalizable")
	}
	a, b := now, now.Add(2*time.Second)
	session.AConfirmedAt, session.BConfirmedAt = &a, &a
	session.AGestureAt, session.BGestureAt = &a, &b
	if session.State(now) != StateHandshaking || !session.ReadyToFinalize() {
		t.Fatal("bilateral proof inside the window should finalize")
	}
	session.RelationshipID = "rel_1"
	if session.State(now) != StateConnected {
		t.Fatal("relationship should lock connected state")
	}
}
