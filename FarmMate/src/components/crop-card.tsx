import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Crop } from "@shared/schema";

interface CropCardProps {
  crop: Crop;
  onEdit: (crop: Crop) => void;
  onDelete: (crop: Crop) => void;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
}

export default function CropCard({ crop, onEdit, onDelete, getStatusColor, getStatusText }: CropCardProps) {
  const getCropImage = () => {
    // Return placeholder image based on crop type
    switch (crop.name) {
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

  return (
    <Card className="crop-card">
      <CardContent className="p-6">
        <div className="relative text-center">
          <div className="absolute top-0 right-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onEdit(crop)}>
                  <Edit className="w-4 h-4 mr-2" />
                  수정
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(crop)} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <img 
            src={getCropImage()} 
            alt={`${crop.name}`}
            className="w-20 h-20 rounded-lg mx-auto mb-4 object-cover" 
          />
          <h4 className="font-medium text-gray-900 mb-2">
            {crop.category} {'>'} {crop.name} {'>'} {crop.variety}
          </h4>
          <div className="flex items-center justify-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${getStatusColor(crop.status || 'growing')}`}></span>
            <span className="text-xs text-gray-600">{getStatusText(crop.status || 'growing')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
