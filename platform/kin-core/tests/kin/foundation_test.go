package kin_test

import (
	"testing"
	"time"

	"eigenflux_server/pkg/deviceidentity"
	"eigenflux_server/pkg/kinmatch"
	"eigenflux_server/rpc/handshake"
)

func TestFoundationContractsCompose(t *testing.T) {
	device, err := deviceidentity.NormalizeHardwareUID("node-a7b2")
	if err != nil || device != "NODE-A7B2" {
		t.Fatalf("device identity: %q %v", device, err)
	}
	result := kinmatch.ScoreProfiles(
		kinmatch.Profile{Needs: []string{"ESP32"}},
		kinmatch.Profile{Skills: []string{"esp32"}},
		.5,
	)
	if result.Score <= .05 || len(result.Reasons) == 0 {
		t.Fatalf("match result: %#v", result)
	}
	now := time.Unix(100, 0)
	a, b := now, now.Add(time.Second)
	session := handshake.Session{
		AConfirmedAt: &a, BConfirmedAt: &a,
		AGestureAt: &a, BGestureAt: &b,
		GestureWindow: 3 * time.Second,
		ExpiresAt:     now.Add(time.Minute),
	}
	if !session.ReadyToFinalize() {
		t.Fatal("composed handshake should finalize")
	}
}
