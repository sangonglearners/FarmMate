import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MoreVertical, Edit, Trash2, MapPin, Sprout, ChevronLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFarms, useDeleteFarm } from "@features/farm-management";
import { useCrops, useDeleteCrop } from "@features/crop-management";
import { AddFarmDialog } from "@features/farm-management";
import { AddCropDialog } from "@features/crop-management";
import { useQueryClient } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";

export default function FarmCropManagementPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: allFarms } = useFarms();
  const { data: crops } = useCrops();

  const deleteFarm = useDeleteFarm();
  const deleteCrop = useDeleteCrop();

  const farms = allFarms || [];

  const [isAddFarmDialogOpen, setIsAddFarmDialogOpen] = useState(false);
  const [isAddCropDialogOpen, setIsAddCropDialogOpen] = useState(false);
  const [editingFarm, setEditingFarm] = useState<any | null>(null);
  const [editingCrop, setEditingCrop] = useState<any | null>(null);

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="relative">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 absolute left-0 top-1/2 -translate-y-1/2"
          onClick={() => navigate("/my-page")}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-1">농장 & 작물 관리</h1>
          <p className="text-gray-600 text-sm">내 농장과 작물 정보를 관리합니다</p>
        </div>
      </div>

      {/* 내 농장 정보 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-600" /> 내 농장 정보
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setIsAddFarmDialogOpen(true)}>
            추가
          </Button>
        </div>
        {farms && farms.length > 0 ? (
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {farms.map((f) => (
              <Card key={f.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900">{f.name}</h3>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {f.environment} | {f.area}㎡ | 이랑 {f.rowCount}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingFarm(f);
                            setIsAddFarmDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" /> 수정
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (
                              window.confirm(
                                `정말로 "${f.name}" 농장을 삭제하시겠습니까?\n\n이 농장에 연결된 모든 작물과 작업도 함께 삭제됩니다.`
                              )
                            ) {
                              deleteFarm.mutate(f.id);
                            }
                          }}
                        >
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
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">등록된 농장이 없습니다</div>
            </CardContent>
          </Card>
        )}
      </section>

      <Separator className="my-2" />

      {/* 내 작물 정보 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sprout className="w-5 h-5 text-gray-600" /> 내 작물 정보
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setIsAddCropDialogOpen(true)}>
            수정
          </Button>
        </div>
        {crops && crops.length > 0 ? (
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {crops.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {c.category} {" > "} {c.name} {" > "} {c.variety}
                      </h3>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingCrop(c);
                            setIsAddCropDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" /> 수정
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (
                              window.confirm(
                                `정말로 "${c.name}" 작물을 삭제하시겠습니까?\n\n이 작물에 연결된 모든 작업도 함께 삭제됩니다.`
                              )
                            ) {
                              deleteCrop.mutate(c.id);
                            }
                          }}
                        >
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
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">등록된 작물이 없습니다</div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* 농장/작물 추가/수정 다이얼로그 */}
      <AddFarmDialog
        open={isAddFarmDialogOpen}
        onOpenChange={(open) => {
          setIsAddFarmDialogOpen(open);
          if (!open) {
            setEditingFarm(null);
            queryClient.invalidateQueries({ queryKey: ["/api/farms"] });
          }
        }}
        farm={editingFarm}
      />
      <AddCropDialog
        open={isAddCropDialogOpen}
        onOpenChange={(open) => {
          setIsAddCropDialogOpen(open);
          if (!open) {
            setEditingCrop(null);
            queryClient.invalidateQueries({ queryKey: ["/api/crops"] });
          }
        }}
        crop={editingCrop}
      />
    </div>
  );
}

