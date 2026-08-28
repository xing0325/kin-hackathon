#pragma once

// Pure state guards keep physical input from emitting events outside an active match.
inline bool CanConfirm(bool armed, bool confirmed, bool link_ready, bool connected) {
    return armed && !confirmed && link_ready && !connected;
}
inline bool CanSendGesture(bool armed, bool confirmed, bool gesture_seen, bool link_ready, bool connected) {
    return armed && confirmed && !gesture_seen && link_ready && !connected;
}
