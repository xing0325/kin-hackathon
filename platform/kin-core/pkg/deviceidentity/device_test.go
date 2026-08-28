package deviceidentity

import "testing"

func TestNormalizeHardwareUID(t *testing.T) {
	got, err := NormalizeHardwareUID(" node-a7b2 ")
	if err != nil || got != "NODE-A7B2" {
		t.Fatalf("got %q, %v", got, err)
	}
	if _, err := NormalizeHardwareUID("x"); err == nil {
		t.Fatal("short uid should be rejected")
	}
}
