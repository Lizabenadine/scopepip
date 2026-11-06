import crypto from "node:crypto"
import net from "node:net"
import tls from "node:tls"
import { displayCompanyName } from "../brand/company.ts"

export interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
  secure?: boolean
  rejectUnauthorized?: boolean
  timeoutMs?: number
}

export interface SmtpMessage {
  to: string
  subject: string
  text: string
  companyName?: string
  replyTo?: string
  attachment?: {
    filename: string
    contentType: string
    content: Uint8Array
  }
}

export function extractEmailAddress(raw: string): string {
  const trimmed = raw.trim()
  const bracket = trimmed.match(/<([^<>@\s]+@[^<>@\s]+)>/)
  if (bracket?.[1]) return bracket[1].trim()
  if (/^[^\s<>@]+@[^\s<>@]+$/.test(trimmed)) return trimmed
  return ""
}

function encodeHeaderWord(value: string): string {
  const clean = value.replace(/[\r\n]+/g, " ").trim()
  if (!clean) return ""
  if (/^[\x20-\x7E]*$/.test(clean)) return clean
  return `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`
}

export function formatSenderAddress(fromRaw: string, companyName?: string): { header: string; envelope: string } {
  const envelope = extractEmailAddress(fromRaw)
  if (!envelope) return { header: "", envelope: "" }
  const label = displayCompanyName(companyName).replace(/[\r\n"\\]+/g, " ").trim()
  if (!label) return { header: `<${envelope}>`, envelope }
  if (/^[\x20-\x7E]*$/.test(label)) {
    return { header: `"${label}" <${envelope}>`, envelope }
  }
  return { header: `${encodeHeaderWord(label)} <${envelope}>`, envelope }
}

function wrapBase64(buffer: Buffer): string {
  const raw = buffer.toString("base64")
  const lines: string[] = []
  for (let i = 0; i < raw.length; i += 76) {
    lines.push(raw.slice(i, i + 76))
  }
  return lines.join("\r\n")
}

export function buildMimeMessage(input: {
  fromHeader: string
  envelopeFrom: string
  to: string
  replyTo?: string
  subject: string
  text: string
  attachment?: {
    filename: string
    contentType: string
    content: Uint8Array
  }
}): string {
  const domain = input.envelopeFrom.split("@")[1] || "scopepipe.com"
  const messageId = `<${crypto.randomUUID()}@${domain}>`
  const date = new Date().toUTCString()
  const headers: string[] = [
    `From: ${input.fromHeader}`,
    `To: <${input.to}>`,
  ]
  const reply = input.replyTo ? extractEmailAddress(input.replyTo) : ""
  if (reply) {
    headers.push(`Reply-To: <${reply}>`)
  }
  headers.push(
    `Subject: ${encodeHeaderWord(input.subject)}`,
    `Date: ${date}`,
    `Message-ID: ${messageId}`,
    `MIME-Version: 1.0`,
  )

  const normalizedText = input.text.replace(/\r?\n/g, "\r\n")

  if (!input.attachment) {
    headers.push(
      `Content-Type: text/plain; charset="utf-8"`,
      `Content-Transfer-Encoding: base64`,
      "",
      wrapBase64(Buffer.from(normalizedText, "utf8")),
    )
    return headers.join("\r\n")
  }

  const boundary = `----=_ScopePipe_${crypto.randomBytes(12).toString("hex")}`
  const safeFilename = input.attachment.filename.replace(/[\r\n"\\]+/g, "") || "proposal.pdf"
  headers.push(
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: text/plain; charset="utf-8"`,
    `Content-Transfer-Encoding: base64`,
    "",
    wrapBase64(Buffer.from(normalizedText, "utf8")),
    `--${boundary}`,
    `Content-Type: ${input.attachment.contentType}; name="${safeFilename}"`,
    `Content-Disposition: attachment; filename="${safeFilename}"`,
    `Content-Transfer-Encoding: base64`,
    "",
    wrapBase64(Buffer.from(input.attachment.content)),
    `--${boundary}--`,
    "",
  )
  return headers.join("\r\n")
}

interface SmtpResponse {
  code: number
  text: string
}

class SmtpSession {
  private socket: net.Socket | tls.TLSSocket
  private buffer = ""
  private waiter: {
    resolve: (res: SmtpResponse) => void
    reject: (err: Error) => void
  } | null = null
  private closedError: Error | null = null

  constructor(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket
    this.attachListeners(socket)
  }

  private attachListeners(socket: net.Socket | tls.TLSSocket) {
    socket.on("data", (chunk: Buffer) => {
      this.buffer += chunk.toString("utf8")
      this.checkBuffer()
    })
    socket.on("error", (err: Error) => {
      this.closedError = err
      if (this.waiter) {
        const w = this.waiter
        this.waiter = null
        w.reject(err)
      }
    })
    socket.on("close", () => {
      const err = this.closedError ?? new Error("SMTP connection closed unexpectedly.")
      this.closedError = err
      if (this.waiter) {
        const w = this.waiter
        this.waiter = null
        w.reject(err)
      }
    })
  }

  private checkBuffer() {
    if (!this.waiter) return
    if (!this.buffer.endsWith("\n")) return
    const lines = this.buffer.replace(/\r?\n$/, "").split(/\r?\n/)
    const lastLine = lines[lines.length - 1] ?? ""
    const match = lastLine.match(/^(\d{3})(?: (.*))?$/)
    if (!match) return
    const code = Number(match[1])
    const text = lines.join("\n")
    this.buffer = ""
    const w = this.waiter
    this.waiter = null
    w.resolve({ code, text })
  }

  readResponse(): Promise<SmtpResponse> {
    if (this.closedError) return Promise.reject(this.closedError)
    return new Promise<SmtpResponse>((resolve, reject) => {
      this.waiter = { resolve, reject }
      this.checkBuffer()
    })
  }

  async command(line: string): Promise<SmtpResponse> {
    this.socket.write(`${line}\r\n`)
    return this.readResponse()
  }

  async upgradeToTls(host: string, rejectUnauthorized: boolean): Promise<void> {
    const rawSocket = this.socket
    rawSocket.removeAllListeners("data")
    rawSocket.removeAllListeners("error")
    rawSocket.removeAllListeners("close")
    const tlsSocket = await new Promise<tls.TLSSocket>((resolve, reject) => {
      const onError = (err: Error) => reject(err)
      const upgraded = tls.connect(
        {
          socket: rawSocket,
          servername: host,
          rejectUnauthorized,
        },
        () => {
          upgraded.removeListener("error", onError)
          resolve(upgraded)
        },
      )
      upgraded.once("error", onError)
    })
    this.socket = tlsSocket
    this.buffer = ""
    this.attachListeners(tlsSocket)
  }

  destroy() {
    try {
      this.socket.destroy()
    } catch {
      // Ignore socket cleanup errors
    }
  }
}

function unquotePass(raw: string): string {
  const trimmed = raw.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

export async function sendSmtpEmail(
  config: SmtpConfig,
  message: SmtpMessage,
): Promise<{ ok: true; detail: string } | { ok: false; detail: string }> {
  const to = extractEmailAddress(message.to)
  if (!to) return { ok: false, detail: "The client has no valid email address." }
  const userAddress = extractEmailAddress(config.user)
  const fromCandidate = extractEmailAddress(config.from) ? config.from : config.user
  let sender = formatSenderAddress(fromCandidate, message.companyName)
  if (!sender.envelope) {
    return { ok: false, detail: "The sender email address is not configured." }
  }
  const host = config.host
    .trim()
    .replace(/^smtps?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .trim()
  const port = config.port || 465
  const secure = config.secure ?? port === 465
  const rejectUnauthorized = config.rejectUnauthorized ?? process.env.SMTP_ALLOW_SELF_SIGNED !== "true"
  const timeoutMs = config.timeoutMs ?? 15_000

  const timeout = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => reject(new Error("SMTP connection timed out.")), timeoutMs)
    timer.unref?.()
  })

  const run = async (): Promise<{ ok: true; detail: string } | { ok: false; detail: string }> => {
    const initialSocket = await new Promise<net.Socket | tls.TLSSocket>((resolve, reject) => {
      const onError = (err: Error) => reject(err)
      if (secure) {
        const sock = tls.connect(
          { host, port, servername: host, rejectUnauthorized },
          () => {
            sock.removeListener("error", onError)
            resolve(sock)
          },
        )
        sock.once("error", onError)
      } else {
        const sock = net.connect({ host, port }, () => {
          sock.removeListener("error", onError)
          resolve(sock)
        })
        sock.once("error", onError)
      }
    })

    const session = new SmtpSession(initialSocket)
    try {
      const greeting = await session.readResponse()
      if (greeting.code !== 220) {
        return { ok: false, detail: `SMTP greeting rejected (${greeting.code}).` }
      }

      let ehlo = await session.command("EHLO scopepipe.com")
      if (ehlo.code !== 250) {
        ehlo = await session.command("HELO scopepipe.com")
        if (ehlo.code !== 250) {
          return { ok: false, detail: `SMTP handshake failed (${ehlo.code}).` }
        }
      }

      if (!secure && /STARTTLS/i.test(ehlo.text)) {
        const startTls = await session.command("STARTTLS")
        if (startTls.code !== 220) {
          return { ok: false, detail: `SMTP STARTTLS failed (${startTls.code}).` }
        }
        await session.upgradeToTls(host, rejectUnauthorized)
        ehlo = await session.command("EHLO scopepipe.com")
        if (ehlo.code !== 250) {
          return { ok: false, detail: `SMTP TLS handshake failed (${ehlo.code}).` }
        }
      }

      const authUser = unquotePass(config.user)
      const authPass = unquotePass(config.pass)
      const plainToken = Buffer.from(`\0${authUser}\0${authPass}`, "utf8").toString("base64")
      let auth = await session.command(`AUTH PLAIN ${plainToken}`)
      if (auth.code !== 235 && /AUTH.*LOGIN/i.test(ehlo.text)) {
        const loginStep = await session.command("AUTH LOGIN")
        if (loginStep.code === 334) {
          const userStep = await session.command(Buffer.from(authUser, "utf8").toString("base64"))
          if (userStep.code === 334) {
            auth = await session.command(Buffer.from(authPass, "utf8").toString("base64"))
          }
        }
      }

      if (auth.code !== 235) {
        return { ok: false, detail: `SMTP authentication failed (${auth.code}).` }
      }

      let mailFrom = await session.command(`MAIL FROM:<${sender.envelope}>`)
      if (
        mailFrom.code !== 250 &&
        userAddress &&
        userAddress.toLowerCase() !== sender.envelope.toLowerCase()
      ) {
        await session.command("RSET").catch(() => undefined)
        sender = formatSenderAddress(userAddress, message.companyName)
        mailFrom = await session.command(`MAIL FROM:<${sender.envelope}>`)
      }
      if (mailFrom.code !== 250) {
        return { ok: false, detail: `Sender rejected (${mailFrom.code}): ${mailFrom.text.slice(0, 120)}` }
      }

      const rcptTo = await session.command(`RCPT TO:<${to}>`)
      if (rcptTo.code !== 250 && rcptTo.code !== 251) {
        return { ok: false, detail: `Recipient rejected (${rcptTo.code}): ${rcptTo.text.slice(0, 120)}` }
      }

      const dataStart = await session.command("DATA")
      if (dataStart.code !== 354) {
        return { ok: false, detail: `SMTP DATA rejected (${dataStart.code}).` }
      }

      const mime = buildMimeMessage({
        fromHeader: sender.header,
        envelopeFrom: sender.envelope,
        to,
        replyTo: message.replyTo,
        subject: message.subject,
        text: message.text,
        attachment: message.attachment,
      })
      const dotStuffed = mime
        .split("\r\n")
        .map((line) => (line.startsWith(".") ? `.${line}` : line))
        .join("\r\n")

      const dataEnd = await session.command(`${dotStuffed}\r\n.`)
      if (dataEnd.code !== 250) {
        return { ok: false, detail: `Email rejected (${dataEnd.code}): ${dataEnd.text.slice(0, 120)}` }
      }

      await session.command("QUIT").catch(() => undefined)
      return { ok: true, detail: "Emailed the proposal link and PDF." }
    } finally {
      session.destroy()
    }
  }

  try {
    return await Promise.race([run(), timeout])
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "Email server could not be reached."
    return { ok: false, detail: messageText.slice(0, 180) }
  }
}
