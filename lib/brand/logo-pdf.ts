import { inflateSync } from "node:zlib"
import { displayLogoUrl, LOGO_BYTE_LIMIT } from "./logo.ts"

export interface PdfLogo {
  width: number
  height: number
  data: Uint8Array
  filter: "jpeg" | "raw"
}

const MAX_EDGE = 4_000

/** Turn a PNG or JPEG logo into an image a proposal PDF can draw. */
export function pdfLogoFromBytes(bytes: Uint8Array): PdfLogo | null {
  if (bytes.byteLength < 8 || bytes.byteLength > LOGO_BYTE_LIMIT) return null
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return pngLogo(bytes)
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return jpegLogo(bytes)
  return null
}

export async function pdfLogoFromUrl(value: string | null | undefined): Promise<PdfLogo | null> {
  const src = displayLogoUrl(value)
  if (!src) return null
  if (src.startsWith("data:")) return pdfLogoFromBytes(dataImage(src))
  if (!src.startsWith("https://")) return null
  try {
    const response = await fetch(src, { redirect: "manual" })
    if (!response.ok) return null
    const type = response.headers.get("content-type") ?? ""
    if (!type.startsWith("image/png") && !type.startsWith("image/jpeg")) return null
    const bytes = new Uint8Array(await response.arrayBuffer())
    return pdfLogoFromBytes(bytes)
  } catch {
    return null
  }
}

function dataImage(src: string): Uint8Array {
  const match = /^data:image\/(?:png|jpeg);base64,([a-z0-9+/=\s]+)$/i.exec(src)
  if (!match) return new Uint8Array()
  return new Uint8Array(Buffer.from(match[1].replace(/\s/g, ""), "base64"))
}

function pngLogo(bytes: Uint8Array): PdfLogo | null {
  const parsed = readPng(bytes)
  if (!parsed) return null
  const rgb = pngToRgb(parsed)
  if (!rgb) return null
  return { width: parsed.width, height: parsed.height, data: rgb, filter: "raw" }
}

function jpegLogo(bytes: Uint8Array): PdfLogo | null {
  const size = jpegSize(bytes)
  if (!size) return null
  return { width: size.width, height: size.height, data: bytes, filter: "jpeg" }
}

interface PngFile {
  width: number
  height: number
  colorType: number
  channels: number
  inflated: Uint8Array
  palette: Uint8Array | null
}

function readPng(bytes: Uint8Array): PngFile | null {
  if (bytes.length < 8) return null
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = -1
  let interlace = 1
  const idat: Uint8Array[] = []
  let palette: Uint8Array | null = null
  while (offset + 12 <= bytes.length) {
    const length = readU32(bytes, offset)
    const type = ascii(bytes, offset + 4, 4)
    const start = offset + 8
    if (length < 0 || start + length + 4 > bytes.length) return null
    const data = bytes.subarray(start, start + length)
    if (type === "IHDR" && data.length >= 13) {
      width = readU32(data, 0)
      height = readU32(data, 4)
      bitDepth = data[8] ?? 0
      colorType = data[9] ?? -1
      interlace = data[12] ?? 1
    } else if (type === "PLTE") {
      palette = data
    } else if (type === "IDAT") {
      idat.push(data)
    } else if (type === "IEND") {
      break
    }
    offset = start + length + 4
  }
  const channels = channelsFor(colorType)
  if (
    bitDepth !== 8 ||
    interlace !== 0 ||
    !channels ||
    width < 1 ||
    height < 1 ||
    width > MAX_EDGE ||
    height > MAX_EDGE ||
    idat.length === 0
  ) {
    return null
  }
  const joined = new Uint8Array(idat.reduce((sum, part) => sum + part.length, 0))
  let cursor = 0
  for (const part of idat) {
    joined.set(part, cursor)
    cursor += part.length
  }
  try {
    return { width, height, colorType, channels, inflated: new Uint8Array(inflateSync(joined)), palette }
  } catch {
    return null
  }
}

function pngToRgb(png: PngFile): Uint8Array | null {
  const stride = png.width * png.channels
  const expected = png.height * (stride + 1)
  if (png.inflated.length < expected) return null
  const raw = new Uint8Array(png.height * stride)
  let source = 0
  for (let row = 0; row < png.height; row += 1) {
    const filter = png.inflated[source] ?? 0
    source += 1
    const rowStart = row * stride
    for (let column = 0; column < stride; column += 1) {
      const value = png.inflated[source] ?? 0
      source += 1
      const left = column >= png.channels ? raw[rowStart + column - png.channels] ?? 0 : 0
      const up = row > 0 ? raw[rowStart - stride + column] ?? 0 : 0
      const upLeft = row > 0 && column >= png.channels ? raw[rowStart - stride + column - png.channels] ?? 0 : 0
      raw[rowStart + column] = unfilter(filter, value, left, up, upLeft)
    }
  }
  const rgb = new Uint8Array(png.width * png.height * 3)
  for (let pixel = 0; pixel < png.width * png.height; pixel += 1) {
    const sample = raw.subarray(pixel * png.channels, (pixel + 1) * png.channels)
    const color = toRgb(png, sample)
    rgb[pixel * 3] = color[0]
    rgb[pixel * 3 + 1] = color[1]
    rgb[pixel * 3 + 2] = color[2]
  }
  return rgb
}

function unfilter(filter: number, value: number, left: number, up: number, upLeft: number): number {
  if (filter === 1) return (value + left) & 255
  if (filter === 2) return (value + up) & 255
  if (filter === 3) return (value + Math.floor((left + up) / 2)) & 255
  if (filter === 4) return (value + paeth(left, up, upLeft)) & 255
  return value
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft
  const leftDistance = Math.abs(estimate - left)
  const upDistance = Math.abs(estimate - up)
  const diagonal = Math.abs(estimate - upLeft)
  if (leftDistance <= upDistance && leftDistance <= diagonal) return left
  if (upDistance <= diagonal) return up
  return upLeft
}

function toRgb(png: PngFile, sample: Uint8Array): [number, number, number] {
  if (png.colorType === 2) return [sample[0] ?? 0, sample[1] ?? 0, sample[2] ?? 0]
  if (png.colorType === 6) {
    const alpha = (sample[3] ?? 255) / 255
    return [
      Math.round((sample[0] ?? 255) * alpha + 255 * (1 - alpha)),
      Math.round((sample[1] ?? 255) * alpha + 255 * (1 - alpha)),
      Math.round((sample[2] ?? 255) * alpha + 255 * (1 - alpha)),
    ]
  }
  if (png.colorType === 0) {
    const gray = sample[0] ?? 0
    return [gray, gray, gray]
  }
  if (png.colorType === 4) {
    const alpha = (sample[1] ?? 255) / 255
    const gray = Math.round((sample[0] ?? 255) * alpha + 255 * (1 - alpha))
    return [gray, gray, gray]
  }
  const index = (sample[0] ?? 0) * 3
  const palette = png.palette
  if (!palette || index + 2 >= palette.length) return [0, 0, 0]
  return [palette[index] ?? 0, palette[index + 1] ?? 0, palette[index + 2] ?? 0]
}

function channelsFor(colorType: number): number | null {
  if (colorType === 0) return 1
  if (colorType === 2) return 3
  if (colorType === 3) return 1
  if (colorType === 4) return 2
  if (colorType === 6) return 4
  return null
}

function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  let index = 2
  while (index + 8 < bytes.length) {
    if (bytes[index] !== 0xff) return null
    while (bytes[index] === 0xff) index += 1
    const marker = bytes[index] ?? 0
    index += 1
    if (marker === 0xd9 || marker === 0xda) return null
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    const length = ((bytes[index] ?? 0) << 8) | (bytes[index + 1] ?? 0)
    if (length < 2 || index + length > bytes.length) return null
    if ((marker === 0xc0 || marker === 0xc1 || marker === 0xc2) && length >= 8 && bytes[index + 7] === 3) {
      const height = ((bytes[index + 3] ?? 0) << 8) | (bytes[index + 4] ?? 0)
      const width = ((bytes[index + 5] ?? 0) << 8) | (bytes[index + 6] ?? 0)
      if (width < 1 || height < 1 || width > MAX_EDGE || height > MAX_EDGE) return null
      return { width, height }
    }
    index += length
  }
  return null
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)
  ) >>> 0
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let out = ""
  for (let index = 0; index < length; index += 1) out += String.fromCharCode(bytes[offset + index] ?? 0)
  return out
}
