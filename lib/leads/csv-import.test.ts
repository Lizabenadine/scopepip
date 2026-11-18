import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createBlankState } from "../data/company-book.ts"
import {
  parseCsvText,
  detectColumnMapping,
  previewCsvLeads,
  applyCsvLeadRows,
} from "./csv-import.ts"

describe("CSV Lead Import", () => {
  it("parses standard and quoted CSV text with commas, quotes, and newlines", () => {
    const raw = `Name,Phone,Email,Address,Notes
"Smith, John",5035550100,john@example.com,"123 Main St, Apt 4B","Line 1
Line 2 with ""quotes"""
Jane Doe,(503) 555-0101,jane@example.com,456 Oak Ave,Quick room repaint`

    const parsed = parseCsvText(raw)
    assert.equal(parsed.length, 3)
    assert.deepEqual(parsed[0], ["Name", "Phone", "Email", "Address", "Notes"])
    assert.equal(parsed[1][0], "Smith, John")
    assert.equal(parsed[1][1], "5035550100")
    assert.equal(parsed[1][2], "john@example.com")
    assert.equal(parsed[1][3], "123 Main St, Apt 4B")
    assert.equal(parsed[1][4], 'Line 1\nLine 2 with "quotes"')
    assert.equal(parsed[2][0], "Jane Doe")
    assert.equal(parsed[2][1], "(503) 555-0101")
  })

  it("automatically recognizes diverse common column headers", () => {
    const headers1 = ["Full Name", "Primary Phone", "Email Address", "Property Address", "Comments"]
    const map1 = detectColumnMapping(headers1)
    assert.equal(map1.nameCol, "Full Name")
    assert.equal(map1.phoneCol, "Primary Phone")
    assert.equal(map1.emailCol, "Email Address")
    assert.equal(map1.addressCol, "Property Address")
    assert.equal(map1.notesCol, "Comments")

    const headers2 = ["First Name", "Last Name", "Mobile", "E-mail", "Street", "City", "State", "Zip", "Project Description"]
    const map2 = detectColumnMapping(headers2)
    assert.equal(map2.firstNameCol, "First Name")
    assert.equal(map2.lastNameCol, "Last Name")
    assert.equal(map2.phoneCol, "Mobile")
    assert.equal(map2.emailCol, "E-mail")
    assert.equal(map2.addressCol, "Street")
    assert.equal(map2.cityCol, "City")
    assert.equal(map2.stateCol, "State")
    assert.equal(map2.zipCol, "Zip")
    assert.equal(map2.notesCol, "Project Description")

    // Scopepipe exported CSV headers
    const headersScopepipe = ["Lead Name", "Email", "Phone", "Address", "Stage", "Project Title", "Created Date"]
    const mapScopepipe = detectColumnMapping(headersScopepipe)
    assert.equal(mapScopepipe.nameCol, "Lead Name")
    assert.equal(mapScopepipe.emailCol, "Email")
    assert.equal(mapScopepipe.phoneCol, "Phone")
    assert.equal(mapScopepipe.addressCol, "Address")
    assert.equal(mapScopepipe.notesCol, "Project Title")
  })

  it("previews leads and detects duplicates against existing CRM clients by phone and email", () => {
    const state = createBlankState()
    state.clients = [
      {
        id: "client-1",
        name: "Existing Person",
        phone: "(503) 555-0199",
        email: "existing@example.com",
        address: "789 Pine Rd",
        notes: "",
        createdAt: "2026-10-01T00:00:00Z",
        updatedAt: "2026-10-01T00:00:00Z",
      },
    ]

    const csv = `Customer Name,Cell,Email,Location,Notes
Alice Walker,503-555-1111,alice@example.com,101 First St,Interior painting
Dup By Phone,503-555-0199,different@example.com,102 Second St,Duplicate phone
Dup By Email,503-555-2222,existing@example.com,103 Third St,Duplicate email
In CSV Duplicate,503-555-1111,another@example.com,104 Fourth St,Repeated phone in same file
Missing Contact, , ,105 Fifth St,No phone or email
,,someone@example.com,106 Sixth St,Missing name field`

    const preview = previewCsvLeads(csv, state)
    assert.equal(preview.totalRows, 6)
    assert.equal(preview.validCount, 1)
    assert.equal(preview.duplicateCount, 3)
    assert.equal(preview.invalidCount, 2)

    // Row 1: Alice Walker -> valid
    assert.equal(preview.leads[0].name, "Alice Walker")
    assert.equal(preview.leads[0].status, "valid")

    // Row 2: Dup By Phone -> duplicate of client-1 phone
    assert.equal(preview.leads[1].name, "Dup By Phone")
    assert.equal(preview.leads[1].status, "duplicate")
    assert.ok(preview.leads[1].duplicateReason?.includes("already exists in CRM"))

    // Row 3: Dup By Email -> duplicate of client-1 email
    assert.equal(preview.leads[2].name, "Dup By Email")
    assert.equal(preview.leads[2].status, "duplicate")
    assert.ok(preview.leads[2].duplicateReason?.includes("already exists in CRM"))

    // Row 4: Duplicate within CSV
    assert.equal(preview.leads[3].name, "In CSV Duplicate")
    assert.equal(preview.leads[3].status, "duplicate")
    assert.ok(preview.leads[3].duplicateReason?.includes("within this CSV"))

    // Row 5: Missing contact
    assert.equal(preview.leads[4].status, "invalid")
    assert.equal(preview.leads[4].invalidReason, "Requires phone number or email")

    // Row 6: Missing name
    assert.equal(preview.leads[5].status, "invalid")
    assert.equal(preview.leads[5].invalidReason, "Missing contact name")
  })

  it("applies valid leads to ScopeState, creating clients, estimates, and work orders", () => {
    const state = createBlankState()
    assert.equal(state.clients.length, 0)
    assert.equal(state.estimates.length, 0)

    const csv = `First Name,Last Name,Phone,Email,Street Address,City,State,Zip,Notes
Carlos,Mendoza,(503) 555-3333,carlos@example.com,550 Market St,Portland,OR,97201,Living room and hallway
Sarah,Connor,503-555-4444,sarah@example.com,900 Main Blvd,Beaverton,OR,97005,Exterior trim and siding`

    const preview = previewCsvLeads(csv, state)
    assert.equal(preview.validCount, 2)

    const result = applyCsvLeadRows(state, preview.leads, "2026-11-18T10:00:00Z")
    assert.equal(result.imported, 2)
    assert.equal(result.skipped, 0)
    assert.equal(result.failed, 0)

    // Check next state
    assert.equal(result.state.clients.length, 2)
    assert.equal(result.state.estimates.length, 2)
    assert.equal(result.state.workOrders.length, 2)

    const carlosEst = result.state.estimates.find((e) => e.jobAddress.includes("Market St"))
    assert.ok(carlosEst)
    assert.equal(carlosEst.leadSource, "csv")
    assert.equal(carlosEst.salesStage, "cold")
    assert.equal(carlosEst.notes, "Living room and hallway")

    const sarahClient = result.state.clients.find((c) => c.name === "Sarah Connor")
    assert.ok(sarahClient)
    assert.equal(sarahClient.phone, "503-555-4444")
    assert.equal(sarahClient.email, "sarah@example.com")
    assert.equal(sarahClient.address, "900 Main Blvd, Beaverton, OR 97005")
  })
})
