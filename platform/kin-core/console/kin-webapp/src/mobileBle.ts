export const KIN_SERVICE = 0xffc0;
export const KIN_COMMAND = 0xffc1;
export const KIN_EVENT = 0xffc4;

type Characteristic = { writeValue(data: BufferSource): Promise<void>; startNotifications(): Promise<Characteristic>; addEventListener(type: string, listener: (event: Event) => void): void };
type Device = { name?: string; gatt?: { disconnect?: () => void; connect(): Promise<{ getPrimaryService(uuid: number): Promise<{ getCharacteristic(uuid: number): Promise<Characteristic> }> }> } };
declare global { interface Navigator { bluetooth?: { requestDevice(options: { filters: { namePrefix: string }[]; optionalServices: number[] }): Promise<Device> } } }

export type KinEvent = { device: string; eventId: number; payload: Uint8Array };
export type KinConnection = { name: string; sendScreen(text: string): Promise<void>; disconnect(): void };

function ioActuateScreen(text: string, sequence = 1): Uint8Array {
  const endpoint = new TextEncoder().encode("screen0");
  const content = new TextEncoder().encode(text);
  const payloadLength = 1 + endpoint.length + content.length;
  return new Uint8Array([1, 1, 0x33, sequence, payloadLength & 255, payloadLength >> 8, endpoint.length, ...endpoint, ...content]);
}
function parseEvent(bytes: Uint8Array, device: string): KinEvent | null {
  if (bytes.length < 6 || bytes[0] !== 1 || (bytes[1] & 0x7f) !== 3) return null;
  const length = bytes[4] | (bytes[5] << 8);
  if (bytes.length !== 6 + length) return null;
  return { device, eventId: bytes[2], payload: bytes.slice(6) };
}
export async function connectKinDevice(onEvent?: (event: KinEvent) => void): Promise<KinConnection> {
  if (!navigator.bluetooth) throw new Error("请用 Android Chrome，并允许蓝牙权限");
  const device = await navigator.bluetooth.requestDevice({ filters: [{ namePrefix: "NODE-" }], optionalServices: [KIN_SERVICE] });
  if (!device.gatt) throw new Error("设备不支持 GATT");
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(KIN_SERVICE);
  const eventChannel = await service.getCharacteristic(KIN_EVENT);
  const command = await service.getCharacteristic(KIN_COMMAND);
  const name = device.name ?? "KIN device";
  await eventChannel.startNotifications();
  eventChannel.addEventListener("characteristicvaluechanged", (raw) => {
    const value = (raw.target as { value?: DataView }).value;
    if (!value) return;
    const event = parseEvent(new Uint8Array(value.buffer, value.byteOffset, value.byteLength), name);
    if (event) onEvent?.(event);
  });
  return { name, sendScreen: (text) => command.writeValue(ioActuateScreen(text).buffer as ArrayBuffer), disconnect: () => device.gatt?.disconnect?.() };
}
export type AwaitedKinDevices = { names: string[]; beginHandshake(): Promise<void>; disconnect(): void };
export async function connectKinDevices(count = 2, onProgress?: (text: string) => void): Promise<AwaitedKinDevices> {
  const devices: KinConnection[] = [];
  const buttons = new Set<string>(); const gestures = new Set<string>();
  let completionSent = false;
  const onEvent = async (event: KinEvent) => {
    if (event.eventId !== 1 && event.eventId !== 100) return;
    if (event.eventId === 1) buttons.add(event.device);
    if (event.eventId === 100) gestures.add(event.device);
    if (!completionSent && buttons.size === count && gestures.size === count) {
      completionSent = true;
      await Promise.all(devices.map((device) => device.sendScreen("KIN CONNECTED\nCONTEXT SAVED")));
      onProgress?.("CONTEXT SAVED · 两台设备握手成功");
    } else if (!completionSent && buttons.size === count) onProgress?.("双方已确认 · 现在一起握手");
    else if (!completionSent && buttons.size) onProgress?.("已确认 1/2 · 请确认另一台");
  };
  for (let index = 0; index < count; index += 1) {
    onProgress?.(`请选择第 ${index + 1} 台 KIN 设备…`);
    const device = await connectKinDevice(onEvent); devices.push(device);
    onProgress?.(`${device.name} 已连接 · ${devices.length}/${count}`);
  }
  return {
    names: devices.map((device) => device.name),
    beginHandshake: async () => { buttons.clear(); gestures.clear(); completionSent = false; await Promise.all(devices.map((device) => device.sendScreen("KIN READY\nPRESS G0"))); onProgress?.("MATCH READY · 两台按 G0，再一起握手"); },
    disconnect: () => devices.forEach((device) => device.disconnect()),
  };
}
