export type WorkStatus = "draft" | "submitted" | "approved" | "rejected";

/** Employee can edit when draft or after rejection */
export function isEditableByEmployee(status: WorkStatus): boolean {
  return status === "draft" || status === "rejected";
}

/** Submitted or approved items are locked — inputs disabled */
export function isLocked(status: WorkStatus): boolean {
  return status === "submitted" || status === "approved";
}

/** Manager can approve or reject only submitted items */
export function canManagerAct(status: WorkStatus): boolean {
  return status === "submitted";
}

/** Employee can submit when draft or rejected */
export function canSubmit(status: WorkStatus): boolean {
  return status === "draft" || status === "rejected";
}
