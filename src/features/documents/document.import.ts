import Papa from "papaparse";

import { AppError } from "../../shared/errors";

export type CsvRow = Record<string, string>;

export const parseCsv = (input: string): CsvRow[] => {
  const result = Papa.parse<CsvRow>(input, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    throw AppError.validation(`CSV parse error: ${result.errors[0]?.message}`);
  }

  if (result.data.length === 0) {
    throw AppError.validation("CSV contains no rows");
  }
  if (result.data.length > 1000) {
    throw AppError.validation("CSV exceeds 1000 rows");
  }

  return result.data;
};

export interface ParsedCsvRow {
  expiresAt?: string;
  externalRef?: string;
  fields: Record<string, string>;
  recipient?: { email: string; name: string };
}

export const splitCsvRow = (
  row: CsvRow,
  fieldKeys: Set<string>
): ParsedCsvRow => {
  const fields: Record<string, string> = {};
  let recipientEmail: string | undefined;
  let recipientName: string | undefined;
  let expiresAt: string | undefined;
  let externalRef: string | undefined;

  for (const [key, value] of Object.entries(row)) {
    if (value === undefined || value === "") {
      continue;
    }

    switch (key) {
      case "recipient_email": {
        recipientEmail = value;
        break;
      }
      case "recipient_name": {
        recipientName = value;
        break;
      }
      case "expires_at": {
        expiresAt = value;
        break;
      }
      case "external_ref": {
        externalRef = value;
        break;
      }
      default: {
        if (!fieldKeys.has(key)) {
          throw AppError.validation(
            `Unknown CSV column "${key}" is not a template field`
          );
        }
        fields[key] = value;
      }
    }
  }

  const recipient =
    recipientEmail && recipientName
      ? { email: recipientEmail, name: recipientName }
      : undefined;

  return { expiresAt, externalRef, fields, recipient };
};
