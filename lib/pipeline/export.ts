export interface JobExportRow {
  client: string
  job: string
  address: string
  stage: string
  status: string
  total: number
  updated: string
}

const HEADER = ["Client", "Job", "Address", "Stage", "Status", "Total", "Updated"]

export function jobsCsv(rows: JobExportRow[]): string {
  const lines = rows.map((row) =>
    [row.client, row.job, row.address, row.stage, row.status, row.total.toFixed(2), row.updated].map(cell).join(","),
  )
  return `\uFEFF${[HEADER.join(","), ...lines].join("\n")}\n`
}

function cell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`
  return value
}
