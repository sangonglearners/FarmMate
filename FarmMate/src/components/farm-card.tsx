import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Card, CardContent } from "@shared/ui/card";
import { Button } from "@shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@shared/ui/dropdown-menu";
import type { Farm } from "@shared/schema";

interface FarmCardProps {
  farm: Farm;
  onEdit: (farm: Farm) => void;
  onDelete: (farm: Farm) => void;
}

export default function FarmCard({ farm, onEdit, onDelete }: FarmCardProps) {
  const getEnvironmentIcon = () => {
    switch (farm.environment) {
      case "노지":
        return "🌾";
      case "시설":
        return "🏠";
      default:
        return "🚜";
    }
  };

  return (
    <Card className="farm-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <span className="text-2xl">{getEnvironmentIcon()}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onEdit(farm)}>
                <Edit className="w-4 h-4 mr-2" />
                수정
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(farm)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <h4 className="font-semibold text-gray-900 mb-2">{farm.name}</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>재배환경</span>
            <span className="font-medium">{farm.environment}</span>
          </div>
          <div className="flex justify-between">
            <span>이랑개수</span>
            <span className="font-medium">{farm.rowCount}이랑</span>
          </div>
          <div className="flex justify-between">
            <span>면적</span>
            <span className="font-medium">{farm.area}m²</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
