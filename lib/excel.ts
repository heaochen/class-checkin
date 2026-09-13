import * as XLSX from "xlsx";

export type ImportedMemberStatus =
  | "valid"
  | "missing_student_id"
  | "missing_name"
  | "duplicate";

export type ImportedMember = {
  studentId: string;
  name: string;
  status: ImportedMemberStatus;
};

export type ExcelImportResult = {
  fileName: string;
  totalRows: number;
  validCount: number;
  errorCount: number;
  members: ImportedMember[];
};

const studentIdHeaders = new Set(["学号", "student_id", "studentid"]);
const nameHeaders = new Set(["姓名", "name"]);

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function cellValue(value: unknown) {
  return String(value ?? "").trim();
}

export async function parseExcelFile(file: File): Promise<ExcelImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Excel 文件中没有可读取的工作表");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  const headerRow = rows[0] ?? [];
  const studentIdIndex = headerRow.findIndex((value) =>
    studentIdHeaders.has(normalizeHeader(value)),
  );
  const nameIndex = headerRow.findIndex((value) =>
    nameHeaders.has(normalizeHeader(value)),
  );

  if (studentIdIndex === -1 || nameIndex === -1) {
    const missing = [
      studentIdIndex === -1 ? "学号" : "",
      nameIndex === -1 ? "姓名" : "",
    ]
      .filter(Boolean)
      .join("、");
    throw new Error(`Excel 中没有识别到“${missing}”列`);
  }

  const dataRows = rows
    .slice(1)
    .filter((row) => row.some((value) => cellValue(value) !== ""));
  const studentIdCounts = new Map<string, number>();

  for (const row of dataRows) {
    const studentId = cellValue(row[studentIdIndex]);
    if (studentId) {
      studentIdCounts.set(studentId, (studentIdCounts.get(studentId) ?? 0) + 1);
    }
  }

  const members = dataRows.map<ImportedMember>((row) => {
    const studentId = cellValue(row[studentIdIndex]);
    const name = cellValue(row[nameIndex]);
    let status: ImportedMemberStatus = "valid";

    if (!studentId) {
      status = "missing_student_id";
    } else if (!name) {
      status = "missing_name";
    } else if ((studentIdCounts.get(studentId) ?? 0) > 1) {
      status = "duplicate";
    }

    return { studentId, name, status };
  });

  const validCount = members.filter(
    (member) => member.status === "valid",
  ).length;

  return {
    fileName: file.name,
    totalRows: members.length,
    validCount,
    errorCount: members.length - validCount,
    members,
  };
}
