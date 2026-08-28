import CoreBluetooth
import Foundation

private let serviceControl = CBUUID(string: "FFC0")
private let characteristicCommands = CBUUID(string: "FFC1")
private let characteristicEvents = CBUUID(string: "FFC4")
private let expectedNames: Set<String> = ["NODE-A7B2", "NODE-7FAE"]

struct RelayConfiguration {
    let apiBase: URL
    let agentToken: String
    let matchID: String
    let proofNonce: String

    static func fromEnvironment() -> RelayConfiguration {
        let env = ProcessInfo.processInfo.environment
        guard let base = URL(string: env["NODE_API_BASE"] ?? "http://127.0.0.1:8011") else {
            fatalError("NODE_API_BASE is not a valid URL")
        }
        guard let matchID = env["NODE_MATCH_ID"], !matchID.isEmpty else {
            fatalError("NODE_MATCH_ID is required")
        }
        let token = env["NODE_AGENT_TOKEN"] ?? "change-me"
        let nonce = env["NODE_PROOF_NONCE"] ?? "cardputer-live-proof"
        precondition(nonce.count >= 8, "NODE_PROOF_NONCE must contain at least 8 characters")
        return RelayConfiguration(apiBase: base, agentToken: token, matchID: matchID, proofNonce: nonce)
    }
}

final class GatewayClient {
    private let config: RelayConfiguration
    private let session: URLSession

    init(config: RelayConfiguration) {
        self.config = config
        self.session = URLSession(configuration: .ephemeral)
    }

    func fetchSessionState(completion: @escaping (Result<String, Error>) -> Void) {
        let url = config.apiBase
            .appendingPathComponent("v1/agent-link/sessions")
            .appendingPathComponent(config.matchID)
        var request = URLRequest(url: url)
        request.setValue(config.agentToken, forHTTPHeaderField: "X-Agent-Gateway-Token")
        session.dataTask(with: request) { data, response, error in
            if let error { completion(.failure(error)); return }
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            guard (200..<300).contains(statusCode), let data else {
                completion(.failure(NSError(
                    domain: "AgentLinkRelay", code: statusCode,
                    userInfo: [NSLocalizedDescriptionKey: "session state HTTP \(statusCode)"]
                )))
                return
            }
            do {
                let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                guard let status = json?["status"] as? String else {
                    throw NSError(domain: "AgentLinkRelay", code: -1,
                                  userInfo: [NSLocalizedDescriptionKey: "session state has no status"])
                }
                completion(.success(status))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }

    func forward(deviceName: String, frame: AgentLinkFrame, completion: @escaping (Result<String, Error>) -> Void) {
        let suffix = UUID().uuidString.lowercased()
        let body: [String: Any] = [
            "event_id": "ble-\(deviceName.lowercased())-\(suffix)",
            "device_name": deviceName,
            "wire_event_id": Int(frame.eventID),
            "data_base64": frame.payload.base64EncodedString(),
            "occurred_at": ISO8601DateFormatter().string(from: Date()),
            "match_id": config.matchID,
            "proof_nonce": config.proofNonce,
        ]
        var request = URLRequest(url: config.apiBase.appendingPathComponent("v1/agent-link/events"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(config.agentToken, forHTTPHeaderField: "X-Agent-Gateway-Token")
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            completion(.failure(error))
            return
        }
        session.dataTask(with: request) { data, response, error in
            if let error { completion(.failure(error)); return }
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            let text = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
            if (200..<300).contains(status) {
                completion(.success("HTTP \(status) \(text)"))
            } else {
                completion(.failure(NSError(
                    domain: "AgentLinkRelay", code: status,
                    userInfo: [NSLocalizedDescriptionKey: "HTTP \(status) \(text)"]
                )))
            }
        }.resume()
    }
}

final class AgentLinkRelay: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    private let gateway: GatewayClient
    private var central: CBCentralManager!
    private var peripherals: [UUID: CBPeripheral] = [:]
    private var names: [UUID: String] = [:]
    private var readyNames: Set<String> = []
    private var commandChannels: [UUID: CBCharacteristic] = [:]
    private var commandSequence: UInt8 = 1
    private var connectedFeedbackSent = false

    init(configuration: RelayConfiguration) {
        self.gateway = GatewayClient(config: configuration)
        super.init()
        self.central = CBCentralManager(delegate: self, queue: nil)
    }

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            print("BLE_STATE: poweredOn; scanning for NODE-A7B2 and NODE-7FAE")
            central.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        case .unauthorized: print("BLE_STATE: unauthorized; enable Bluetooth permission for Codex/Terminal")
        case .poweredOff: print("BLE_STATE: poweredOff")
        case .unsupported: print("BLE_STATE: unsupported")
        case .resetting: print("BLE_STATE: resetting")
        case .unknown: print("BLE_STATE: unknown")
        @unknown default: print("BLE_STATE: unrecognized")
        }
    }

    func centralManager(
        _ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi RSSI: NSNumber
    ) {
        let advertisedName = advertisementData[CBAdvertisementDataLocalNameKey] as? String
        guard let name = advertisedName ?? peripheral.name, expectedNames.contains(name) else { return }
        guard peripherals[peripheral.identifier] == nil else { return }
        peripherals[peripheral.identifier] = peripheral
        names[peripheral.identifier] = name
        peripheral.delegate = self
        print("BLE_DISCOVERED: \(name) rssi=\(RSSI)")
        central.connect(peripheral)
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        let name = names[peripheral.identifier] ?? peripheral.name ?? "unknown"
        print("BLE_CONNECTED: \(name)")
        peripheral.discoverServices([serviceControl])
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        print("BLE_CONNECT_FAILED: \(names[peripheral.identifier] ?? "unknown") \(error?.localizedDescription ?? "")")
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        let name = names[peripheral.identifier] ?? peripheral.name ?? "unknown"
        readyNames.remove(name)
        commandChannels.removeValue(forKey: peripheral.identifier)
        connectedFeedbackSent = false
        print("BLE_DISCONNECTED: \(name) \(error?.localizedDescription ?? "")")
        central.connect(peripheral)
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let error { print("BLE_SERVICE_ERROR: \(error.localizedDescription)"); return }
        for service in peripheral.services ?? [] where service.uuid == serviceControl {
            peripheral.discoverCharacteristics([characteristicCommands, characteristicEvents], for: service)
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        if let error { print("BLE_CHARACTERISTIC_ERROR: \(error.localizedDescription)"); return }
        for characteristic in service.characteristics ?? [] {
            if characteristic.uuid == characteristicCommands {
                commandChannels[peripheral.identifier] = characteristic
            } else if characteristic.uuid == characteristicEvents {
                peripheral.setNotifyValue(true, for: characteristic)
            }
        }
    }

    private func sendScreen(_ message: String, marksConnected: Bool) {
        if marksConnected && connectedFeedbackSent { return }
        guard readyNames == expectedNames, commandChannels.count == expectedNames.count else {
            print("DOWNLINK_WAITING: command channels are not ready")
            return
        }
        if marksConnected { connectedFeedbackSent = true }
        let text = Data(message.utf8)
        for peripheral in peripherals.values {
            guard let channel = commandChannels[peripheral.identifier] else { continue }
            let name = names[peripheral.identifier] ?? "unknown"
            let frame = buildIoActuateCommand(endpoint: "screen0", arguments: text, sequence: commandSequence)
            commandSequence &+= 1
            peripheral.writeValue(frame, for: channel, type: .withResponse)
            print("DOWNLINK_SENT: \(name) screen=\(message.replacingOccurrences(of: "\n", with: "/"))")
        }
    }

    private func sendConnectedFeedback() {
        sendScreen("KIN CONNECTED\nCONTEXT SAVED", marksConnected: true)
    }

    private func synchronizeSessionState() {
        gateway.fetchSessionState { result in
            DispatchQueue.main.async {
                switch result {
                case .success("connected"):
                    print("SESSION_RESTORED: connected")
                    self.sendConnectedFeedback()
                case .success(let status):
                    self.connectedFeedbackSent = false
                    print("SESSION_RESTORED: \(status)")
                    self.sendScreen("KIN READY\nPRESS G0", marksConnected: false)
                case .failure(let error):
                    print("SESSION_RESTORE_ERROR: \(error.localizedDescription)")
                }
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
        let name = names[peripheral.identifier] ?? peripheral.name ?? "unknown"
        if let error {
            print("DOWNLINK_ERROR: \(name) \(error.localizedDescription)")
        } else if characteristic.uuid == characteristicCommands {
            print("DOWNLINK_OK: \(name)")
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) {
        let name = names[peripheral.identifier] ?? peripheral.name ?? "unknown"
        if let error { print("BLE_SUBSCRIBE_ERROR: \(name) \(error.localizedDescription)"); return }
        if characteristic.isNotifying {
            readyNames.insert(name)
            print("BLE_READY: \(name) subscribed=FFC4 ready=\(readyNames.count)/2")
            if readyNames == expectedNames {
                print("RELAY_READY: shake both devices, then press G0 on both")
                synchronizeSessionState()
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        let name = names[peripheral.identifier] ?? peripheral.name ?? "unknown"
        if let error { print("BLE_NOTIFY_ERROR: \(name) \(error.localizedDescription)"); return }
        guard characteristic.uuid == characteristicEvents, let data = characteristic.value else { return }
        do {
            let frame = try parseAgentLinkEvent(data)
            guard frame.eventID == 1 || frame.eventID == 100 else {
                return
            }
            print("BLE_EVENT: \(name) event=\(frame.eventID) bytes=\(frame.payload.count)")
            gateway.forward(deviceName: name, frame: frame) { result in
                DispatchQueue.main.async {
                    switch result {
                    case .success(let text):
                        print("GATEWAY_OK: \(name) \(text)")
                        if text.contains("\"status\":\"connected\"") {
                            self.sendConnectedFeedback()
                        }
                    case .failure(let error): print("GATEWAY_ERROR: \(name) \(error.localizedDescription)")
                    }
                }
            }
        } catch {
            print("BLE_FRAME_ERROR: \(name) \(error)")
        }
    }
}

let configuration = RelayConfiguration.fromEnvironment()
print("RELAY_CONFIG: api=\(configuration.apiBase.absoluteString) match=\(configuration.matchID)")
let relay = AgentLinkRelay(configuration: configuration)
withExtendedLifetime(relay) {
    RunLoop.main.run()
}
