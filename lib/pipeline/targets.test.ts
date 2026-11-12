import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { JOB_PIPELINE_STAGES, SALES_STAGES } from "../types.ts"
import {
  DASHBOARD_METRIC_TARGETS,
  dashboardMetricHref,
  pipelineStageHref,
  resolveTargetStageId,
  type DashboardMetricKey,
} from "./targets.ts"

describe("dashboard pipeline metric targets", () => {
  it("maps every metric card to an existing route and real stage ID", () => {
    const keys: DashboardMetricKey[] = [
      "new_leads",
      "estimates_sent",
      "accepted",
      "scheduled",
      "completed",
      "revenue",
    ]
    for (const key of keys) {
      const target = DASHBOARD_METRIC_TARGETS[key]
      if (target.board === "sales") {
        assert.equal(target.route, "/sales-pipeline")
        assert.ok((SALES_STAGES as readonly string[]).includes(target.stageId))
      } else {
        assert.equal(target.route, "/dispatch")
        assert.ok((JOB_PIPELINE_STAGES as readonly string[]).includes(target.stageId))
      }
      assert.equal(dashboardMetricHref(key), `${target.route}?stage=${target.stageId}`)
    }
  })

  it("maps each metric to the expected stage destination", () => {
    assert.equal(dashboardMetricHref("new_leads"), "/sales-pipeline?stage=cold")
    assert.equal(dashboardMetricHref("estimates_sent"), "/sales-pipeline?stage=proposal_sent")
    assert.equal(dashboardMetricHref("accepted"), "/dispatch?stage=project_accepted")
    assert.equal(dashboardMetricHref("scheduled"), "/dispatch?stage=project_scheduled")
    assert.equal(dashboardMetricHref("completed"), "/dispatch?stage=project_completed")
    assert.equal(dashboardMetricHref("revenue"), "/dispatch?stage=project_accepted")
    assert.equal(pipelineStageHref("/sales-pipeline"), "/sales-pipeline")
  })

  it("resolves requested stage IDs safely with first-column fallback", () => {
    const cols = [{ id: "cold" }, { id: "warm" }, { id: "proposal_sent" }]
    assert.equal(resolveTargetStageId(cols, "proposal_sent"), "proposal_sent")
    assert.equal(resolveTargetStageId(cols, "unknown_stage"), "cold")
    assert.equal(resolveTargetStageId(cols, null), "cold")
    assert.equal(resolveTargetStageId([], "cold"), "")
  })
})
