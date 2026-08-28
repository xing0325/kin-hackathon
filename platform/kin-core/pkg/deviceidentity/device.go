package deviceidentity

import (
	"errors"
	"regexp"
	"strings"
)

var hardwareUIDPattern = regexp.MustCompile(`^[A-Z0-9][A-Z0-9_-]{3,127}$`)

// NormalizeHardwareUID produces the stable identifier used by presence and handshake services.
func NormalizeHardwareUID(value string) (string, error) {
	value = strings.ToUpper(strings.TrimSpace(value))
	if !hardwareUIDPattern.MatchString(value) {
		return "", errors.New("invalid hardware uid")
	}
	return value, nil
}
