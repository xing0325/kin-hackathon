#pragma once

#include <cmath>

struct GestureSample {
    float magnitude;
    float delta;
    bool candidate;
};

class GestureDetector {
public:
    GestureSample update(float x, float y, float z) {
        const float magnitude = std::sqrt(x * x + y * y + z * z);
        float delta = 0.0f;
        if (initialized_) {
            const float dx = x - last_x_;
            const float dy = y - last_y_;
            const float dz = z - last_z_;
            delta = std::sqrt(dx * dx + dy * dy + dz * dz);
        }
        last_x_ = x;
        last_y_ = y;
        last_z_ = z;
        const bool candidate = initialized_ && (magnitude >= 1.45f || delta >= 0.55f);
        initialized_ = true;
        return {magnitude, delta, candidate};
    }

private:
    bool initialized_ = false;
    float last_x_ = 0.0f;
    float last_y_ = 0.0f;
    float last_z_ = 0.0f;
};
