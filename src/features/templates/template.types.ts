export type FieldType = "text" | "number" | "date" | "email" | "enum";

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  maxLength?: number;
  pattern?: string;
}

export interface FieldSchemaJson {
  fields: FieldDefinition[];
}
