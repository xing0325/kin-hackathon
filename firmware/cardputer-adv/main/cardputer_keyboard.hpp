#pragma once
#include <cstdint>
#include <M5Unified.h>

// Cardputer-Adv keyboard: TCA8418 @ 0x34, SDA=8, SCL=9.
// Returns a newly pressed numeric key 1..5, or 0 when no key is pending.
class CardputerKeyboard {
 public:
  bool begin() {
    if (!M5.In_I2C.begin(I2C_NUM_0, 8, 9)) return false;
    if (!M5.In_I2C.scanID(0x34, 400000)) return false;
    // TCA8418: 7 rows + 8 columns (Cardputer-Adv matrix), then clear FIFO.
    ok_ = M5.In_I2C.writeRegister8(0x34, 0x1D, 0x7F, 400000);
    ok_ = ok_ && M5.In_I2C.writeRegister8(0x34, 0x1E, 0xFF, 400000);
    ok_ = ok_ && M5.In_I2C.writeRegister8(0x34, 0x1F, 0x00, 400000);
    while (M5.In_I2C.readRegister8(0x34, 0x04, 400000) != 0) {}
    ok_ = ok_ && M5.In_I2C.writeRegister8(0x34, 0x01, 0x01, 400000);
    return ok_;
  }
  uint8_t pressedNumber() {
    if (!ok_) return 0;
    const uint8_t event = M5.In_I2C.readRegister8(0x34, 0x04, 400000);
    if (!event || (event & 0x80)) return 0;
    // TCA8418 raw scan codes for Cardputer-Adv's number row 1..5.
    switch (event & 0x7F) { case 5: return 1; case 11: return 2; case 15: return 3; case 21: return 4; case 25: return 5; default: return 0; }
  }
 private: bool ok_ = false;
};
