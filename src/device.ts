const makeLongUuid = (shortUuid: string): string => `0000${shortUuid}-0000-1000-8000-00805f9b34fb`
const DEVICE_NAME = "QN-Scale";
export const PACKET_1_RESPONSE = new Uint8Array([0x13, 0x09, 0x15, 0x01, 0x10, 0x00, 0x00, 0x00, 0x42]);
export const PACKET_2_RESPONSE = new Uint8Array([0x20, 0x08, 0x15, 0x09, 0x0b, 0xac, 0x29, 0x26]);
export const PACKET_3_RESPONSE = new Uint8Array([0x1f, 0x05, 0x15, 0x10, 0x49]);
const SERVICE_1 = makeLongUuid("ffe0");

export const EVENT_CONNECTED = "device_connected";
export const EVENT_DISCONNECTED = "device_disconnected";
export const EVENT_WEIGHT = "device_weight";
export const EVENT_WEIGHT_UNSTABLE = "device_weight_unstable";


interface BasePacket {
    packetId: number
    len: number
    checksum: number
    data: Buffer

    toString(): string
}

interface FirstPacket extends BasePacket {
    packetId: 0x12

}
interface SecondPacket extends BasePacket {
    packetId: 0x14
}

interface WeightDataPacket extends BasePacket {
    packetId: 0x10
    scaleType: number
    weightValue: number
}


export type Packet = FirstPacket | SecondPacket | WeightDataPacket


const parseIncomingPacket = (dataView: DataView): any => {
    // convert to Uint8Array
    const buf = new Uint8Array(dataView.buffer)

    const packetId = buf[0] as Packet['packetId']
    const len = buf[1]
    const checksum = buf[buf.length - 1]
    const packet: Packet = { packetId, len, checksum, data: buf } as Packet
    switch (packet.packetId) {
        case 0x12:
            return packet
        case 0x14:
            return packet
        case 0x10:
            packet.scaleType = buf[2]
            packet.weightValue = ((buf[3] << 8) + buf[4]) / 100
            return packet
        default:
            return packet
    }
}


export const writeToUuid = async (
    label: string,
    char: any,
    data: Uint8Array
) => {
    console.log({ name: `${label} 👉` }, data);
    await char.writeValue(data);
};


const handlePacket = async (p: Packet, label: string, gattCharacteristic: any) => {

    switch (p.packetId) {
        case 0x12:
            // ????
            await writeToUuid(
                label,
                gattCharacteristic,
                PACKET_1_RESPONSE
            );
            return;
        case 0x14:
            // turn on bluetooth lamp
            await writeToUuid(
                label,
                gattCharacteristic,
                PACKET_2_RESPONSE
            );
            return;
        case 0x10:
            const flag = p.data[5];
            if (flag === 0) {
                console.log("liveupdate", p.weightValue);
                // emit event to update UI
                document.dispatchEvent(new CustomEvent(EVENT_WEIGHT_UNSTABLE, { detail: {weight: p.weightValue, unit: "kg"} }));
            } else if (flag === 1) {

                // emit event to update UI
                document.dispatchEvent(new CustomEvent(EVENT_WEIGHT, { detail: {weight: p.weightValue, unit: "kg"} }));

                // console.log(`✅ Packet 3`);
                // send stop
                await writeToUuid(
                    label,
                    gattCharacteristic,
                    PACKET_3_RESPONSE
                );
            }
            return;
        default:
            return;
    }
};


export async function connectToBluetoothDevice() {
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: DEVICE_NAME }],
            optionalServices: [SERVICE_1]
        });

        device.addEventListener('gattserverdisconnected', (e) => {
            console.log('Disconnected');
            // emit event to update UI
            document.dispatchEvent(new CustomEvent(EVENT_DISCONNECTED));
        });
        
        // when we get a device, try to connect to it
        const server = await device.gatt?.connect();
        if (!server) {
            throw new Error("No server")
        }
        document.dispatchEvent(new CustomEvent(EVENT_CONNECTED));
        const svc = await server.getPrimaryService(SERVICE_1);
        if (!svc) {
            throw new Error("No service")
        }

        const ffe1 = await svc.getCharacteristic(makeLongUuid("ffe1"));
        const ffe3 = await svc.getCharacteristic(makeLongUuid("ffe3"));

        if (!ffe1 || !ffe3) {
            throw new Error("No characteristics")
        }

        ffe1.addEventListener('characteristicvaluechanged', (e: any) => {
            if (!e?.target?.value) {
                console.error("No value")
            }
            handlePacket(parseIncomingPacket(e.target.value), "ffe3", ffe3)
        });
        ffe1.startNotifications();


    } catch (error) {
        console.error("Bluetooth Device connection failed:", error);
    }

}