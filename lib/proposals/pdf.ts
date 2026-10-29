const PAGE_LINES = 44

/** A one-column letter PDF. Text is WinAnsi so Spanish names stay readable. */
export function textPdf(lines: string[]): Uint8Array {
  const pages = chunk(lines.length > 0 ? lines : [""], PAGE_LINES)
  const objects: string[] = []
  const kids: string[] = []
  let nextId = 4
  for (const page of pages) {
    const pageId = nextId
    const contentId = nextId + 1
    nextId += 2
    kids.push(`${pageId} 0 R`)
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`
    const stream = pageStream(page)
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  }
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>"
  objects[2] = `<< /Type /Pages /Count ${kids.length} /Kids [${kids.join(" ")}] >>`
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"

  let body = "%PDF-1.4\n"
  const offsets = [0]
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = body.length
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`
  }
  const xref = body.length
  body += `xref\n0 ${objects.length}\n`
  body += "0000000000 65535 f \n"
  for (let id = 1; id < objects.length; id += 1) {
    body += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`
  }
  body += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(body)
}

function pageStream(lines: string[]): string {
  const commands = ["BT", "/F1 11 Tf", "54 750 Td", "15 TL"]
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
