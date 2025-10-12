// === Normalization helpers (TOP OF FILE) ===
function pick(row, ...keys) {
  for (const k of keys) if (row[k] !== undefined && row[k] !== null) return row[k];
  return undefined;
}
function toNumber(v) {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const n = Number(v.replace?.(/[^\d.-]/g, "") ?? v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}
function toMonth(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const m = Number((v.match(/\d{1,2}/) || [])[0]);
    return Number.isFinite(m) ? m : undefined;
  }
  return undefined;
}
/** 🔧 한글/영문 뒤섞인 입력 → 영문 키로 통일 */
export function normalizeRow(row) {
  return {
    category: pick(row, "category", "대분류"),
    item: pick(row, "item", "품목"),
    variety: pick(row, "variety", "품종"),
    labor_score: toNumber(pick(row, "labor_score", "노동편의성")),
    rarity_score: toNumber(pick(row, "rarity_score", "품종희소성")),
    sow_start: toMonth(pick(row, "sow_start", "파종(시작) 시기")),
    harvest_end: toMonth(pick(row, "harvest_end", "수확(종료) 시기")),
    profit_open: toNumber(pick(row, "profit_open", "수익성(노지)")),
    profit_greenhouse: toNumber(pick(row, "profit_greenhouse", "수익성(시설)"))
  };
}
export function normalizeRows(rows) {
  return (rows ?? []).map(normalizeRow);
}

class CropRecommendationEngine {
  constructor() {
    // 가중치 고정
    this.weights = {
      '수익성_사용': 0.5,
      '노동편의성': 0.25,
      '품종희소성': 0.25
    };
  }
  // 월 범위 정규화 (연도 넘김 처리)
  normalizeRange(start, end) {
    if (start == null || end == null || isNaN(start) || isNaN(end)) {
      return [
        NaN,
        NaN
      ];
    }
    if (end < start) {
      end += 12;
    }
    return [
      start,
      end
    ];
  }
  // 기간 교차 판정 (overlap 모드)
  isWithinPeriod(cropStartMonth, cropEndMonth, inputStart, inputEnd) {
    const [s, e] = this.normalizeRange(cropStartMonth, cropEndMonth);
    const [S, E] = this.normalizeRange(inputStart, inputEnd);
    if (isNaN(s) || isNaN(e) || isNaN(S) || isNaN(E)) {
      return false;
    }
    // 작물 재배기간을 -12, 0, +12로 평행이동하며 입력 기간과 교차 확인
    const shifts = [
      [
        s,
        e
      ],
      [
        s + 12,
        e + 12
      ],
      [
        s - 12,
        e - 12
      ]
    ];
    for (const [ss, ee] of shifts) {
      // overlap 체크: 하나라도 겹치면 통과
      if (ss <= E && ee >= S) {
        return true;
      }
    }
    return false;
  }
  // 문자열에서 월 추출 ("1월 초" -> 1)
  extractMonth(monthStr) {
    if (!monthStr) return NaN;
    const match = String(monthStr).match(/(\d{1,2})/);
    return match ? parseInt(match[1]) : NaN;
  }
  // log1p 변환
  log1p(arr) {
    return arr.map((x) => isNaN(x) || x == null ? x : Math.log1p(x));
  }
  // 이산형 변수 스케일링 (2~5 → 0~1)
  scaleDiscreteVariable(value) {
    if (value == null || isNaN(value)) return NaN;
    // 2~5 범위를 0~1로 매핑: (x - 2) / (5 - 2)
    return (value - 2) / 3;
  }
  // 수익성 점수 변환 (log1p + MinMaxScaling → [0,1])
  calculateProfitScores(profitValues) {
    // 1. log1p 변환
    const logTransformed = this.log1p(profitValues);
    // 2. 유효한 값들만 필터링
    const validValues = logTransformed.filter((x) => !isNaN(x) && x != null);
    if (validValues.length === 0) {
      return profitValues.map(() => NaN);
    }
    // 3. Min-Max 값 찾기
    const minValue = Math.min(...validValues);
    const maxValue = Math.max(...validValues);
    // Min과 Max가 같으면 모든 값을 0.5로 설정
    if (maxValue === minValue) {
      return logTransformed.map((x) => isNaN(x) || x == null ? NaN : 0.5);
    }
    // 4. MinMaxScaling: (x - min) / (max - min)
    return logTransformed.map((x) => {
      if (isNaN(x) || x == null) return NaN;
      return (x - minValue) / (maxValue - minValue);
    });
  }
  // 간단한 그리디 MILP 대체 (최적화 로직)
  solveMILP(crops, maxCombinations = 3) {
    console.log(`\n🔧 === MILP 최적화 시작 ===`);
    const results = [];
    const usedIndicesSets = []; // 이전에 사용한 인덱스 조합들
    // 대분류+품목별 그룹화 (한 번만 수행)
    const groups = {};
    crops.forEach((crop, index) => {
      const key = `${crop.대분류 || '미정'}_${crop.품목 || '미정'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push({
        crop,
        index,
        score: crop.finalScore || 0
      });
    });
    console.log(`📦 총 그룹 수: ${Object.keys(groups).length}개`);
    // 각 그룹에서 점수 높은 순으로 정렬
    Object.values(groups).forEach((group) => {
      group.sort((a, b) => b.score - a.score);
    });
    const groupKeys = Object.keys(groups);
    // 그룹 수가 3개 미만이면 조합 불가
    if (groupKeys.length < 3) {
      console.log(`❌ 그룹이 3개 미만이므로 조합 생성 불가`);
      return results;
    }
    // 여러 조합 찾기
    for (let comboNum = 0; comboNum < maxCombinations; comboNum++) {
      console.log(`\n🔍 조합 ${comboNum + 1} 탐색 중...`);
      // 모든 가능한 3개 조합 생성
      const allCombinations = [];
      // 3중 반복문으로 모든 조합 생성 (각 그룹에서 최대 3개씩)
      for (let g1 = 0; g1 < groupKeys.length; g1++) {
        const group1Items = groups[groupKeys[g1]].slice(0, 3); // 상위 3개만
        for (let g2 = g1 + 1; g2 < groupKeys.length; g2++) {
          const group2Items = groups[groupKeys[g2]].slice(0, 3);
          for (let g3 = g2 + 1; g3 < groupKeys.length; g3++) {
            const group3Items = groups[groupKeys[g3]].slice(0, 3);
            // 각 그룹에서 하나씩 선택
            for (const item1 of group1Items) {
              for (const item2 of group2Items) {
                for (const item3 of group3Items) {
                  const indices = [
                    item1.index,
                    item2.index,
                    item3.index
                  ].sort((a, b) => a - b);
                  // 이전 조합과 완전히 동일한지 체크
                  let isDuplicate = false;
                  for (const usedSet of usedIndicesSets) {
                    if (indices.length === usedSet.length && indices.every((val, idx) => val === usedSet[idx])) {
                      isDuplicate = true;
                      break;
                    }
                  }
                  if (!isDuplicate) {
                    allCombinations.push({
                      crops: [
                        item1.crop,
                        item2.crop,
                        item3.crop
                      ],
                      indices: indices,
                      totalScore: item1.score + item2.score + item3.score
                    });
                  }
                }
              }
            }
          }
        }
      }
      console.log(`📊 생성된 후보 조합 수: ${allCombinations.length}개`);
      if (allCombinations.length === 0) {
        console.log(`⚠️ 더 이상 새로운 조합을 찾을 수 없습니다.`);
        break;
      }
      // 점수가 가장 높은 조합 선택
      allCombinations.sort((a, b) => b.totalScore - a.totalScore);
      const bestCombo = allCombinations[0];
      console.log(`✅ 선택: 인덱스 [${bestCombo.indices.join(', ')}], 점수: ${bestCombo.totalScore.toFixed(3)}`);
      console.log(`   작물: ${bestCombo.crops.map((c) => c.품목).join(', ')}`);
      // 선택된 조합 저장
      usedIndicesSets.push(bestCombo.indices);
      results.push(bestCombo.crops);
    }
    console.log(`\n✅ 최종 ${results.length}개 조합 선택 완료\n`);
    return results;
  }
  // 메인 추천 함수
  async recommendCrops(startMonth, endMonth, inputPlace, inputIrang, cropsData) {
    try {
      console.log(`🌱 추천 시작: ${startMonth}월~${endMonth}월, ${inputPlace}, ${inputIrang}이랑`);
      // 🔧 영문/한글 컬럼명 통일
      const normalizedCrops = normalizeRows(cropsData);
      console.log(`📊 정규화된 작물 수: ${normalizedCrops.length}개`);
      // 1. 데이터 전처리 (정규화된 데이터 사용)
      const processedCrops = normalizedCrops.map((crop) => ({
        ...crop,
        재배시작월: crop.sow_start,
        재배완료월: crop.harvest_end,
        대분류: crop.category || '미정',
        품목: crop.item || '미정',
        품종: crop.variety,
        노동편의성: crop.labor_score,
        품종희소성: crop.rarity_score,
        '수익성(노지)': crop.profit_open,
        '수익성(시설)': crop.profit_greenhouse
      }));
      console.log(`📊 전체 작물 수: ${processedCrops.length}개`);
      // 2. 수익성 컬럼 선택
      processedCrops.forEach((crop) => {
        if (inputPlace === "노지") {
          crop.수익성_사용 = crop['수익성(노지)'];
        } else if (inputPlace === "시설") {
          crop.수익성_사용 = crop['수익성(시설)'];
        } else {
          // 기타의 경우 두 수익성 중 높은 값
          const 노지 = parseFloat(crop['수익성(노지)']) || 0;
          const 시설 = parseFloat(crop['수익성(시설)']) || 0;
          crop.수익성_사용 = Math.max(노지, 시설);
        }
      });
      // 3. 기간 필터링
      const filteredCrops = processedCrops.filter((crop) => this.isWithinPeriod(crop.재배시작월, crop.재배완료월, startMonth, endMonth));
      console.log(`🔍 기간 필터 후: ${filteredCrops.length}개`);
      if (filteredCrops.length < 3) {
        return {
          recommended_combinations: [],
          total_profit: 0,
          cards: [],
          error: "추천 가능한 작물이 3개 미만입니다. 재배 시기를 조정해주세요."
        };
      }
      // 4. 수익성 점수 계산 (log1p + MinMaxScaling → [0,1])
      const profitValues = filteredCrops.map((crop) => parseFloat(crop.수익성_사용) || NaN);
      const profitScores = this.calculateProfitScores(profitValues);
      console.log(`💰 수익성 점수 범위: ${Math.min(...profitScores.filter((s) => !isNaN(s)))} ~ ${Math.max(...profitScores.filter((s) => !isNaN(s)))}`);
      // 5. 노동편의성과 품종희소성 스케일링 (2~5 → 0~1)
      const laborScores = filteredCrops.map((crop) => this.scaleDiscreteVariable(parseFloat(crop.노동편의성)));
      const rarityScores = filteredCrops.map((crop) => this.scaleDiscreteVariable(parseFloat(crop.품종희소성)));
      console.log(`🔧 노동편의성 점수 범위: ${Math.min(...laborScores.filter((s) => !isNaN(s)))} ~ ${Math.max(...laborScores.filter((s) => !isNaN(s)))}`);
      console.log(`💎 품종희소성 점수 범위: ${Math.min(...rarityScores.filter((s) => !isNaN(s)))} ~ ${Math.max(...rarityScores.filter((s) => !isNaN(s)))}`);
      // 6. 스케일링된 점수를 작물 데이터에 저장
      filteredCrops.forEach((crop, index) => {
        crop.profitScore = profitScores[index] || 0;
        crop.laborScore = laborScores[index] || 0;
        crop.rarityScore = rarityScores[index] || 0;
      });
      // 7. 최종 점수 계산 (모두 스케일링된 0~1 값 사용)
      filteredCrops.forEach((crop) => {
        crop.finalScore = crop.profitScore * this.weights['수익성_사용'] + crop.laborScore * this.weights['노동편의성'] + crop.rarityScore * this.weights['품종희소성'];
      });
      console.log(`🎯 최종 점수 범위: ${Math.min(...filteredCrops.map((c) => c.finalScore))} ~ ${Math.max(...filteredCrops.map((c) => c.finalScore))}`);
      // 8. 최적화로 조합 선택
      const selectedCombinations = this.solveMILP(filteredCrops, 3);
      console.log(`🎯 선택된 조합 수: ${selectedCombinations.length}개`);
      if (selectedCombinations.length === 0) {
        return {
          recommended_combinations: [],
          total_profit: 0,
          cards: [],
          error: "조건에 맞는 추천 조합이 없습니다. 조건을 변경해주세요."
        };
      }
      // 9. 결과 포맷팅
      const areaPerCrop = parseFloat(inputIrang) / 3.0;
      const cards = [];
      const allCombinations = [];
      selectedCombinations.forEach((combo, idx) => {
        // 조합 내 점수순 정렬
        const sortedCombo = combo.sort((a, b) => b.finalScore - a.finalScore).map((crop) => {
          const itemName = String(crop.품목 || '');
          const variety = crop.품종;
          const displayName = variety && String(variety).trim() ? `${itemName} (${variety})` : itemName;
          return {
            name: displayName,
            item: itemName,
            variety: variety || null,
            score: Math.round(crop.finalScore * 1000) / 1000,
            profit_score: Math.round(crop.profitScore * 1000) / 1000,
            labor_score: Math.round(crop.laborScore * 1000) / 1000,
            rarity_score: Math.round(crop.rarityScore * 1000) / 1000,
            수익성_사용: crop.수익성_사용,
            노동편의성: parseFloat(crop.노동편의성) || null,
            품종희소성: parseFloat(crop.품종희소성) || null
          };
        });
        allCombinations.push(sortedCombo);
        // 예상 수익 계산
        const expectedRevenue = combo.reduce((sum, crop) => {
          return sum + (parseFloat(crop.수익성_사용) || 0) * areaPerCrop;
        }, 0);
        // 카드 데이터 생성 (스케일링된 점수 사용, 0~3 범위로 표시)
        const sumProfitScore = combo.reduce((sum, crop) => sum + (crop.profitScore || 0), 0);
        const sumLaborScore = combo.reduce((sum, crop) => sum + (crop.laborScore || 0), 0);
        const sumRarityScore = combo.reduce((sum, crop) => sum + (crop.rarityScore || 0), 0);
        cards.push({
          title: `Gift box ${idx + 1}`,
          crops: sortedCombo.map((c) => c.name),
          indicators: {
            수익성: Math.round(sumProfitScore * 10) / 10,
            노동편의성: Math.round(sumLaborScore * 10) / 10,
            품종희소성: Math.round(sumRarityScore * 10) / 10
          },
          expected_revenue: Math.round(expectedRevenue).toLocaleString()
        });
      });
      console.log("✅ 추천 완료!");
      return {
        recommended_combinations: allCombinations,
        total_profit: cards.length > 0 ? parseInt(cards[0].expected_revenue.replace(/,/g, '')) : 0,
        cards: cards,
        recommended_crops: allCombinations.flat()
      };
    } catch (error) {
      console.error('❌ Crop recommendation error:', error);
      return {
        recommended_combinations: [],
        total_profit: 0,
        cards: [],
        error: `알고리즘 실행 중 오류가 발생했습니다: ${error.message}`
      };
    }
  }
}

// Supabase Edge Function용 내보내기
export { CropRecommendationEngine as default };
