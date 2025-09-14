import { useEffect, useState } from "react";
import { Plus, ChevronRight, Sprout, MapPin } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Card, CardContent } from "@shared/ui/card";
import { AddFarmDialog, useFarms } from "@features/farm-management";
import { AddCropDialog, useCrops } from "@features/crop-management";
import type { Farm, Crop } from "@shared/types/schema";

export default function FarmsPage() {
  const [isAddFarmDialogOpen, setIsAddFarmDialogOpen] = useState(false);
  const [isAddCropDialogOpen, setIsAddCropDialogOpen] = useState(false);
  
  const { data: farms, isLoading } = useFarms();
  const { data: crops } = useCrops();

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
          <h2 className="text-lg font-semibold text-gray-900">내 농장 목록</h2>
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
          <div className="space-y-3">
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
                        <p className="text-sm text-gray-600">{farm.location}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {farm.environment === 'outdoor' ? '노지' : 
                           farm.environment === 'greenhouse' ? '시설' : '수경'} | 
                          {farm.size}㎡ | 작물 {farmCrops.length}종
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
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

      {/* Crop Management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">내 작물 관리</h2>
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
          <div className="space-y-3">
            {crops.slice(0, 5).map((crop) => (
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
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {crops.length > 5 && (
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-gray-500">+{crops.length - 5}개 더 보기</p>
                </CardContent>
              </Card>
            )}
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
        onOpenChange={setIsAddFarmDialogOpen}
      />
      
      <AddCropDialog
        open={isAddCropDialogOpen}
        onOpenChange={setIsAddCropDialogOpen}
      />
    </div>
  );
}