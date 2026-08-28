SWIFTC ?= swiftc
BUILD_DIR := build
RELAY := $(BUILD_DIR)/agent-link-relay
TEST := $(BUILD_DIR)/protocol-tests

.PHONY: all test clean

all: $(RELAY)

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

$(RELAY): Protocol.swift main.swift | $(BUILD_DIR)
	$(SWIFTC) -swift-version 5 -O -framework Foundation -framework CoreBluetooth Protocol.swift main.swift -o $(RELAY)

$(TEST): Protocol.swift tests/main.swift | $(BUILD_DIR)
	$(SWIFTC) -swift-version 5 Protocol.swift tests/main.swift -o $(TEST)

test: $(TEST)
	./$(TEST)

clean:
	python3 -c 'import shutil; shutil.rmtree("$(BUILD_DIR)", ignore_errors=True)'

