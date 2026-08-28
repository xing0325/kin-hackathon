package kinmatch

import (
	"math"
	"testing"
)

func TestScoreProfilesExplainsComplement(t *testing.T) {
	left := Profile{Skills: []string{"product"}, Needs: []string{"ESP32"}, Interests: []string{"agents"}}
	right := Profile{Skills: []string{"esp32"}, Needs: []string{"Product"}, Interests: []string{"agents"}}
	result := ScoreProfiles(left, right, .8)
	if math.Abs(result.Score-.7766666667) > .000001 {
		t.Fatalf("unexpected score %.8f", result.Score)
	}
	if len(result.Reasons) != 3 {
		t.Fatalf("expected three reasons, got %#v", result.Reasons)
	}
}
