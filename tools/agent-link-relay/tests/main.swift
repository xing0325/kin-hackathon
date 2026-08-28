import Foundation

func expect(_ condition: @autoclosure () -> Bool, _ message: String) {
    if !condition() {
        FileHandle.standardError.write(Data("FAIL: \(message)\n".utf8))
        exit(1)
    }
}

let gesturePayload = Data(#"{"kind":"handshake.gesture","peak_g":2.14}"#.utf8)
var gesture = Data([0x01, 0x03, 0x64, 0x00, UInt8(gesturePayload.count), 0x00])
gesture.append(gesturePayload)
let parsedGesture = try parseAgentLinkEvent(gesture)
expect(parsedGesture.eventID == 100, "custom event id")
expect(parsedGesture.payload == gesturePayload, "custom payload")

let button = Data([0x01, 0x03, 0x01, 0x00, 0x02, 0x00, 0x00, 0x01])
let parsedButton = try parseAgentLinkEvent(button)
expect(parsedButton.eventID == 1, "button event id")
expect(parsedButton.payload == Data([0, 1]), "button payload")

do {
    _ = try parseAgentLinkEvent(Data([0x01, 0x03, 0x01]))
    expect(false, "short frame rejected")
} catch AgentLinkFrameError.tooShort {}

do {
    _ = try parseAgentLinkEvent(Data([0x01, 0x03, 0x01, 0, 3, 0, 0, 1]))
    expect(false, "length mismatch rejected")
} catch AgentLinkFrameError.lengthMismatch(let expected, let actual) {
    expect(expected == 3 && actual == 2, "length error values")
}

print("PROTOCOL_TEST_RESULT: 4 passed")

var vectorPayload = Data([9])
vectorPayload.append(Data("imu_accel".utf8))
vectorPayload.append(5)
for value in [Float(0.25), Float(-0.5), Float(1.75)] {
    var bits = value.bitPattern.littleEndian
    withUnsafeBytes(of: &bits) { vectorPayload.append(contentsOf: $0) }
}
let vector = parseVectorReading(vectorPayload)
expect(vector?.endpoint == "imu_accel", "vector endpoint")
expect(vector?.x == 0.25 && vector?.y == -0.5 && vector?.z == 1.75, "vector values")
expect(parseVectorReading(Data([0])) == nil, "malformed vector rejected")
print("VECTOR_READING_TEST_RESULT: 3 passed")

let connected = buildIoActuateCommand(
    endpoint: "screen0",
    arguments: Data("KIN CONNECTED\nCONTEXT SAVED".utf8),
    sequence: 7
)
let connectedBytes = [UInt8](connected)
expect(connectedBytes[0...3] == [0x01, 0x01, 0x33, 0x07], "IoActuate command header")
let connectedLength = Int(connectedBytes[4]) | (Int(connectedBytes[5]) << 8)
expect(connectedLength == connected.count - 6, "IoActuate payload length")
expect(connectedBytes[6] == 7, "screen0 endpoint length")
expect(String(data: connected.subdata(in: 7..<14), encoding: .utf8) == "screen0", "screen0 endpoint")

print("DOWNLINK_TEST_RESULT: 4 passed")
