// Farm entity pure utility functions

export const getEnvironmentIcon = (environment: string) => {
  switch (environment) {
    case "노지":
      return "🌾";
    case "시설":
      return "🏠";
    default:
      return "🚜";
  }
};

export const getEnvironmentLabel = (environment: string) => {
  switch (environment) {
    case "outdoor":
      return "노지";
    case "greenhouse":
      return "시설";
    case "hydroponic":
      return "수경";
    default:
      return environment;
  }
};

export const formatFarmSize = (size: number) => {
  if (size >= 10000) {
    return `${(size / 10000).toFixed(1)}ha`;
  }
  return `${size}㎡`;
};