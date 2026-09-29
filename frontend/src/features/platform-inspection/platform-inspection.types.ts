export interface PlatformInspectionStudent {
  id: string;
  studentNumber: string;
  displayName: string;
  status: string;
}

export interface PlatformInspectionClass {
  id: string;
  name: string;
  status: string;
}

export interface PlatformOrganizationSnapshot {
  organization: {
    id: string;
    name: string;
    status: "active";
  };
  students: PlatformInspectionStudent[];
  classes: PlatformInspectionClass[];
}
