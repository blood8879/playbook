export const POSITIONS = [
  { value: "GK", label: "GK", color: "bg-yellow-500" },
  { value: "DL", label: "DL", color: "bg-blue-500" },
  { value: "DC", label: "DC", color: "bg-green-500" },
  { value: "DR", label: "DR", color: "bg-red-500" },
  { value: "DMC", label: "DMC", color: "bg-yellow-500" },
  { value: "ML", label: "ML", color: "bg-yellow-500" },
  { value: "MC", label: "MC", color: "bg-blue-500" },
  { value: "MR", label: "MR", color: "bg-green-500" },
  { value: "AML", label: "AML", color: "bg-red-500" },
  { value: "AMC", label: "AMC", color: "bg-yellow-500" },
  { value: "AMR", label: "AMR", color: "bg-blue-500" },
  { value: "ST", label: "ST", color: "bg-green-500" },
] as const;

export type Position = (typeof POSITIONS)[number]["value"];
