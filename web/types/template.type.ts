export type Template = {
  name: string;
  svgTemplate: string;
  fields: {
    key: string;
    type: "string" | "date";
    required: boolean;
  }[];
  blockchain: {
    abi: string;
    bytecode: string;
    contractSource: string;
    compilationStatus: "success" | "pending" | "failed";
    contractAddress: string;
    deployedAddress: string;
  };
  createdBy: string;
  id?: string | undefined;
  description?: string | undefined;
  createdAt?: Date | undefined;
  updatedAt?: Date | undefined;
};

export type TemplateSelectionStepProps = {
  selectedTemplate: Template | null;
  onSelectTemplate: (template: Template) => void;
};
