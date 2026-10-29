import type { PdfLogo } from "../brand/logo-pdf.ts"

const PAGE_LINES = 44

/** A one-column letter PDF. A logo, when present, sits above the first page. */
export function textPdf(lines: string[], logo?: PdfLogo | null): Uint8Array {
  const pages = chunk(lines.length > 0 ? lines : [""], PAGE_LINES)
  const objects = new Map<number, Uint8Array>()
  const kids: number[] = []
  let nextId = logo ? 5 : 4
  pages.forEach((page, index) => {
    const pageId = nextId
    const contentId = nextId + 1
    nextId += 2
    kids.push(pageId)
    const drawLogo = Boolean(logo) && index === 0
    const resources = drawLogo
      ? "<< /Font << /F1 3 0 R >> /XObject << /Im1 4 0 R >> >>"
      : "<< /Font << /F1 3 0 R >> >>"
    objects.set(pageId, ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources ${resources} >>`))
    const stream = pageStream(page, drawLogo ? logoStart(logo!) : 750, drawLogo ? logoDraw(logo!) : "")
    objects.set(contentId, streamObject(ascii(stream)))
  })
  objects.set(1, ascii("<< /Type /Catalog /Pages 2 0 R >>"))
  objects.set(2, ascii(`<< /Type /Pages /Count ${kids.length} /Kids [${kids.map((id) => `${id} 0 R`).join(" ")}] >>`))
  objects.set(3, ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"))
  if (logo) objects.set(4, imageObject(logo))

  const body = new ByteBuf()
  body.push("%PDF-1.4\n")
  const offsets = new Map<number, number>()
  const ids = [...objects.keys()].sort((left, right) => left - right)
  for (const id of ids) {
    offsets.set(id, body.length)
    body.push(`${id} 0 obj\n`)
    body.pushBytes(objects.get(id)!)
    body.push("\nendobj\n")
  }
  const xref = body.length
  body.push(`xref\n0 ${ids.length + 1}\n`)
  body.push("0000000000 65535 f \n")
  for (const id of ids) body.push(`${String(offsets.get(id)).padStart(10, "0")} 00000 n \n`)
  body.push(`trailer\n<< /Size ${ids.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  return body.toUint8Array()
}

function logoStart(logo: PdfLogo): number {
  return 792 - 36 - drawHeight(logo) - 18
}

function logoDraw(logo: PdfLogo): string {
  const height = drawHeight(logo)
  const width = Math.min(220, (height * logo.width) / logo.height)
  const y = 792 - 28 - height
  return `q\n${round(width)} 0 0 ${round(height)} 54 ${round(y)} cm\n/Im1 Do\nQ\n`
}

function drawHeight(logo: PdfLogo): number {
  return Math.min(56, logo.height)
}

function imageObject(logo: PdfLogo): Uint8Array {
  const filter = logo.filter === "jpeg" ? " /Filter /DCTDecode" : ""
  const header = ascii(
    `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8${filter} /Length ${logo.data.length} >>\nstream\n`,
  )
  const out = new Uint8Array(header.length + logo.data.length + 10)
  out.set(header, 0)
  out.set(logo.data, header.length)
  out.set(ascii("\nendstream"), header.length + logo.data.length)
  return out
}

function streamObject(stream: Uint8Array): Uint8Array {
  const header = ascii(`<< /Length ${stream.length} >>\nstream\n`)
  const footer = ascii("\nendstream")
  const out = new Uint8Array(header.length + stream.length + footer.length)
  out.set(header, 0)
  out.set(stream, header.length)
  out.set(footer, header.length + stream.length)
  return out
}

function pageStream(lines: string[], startY: number, prefix: string): string {
  const commands = [prefix.trim(), "BT", "/F1 11 Tf", `54 ${Math.round(startY)} Td`, "15 TL"].filter(Boolean)
  lines.forEach((line, index) => {
    commands.push(`(${pdfText(line)}) Tj`)
    if (index < lines.length - 1) commands.push("T*")
  })
  commands.push("ET")
  return commands.join("\n")
}

function pdfText(value: string): string {
  let out = ""
  for (const char of value) {
    const code = char.codePointAt(0) ?? 63
    const byte = code >= 32 && code <= 126 ? code : code >= 160 && code <= 255 ? code : 63
    if (byte === 40 || byte === 41 || byte === 92) {
      out += `\\${String.fromCharCode(byte)}`
    } else if (byte < 32 || byte > 126) {
      out += `\\${byte.toString(8).padStart(3, "0")}`
    } else {
      out += String.fromCharCode(byte)
    }
  }
  return out
}

function chunk(lines: string[], size: number): string[][] {
  const pages: string[][] = []
  for (let index = 0; index < lines.length; index += size) pages.push(lines.slice(index, index + size))
  return pages
}

function round(value: number): string {
  return String(Math.round(value * 100) / 100)
}

function ascii(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

class ByteBuf {
  private chunks: Uint8Array[] = []
  length = 0

  push(value: string) {
    this.pushBytes(ascii(value))
  }

  pushBytes(bytes: Uint8Array) {
    this.chunks.push(bytes)
    this.length += bytes.length
  }

  toUint8Array(): Uint8Array {
    const out = new Uint8Array(this.length)
    let offset = 0
    for (const chunk of this.chunks) {
      out.set(chunk, offset)
      offset += chunk.length
    }
    return out
  }
}
