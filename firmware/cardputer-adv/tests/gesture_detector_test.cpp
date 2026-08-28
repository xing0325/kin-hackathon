#include <cassert>
#include <cstdio>

#include "../main/gesture_detector.hpp"

int main() {
    GestureDetector detector;
    assert(!detector.update(0.0f, 0.0f, 1.0f).candidate);
    assert(!detector.update(0.02f, -0.01f, 1.01f).candidate);
    assert(detector.update(0.85f, -0.20f, 1.25f).candidate);

    GestureDetector delta_detector;
    assert(!delta_detector.update(0.0f, 0.0f, 1.0f).candidate);
    const auto delta = delta_detector.update(0.70f, 0.0f, 0.90f);
    assert(delta.candidate && delta.delta >= 0.55f);

    GestureDetector quiet_detector;
    quiet_detector.update(0.0f, 0.0f, 1.0f);
    for (int index = 0; index < 20; ++index) {
        assert(!quiet_detector.update(0.03f, -0.02f, 0.99f).candidate);
    }
    std::puts("GESTURE_DETECTOR_TEST_RESULT: 25 passed");
}
