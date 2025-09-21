import { useEffect, useState } from "react";
import { Plus, Sprout, MapPin, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AddFarmDialog, useFarms, useDeleteFarm } from "@features/farm-management";
import { AddCropDialog, useCrops, useDeleteCrop } from "@features/crop-management";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Crop } from "@shared/schema";
import type { FarmEntity } from "@/shared/api/farm.repository";
import { Separator } from "@/components/ui/separator";

export default function FarmsPage() {
  const [isAddFarmDialogOpen, setIsAddFarmDialogOpen] = useState(false);
  const [isAddCropDialogOpen, setIsAddCropDialogOpen] = useState(false);
  const [editingFarm, setEditingFarm] = useState<FarmEntity | null>(null);
  const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
  
  const { data: farms, isLoading } = useFarms();
  const { data: crops } = useCrops();
  const deleteFarm = useDeleteFarm();
  const deleteCrop = useDeleteCrop();

  // Open dialogs when query params are present (e.g., /farms?add=farm or ?add=crop)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const add = params.get('add');
    if (add === 'farm') setIsAddFarmDialogOpen(true);
    if (add === 'crop') setIsAddCropDialogOpen(true);
  }, []);

  const getFarmCrops = (farmId: string) => {
    return crops?.filter(crop => crop.farmId === farmId) || [];
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="h-8 bg-gray-200 rounded mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">농장 & 작물 관리</h1>
        <p className="text-gray-600 text-sm">나의 농장과 작물을 관리해 보세요</p>
      </div>

      {/* Farm List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><MapPin className="w-5 h-5 text-gray-600" /> 내 농장 목록</h2>
          <Button 
            size="sm" 
            onClick={() => setIsAddFarmDialogOpen(true)}
            className="flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>농장 추가</span>
          </Button>
        </div>

        {farms && farms.length > 0 ? (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {farms.map((farm) => {
              const farmCrops = getFarmCrops(farm.id);
              
              return (
                <Card key={farm.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <h3 className="font-medium text-gray-900">{farm.name}</h3>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {farm.environment} | {farm.area}㎡ | 이랑 {farm.rowCount} | 작물 {farmCrops.length}종
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingFarm(farm); setIsAddFarmDialogOpen(true); }}>
                              <Edit className="w-4 h-4 mr-2" /> 수정
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteFarm.mutate(farm.id)}>
                              <Trash2 className="w-4 h-4 mr-2" /> 삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">등록된 농장이 없습니다</p>
              <Button onClick={() => setIsAddFarmDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                첫 농장 추가하기
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator className="my-2" />

      {/* Crop Management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Sprout className="w-5 h-5 text-gray-600" /> 내 작물 관리</h2>
          <Button 
            size="sm" 
            onClick={() => setIsAddCropDialogOpen(true)}
            className="flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>작물 추가</span>
          </Button>
        </div>

        {crops && crops.length > 0 ? (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {crops.map((crop) => (
              <Card key={crop.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Sprout className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {crop.category} {'>'} {crop.name} {'>'} {crop.variety}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {farms?.find(f => f.id === crop.farmId)?.name || '농장 정보 없음'}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingCrop(crop); setIsAddCropDialogOpen(true); }}>
                          <Edit className="w-4 h-4 mr-2" /> 수정
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteCrop.mutate(crop.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> 삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Sprout className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">등록된 작물이 없습니다</p>
              <Button onClick={() => setIsAddCropDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                첫 작물 추가하기
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AddFarmDialog
        open={isAddFarmDialogOpen}
        onOpenChange={(open) => { setIsAddFarmDialogOpen(open); if (!open) setEditingFarm(null); }}
        farm={editingFarm}
      />
      
      <AddCropDialog
        open={isAddCropDialogOpen}
        onOpenChange={(open) => { setIsAddCropDialogOpen(open); if (!open) setEditingCrop(null); }}
        crop={editingCrop}
      />
    </div>
  );
}