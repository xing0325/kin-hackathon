#include <cassert>
#include "handshake_gate.hpp"
int main() {
  assert(CanConfirm(true,false,true,false));
  assert(!CanConfirm(false,false,true,false));
  assert(!CanConfirm(true,true,true,false));
  assert(!CanConfirm(true,false,false,false));
  assert(!CanConfirm(true,false,true,true));
  assert(CanSendGesture(true,true,false,true,false));
  assert(!CanSendGesture(true,false,false,true,false));
  assert(!CanSendGesture(true,true,true,true,false));
  assert(!CanSendGesture(true,true,false,false,false));
  assert(!CanSendGesture(true,true,false,true,true));
  return 0;
}
