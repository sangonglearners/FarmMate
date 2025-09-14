// Crop entity pure utility functions

export const getCropImage = (cropName: string) => {
  // Return placeholder image based on crop type
  switch (cropName) {
    case "콜라비":
      return "https://images.unsplash.com/photo-1590502593747-42a996133562?w=150&h=150&fit=crop&crop=center";
    case "당근":
      return "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=150&h=150&fit=crop&crop=center";
    case "비트":
      return "https://images.unsplash.com/photo-1570362946382-66c071e4e126?w=150&h=150&fit=crop&crop=center";
    case "미니양배추":
      return "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=150&h=150&fit=crop&crop=center";
    default:
      return "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=150&h=150&fit=crop&crop=center";
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case "growing":
      return "bg-green-500";
    case "harvesting":
      return "bg-yellow-500";
    case "completed":
      return "bg-gray-500";
    default:
      return "bg-blue-500";
  }
};

export const getStatusText = (status: string) => {
  switch (status) {
    case "growing":
      return "재배중";
    case "harvesting":
      return "수확중";
    case "completed":
      return "완료";
    default:
      return status;
  }
};

export const formatCropDetails = (category: string, name: string, variety: string) => {
  return `${category} > ${name} > ${variety}`;
};