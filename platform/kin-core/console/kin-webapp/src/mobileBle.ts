export const KIN_SERVICE = 0xffc0;
export const KIN_COMMAND = 0xffc1;
export const KIN_EVENT = 0xffc4;

type Characteristic = { writeValue(data: BufferSource): Promise<void>; startNotifications(): Promise<Characteristic>; addEventListener(type: string, listener: (event: Event) => void): void };
type Device = { name?: string; gatt?: { disconnect?: () => void; connect(): Promise<{ getPrimaryService(uuid: number): Promise<{ getCharacteristic(uuid: number): Promise<Characteristic> }> }> } };

declare global { interface Navigator { bluetooth?: { requestDevice(options: { filters: { namePrefix: string }[]; optionalServices: number[] }): Promise<Device> } } }

export async function connectKinDevice(onText?: (text: string) => void): Promise<{ name: string; disconnect: () => void }> {
  if (!navigator.bluetooth) throw new Error("请用 Android Chrome，并允许蓝牙权限");
  const device = await navigator.bluetooth.requestDevice({ filters: [{ namePrefix: "NODE-" }], optionalServices: [KIN_SERVICE] });
  if (!device.gatt) throw new Error("设备不支持 GATT");
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(KIN_SERVICE);
  const event = await service.getCharacteristic(KIN_EVENT);
  const command = await service.getCharacteristic(KIN_COMMAND);
  await event.startNotifications();
  event.addEventListener("characteristicvaluechanged", (raw) => {
    const value = (raw.target as { value?: DataView }).value;
    if (!value) return;
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    const text = new TextDecoder().decode(bytes).replace(/[\0\r]/g, "").trim();
    if (text) onText?.(text);
  });
  // Official Agent_link IoActuate command: 0x33, screen text is handled by Relay.
  await command.writeValue(new Uint8Array([0x33, 0x01]));
  return { name: device.name ?? "KIN device", disconnect: () => device.gatt?.disconnect?.() };
}

export async function connectKinDevices(count = 2, onText?: (text: string, connected: number) => void): Promise<{ names: string[]; disconnect: () => void }> {
  const devices: Array<{ name: string; disconnect: () => void }> = [];
  for (let index = 0; index < count; index += 1) {
    const device = await connectKinDevice((text) => onText?.(text, devices.length));
    devices.push(device);
    onText?.(`${device.name} 已连接`, devices.length);
  }
  return { names: devices.map((device) => device.name), disconnect: () => devices.forEach((device) => device.disconnect()) };
}
