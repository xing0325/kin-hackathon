import Foundation

struct AgentLinkFrame: Equatable {
    let messageType: UInt8
    let eventID: UInt8
    let sequence: UInt8
    let payload: Data
}

struct AgentLinkVectorReading: Equatable {
    let endpoint: String
    let x: Float
    let y: Float
    let z: Float
}

enum AgentLinkFrameError: Error, CustomStringConvertible {
    case tooShort
    case unsupportedVersion(UInt8)
    case notEvent(UInt8)
    case lengthMismatch(expected: Int, actual: Int)

    var description: String {
        switch self {
        case .tooShort: return "frame shorter than 6-byte Agent_link header"
        case .unsupportedVersion(let version): return "unsupported Agent_link version \(version)"
        case .notEvent(let type): return "frame is not an event (type=\(type))"
        case .lengthMismatch(let expected, let actual):
            return "payload length mismatch (expected=\(expected), actual=\(actual))"
        }
    }
}

func parseAgentLinkEvent(_ data: Data) throws -> AgentLinkFrame {
    guard data.count >= 6 else { throw AgentLinkFrameError.tooShort }
    let bytes = [UInt8](data)
    guard bytes[0] == 0x01 else { throw AgentLinkFrameError.unsupportedVersion(bytes[0]) }
    let messageType = bytes[1] & 0x7F
    guard messageType == 0x03 else { throw AgentLinkFrameError.notEvent(messageType) }
    let payloadLength = Int(bytes[4]) | (Int(bytes[5]) << 8)
    guard data.count == 6 + payloadLength else {
        throw AgentLinkFrameError.lengthMismatch(expected: payloadLength, actual: data.count - 6)
    }
    return AgentLinkFrame(
        messageType: messageType,
        eventID: bytes[2],
        sequence: bytes[3],
        payload: data.subdata(in: 6..<data.count)
    )
}

func parseVectorReading(_ payload: Data) -> AgentLinkVectorReading? {
    let bytes = [UInt8](payload)
    guard let idLength = bytes.first.map(Int.init), idLength > 0,
          bytes.count == 1 + idLength + 1 + 12 else { return nil }
    let idStart = 1
    let idEnd = idStart + idLength
    // Agent_link's agent_val_t is zero-based; AGENT_VAL_VEC3 is 5.
    guard let endpoint = String(bytes: bytes[idStart..<idEnd], encoding: .utf8),
          bytes[idEnd] == 5 else { return nil }
    func float(at offset: Int) -> Float {
        let bits = UInt32(bytes[offset]) | UInt32(bytes[offset + 1]) << 8 |
            UInt32(bytes[offset + 2]) << 16 | UInt32(bytes[offset + 3]) << 24
        return Float(bitPattern: bits)
    }
    let valueStart = idEnd + 1
    return AgentLinkVectorReading(
        endpoint: endpoint,
        x: float(at: valueStart),
        y: float(at: valueStart + 4),
        z: float(at: valueStart + 8)
    )
}

func buildIoActuateCommand(endpoint: String, arguments: Data, sequence: UInt8) -> Data {
    let endpointBytes = Data(endpoint.utf8)
    precondition(!endpointBytes.isEmpty && endpointBytes.count <= 63)
    var payload = Data([UInt8(endpointBytes.count)])
    payload.append(endpointBytes)
    payload.append(arguments)
    precondition(payload.count <= Int(UInt16.max))

    let length = UInt16(payload.count)
    var frame = Data([
        0x01, 0x01, 0x33, sequence,
        UInt8(length & 0xff), UInt8((length >> 8) & 0xff),
    ])
    frame.append(payload)
    return frame
}
