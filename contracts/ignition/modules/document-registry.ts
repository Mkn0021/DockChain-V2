import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DocumentRegistryModule", (m) => {
  const registry = m.contract("DocumentRegistry");
  return { registry };
});
