export interface BaseConverter {
  encode(buffer: Uint8Array | number[]): string
  decodeUnsafe(string: string): Uint8Array | undefined
  decode(string: string): Uint8Array
}

export default function base(ALPHABET: string, name: string): BaseConverter
