package kincontext

import (
	"testing"
	"time"
)

func TestGrantActive(t *testing.T) {
	now := time.Unix(100, 0)
	future := now.Add(time.Minute)
	past := now.Add(-time.Minute)
	if !(Grant{GrantVersion: 1, ExpiresAt: &future}).Active(now) {
		t.Fatal("future grant should be active")
	}
	if (Grant{GrantVersion: 1, ExpiresAt: &past}).Active(now) {
		t.Fatal("expired grant should be inactive")
	}
	if (Grant{}).Active(now) {
		t.Fatal("unversioned grant should be inactive")
	}
}
