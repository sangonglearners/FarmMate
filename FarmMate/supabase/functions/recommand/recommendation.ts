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
        return [NaN, NaN];
      }
      
      if (end < start) {  // 다음 해로 넘어가는 경우 (11월~4월)
        end += 12;
      }
      return [start, end];
    }
  
    // 기간 교차 판정 (overlap 모드)
    isWithinPeriod(cropStartMonth, cropEndMonth, inputStart, inputEnd) {
      const [s, e] = this.normalizeRange(cropStartMonth, cropEndMonth);
      const [S, E] = this.normalizeRange(inputStart, inputEnd);
      
      if (isNaN(s) || isNaN(e) || isNaN(S) || isNaN(E)) {
        return false;
      }
  
      // 작물 재배기간을 -12, 0, +12로 평행이동하며 입력 기간과 교차 확인
      const shifts = [[s, e], [s + 12, e + 12], [s - 12, e - 12]];
      
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
      return arr.map(x => isNaN(x) || x == null ? x : Math.log1p(x));
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
      const validValues = logTransformed.filter(x => !isNaN(x) && x != null);
      
      if (validValues.length === 0) {
        return profitValues.map(() => NaN);
      }
      
      // 3. Min-Max 값 찾기
      const minValue = Math.min(...validValues);
      const maxValue = Math.max(...validValues);
      
      // Min과 Max가 같으면 모든 값을 0.5로 설정
      if (maxValue === minValue) {
        return logTransformed.map(x => isNaN(x) || x == null ? NaN : 0.5);
      }
      
      // 4. MinMaxScaling: (x - min) / (max - min)
      return logTransformed.map(x => {
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
        groups[key].push({ crop, index, score: crop.finalScore || 0 });
      });
  
      console.log(`📦 총 그룹 수: ${Object.keys(groups).length}개`);
  
      // 각 그룹에서 점수 높은 순으로 정렬
      Object.values(groups).forEach(group => {
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
                    const indices = [item1.index, item2.index, item3.index].sort((a, b) => a - b);
                    
                    // 이전 조합과 완전히 동일한지 체크
                    let isDuplicate = false;
                    for (const usedSet of usedIndicesSets) {
                      if (indices.length === usedSet.length && 
                          indices.every((val, idx) => val === usedSet[idx])) {
                        isDuplicate = true;
                        break;
                      }
                    }
                    
                    if (!isDuplicate) {
                      allCombinations.push({
                        crops: [item1.crop, item2.crop, item3.crop],
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
        console.log(`   작물: ${bestCombo.crops.map(c => c.품목).join(', ')}`);
  
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
        
        // 1. 데이터 전처리
        const processedCrops = cropsData.map(crop => ({
          ...crop,
          재배시작월: this.extractMonth(crop['파종(시작) 시기']),
          재배완료월: this.extractMonth(crop['수확(종료) 시기']),
          대분류: crop.대분류 || '미정',
          품목: crop.품목 || '미정'
        }));
  
        console.log(`📊 전체 작물 수: ${processedCrops.length}개`);
  
        // 2. 수익성 컬럼 선택
        processedCrops.forEach(crop => {
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
        const filteredCrops = processedCrops.filter(crop =>
          this.isWithinPeriod(crop.재배시작월, crop.재배완료월, startMonth, endMonth)
        );
  
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
        const profitValues = filteredCrops.map(crop => 
          parseFloat(crop.수익성_사용) || NaN
        );
        const profitScores = this.calculateProfitScores(profitValues);
  
        console.log(`💰 수익성 점수 범위: ${Math.min(...profitScores.filter(s => !isNaN(s)))} ~ ${Math.max(...profitScores.filter(s => !isNaN(s)))}`);
  
        // 5. 노동편의성과 품종희소성 스케일링 (2~5 → 0~1)
        const laborScores = filteredCrops.map(crop => 
          this.scaleDiscreteVariable(parseFloat(crop.노동편의성))
        );
        const rarityScores = filteredCrops.map(crop => 
          this.scaleDiscreteVariable(parseFloat(crop.품종희소성))
        );
  
        console.log(`🔧 노동편의성 점수 범위: ${Math.min(...laborScores.filter(s => !isNaN(s)))} ~ ${Math.max(...laborScores.filter(s => !isNaN(s)))}`);
        console.log(`💎 품종희소성 점수 범위: ${Math.min(...rarityScores.filter(s => !isNaN(s)))} ~ ${Math.max(...rarityScores.filter(s => !isNaN(s)))}`);
  
        // 6. 스케일링된 점수를 작물 데이터에 저장
        filteredCrops.forEach((crop, index) => {
          crop.profitScore = profitScores[index] || 0;
          crop.laborScore = laborScores[index] || 0;
          crop.rarityScore = rarityScores[index] || 0;
        });
  
        // 7. 최종 점수 계산 (모두 스케일링된 0~1 값 사용)
        filteredCrops.forEach(crop => {
          crop.finalScore = (
            crop.profitScore * this.weights['수익성_사용'] +
            crop.laborScore * this.weights['노동편의성'] +
            crop.rarityScore * this.weights['품종희소성']
          );
        });
  
        console.log(`🎯 최종 점수 범위: ${Math.min(...filteredCrops.map(c => c.finalScore))} ~ ${Math.max(...filteredCrops.map(c => c.finalScore))}`);
  
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
          const sortedCombo = combo
            .sort((a, b) => b.finalScore - a.finalScore)
            .map(crop => {
              const itemName = String(crop.품목 || '');
              const variety = crop.품종;
              const displayName = variety && String(variety).trim() ? 
                `${itemName} (${variety})` : itemName;
  
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
            return sum + ((parseFloat(crop.수익성_사용) || 0) * areaPerCrop);
          }, 0);
  
          // 카드 데이터 생성 (스케일링된 점수 사용, 0~3 범위로 표시)
          const sumProfitScore = combo.reduce((sum, crop) => sum + (crop.profitScore || 0), 0);
          const sumLaborScore = combo.reduce((sum, crop) => sum + (crop.laborScore || 0), 0);
          const sumRarityScore = combo.reduce((sum, crop) => sum + (crop.rarityScore || 0), 0);
  
          cards.push({
            title: `Gift box ${idx + 1}`,
            crops: sortedCombo.map(c => c.name),
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
          total_profit: cards.length > 0 ? 
            parseInt(cards[0].expected_revenue.replace(/,/g, '')) : 0,
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
  
  // ===========================================
  // 테스트용 샘플 데이터 및 실행 함수
  // ===========================================
  
  // 샘플 데이터
  const sampleCropsData = [
    {"대분류":"콩_완두","품목":"스냅피","품종":"슈가앤","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"1월 초","수확(종료) 시기":"4월 초","수익성(노지)":29700,"수익성(시설)":31500},
    {"대분류":"콩_완두","품목":"스냅피","품종":"슈가레이스","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"1월 초","수확(종료) 시기":"4월 중순","수익성(노지)":69800,"수익성(시설)":319500},
    {"대분류":"콩_완두","품목":"스냅피","품종":"스시나인","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"1월 초","수확(종료) 시기":"4월 중순","수익성(노지)":69800,"수익성(시설)":319500},
    {"대분류":"콩_완두","품목":"스냅피","품종":"구르메","노동편의성":2,"품종희소성":5,"파종(시작) 시기":"1월 초","수확(종료) 시기":"4월 중순","수익성(노지)":69800,"수익성(시설)":319500},
    {"대분류":"콩_완두","품목":"스냅피","품종":"슈가스냅","노동편의성":2,"품종희소성":5,"파종(시작) 시기":"1월 초","수확(종료) 시기":"4월 중순","수익성(노지)":69800,"수익성(시설)":319500},
    {"대분류":"콩_채두","품목":"그린빈","품종":"칼리마","노동편의성":3,"품종희소성":3,"파종(시작) 시기":"4월","수확(종료) 시기":"8월","수익성(노지)":69800,"수익성(시설)":319500},
    {"대분류":"콩_채두","품목":"그린빈","품종":"캐피타노","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"4월 초","수확(종료) 시기":"6월 말","수익성(노지)":69800,"수익성(시설)":319500},
    {"대분류":"콩_채두","품목":"쉘빈","품종":"드래곤빈","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"4월 초","수확(종료) 시기":"6월 말","수익성(노지)":69800,"수익성(시설)":319500},
    {"대분류":"콩_채두","품목":"드라이빈","품종":"비프빈","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"4월 초","수확(종료) 시기":"6월 말","수익성(노지)":69800,"수익성(시설)":319500},
    {"대분류":"콩_잠두","품목":"풋잠두","품종":"소라마메","노동편의성":4,"품종희소성":3,"파종(시작) 시기":"10월","수확(종료) 시기":"5월","수익성(노지)":5000,"수익성(시설)":55100},
    {"대분류":"콩_잠두","품목":"풋잠두","품종":"브로드빈","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"10월","수확(종료) 시기":"5월","수익성(노지)":5000,"수익성(시설)":59700},
    {"대분류":"콩_강두","품목":"롱빈","품종":"샤사케","노동편의성":2,"품종희소성":5,"파종(시작) 시기":"3월","수확(종료) 시기":"6월","수익성(노지)":69800,"수익성(시설)":319500},
    {"대분류":"콩_강두","품목":"롱빈","품종":"퍼스트레이디","노동편의성":2,"품종희소성":4,"파종(시작) 시기":"3월","수확(종료) 시기":"6월","수익성(노지)":69800,"수익성(시설)":319500},
    {"대분류":"콩_대두","품목":"풋콩","품종":"차마메","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"4월 중순","수확(종료) 시기":"8월 중순","수익성(노지)":596500,"수익성(시설)":319500},
    {"대분류":"음식꽃","품목":"컬리플라워","품종":"피오레또","노동편의성":4,"품종희소성":2,"파종(시작) 시기":"11월","수확(종료) 시기":"5월 말","수익성(노지)":283550,"수익성(시설)":629000},
    {"대분류":"음식꽃","품목":"컬리플라워","품종":"피오레또 퍼플","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"11월","수확(종료) 시기":"5월 말","수익성(노지)":283650,"수익성(시설)":718800},
    {"대분류":"음식꽃","품목":"컬리플라워","품종":"로마네스코","노동편의성":3,"품종희소성":5,"파종(시작) 시기":"11월","수확(종료) 시기":"5월 말","수익성(노지)":872500,"수익성(시설)":629000},
    {"대분류":"음식꽃","품목":"컬리플라워","품종":"퍼플사파이어","노동편의성":3,"품종희소성":3,"파종(시작) 시기":"11월","수확(종료) 시기":"5월 말","수익성(노지)":872500,"수익성(시설)":539100},
    {"대분류":"음식꽃","품목":"컬리플라워","품종":"오렌지사파이어","노동편의성":4,"품종희소성":3,"파종(시작) 시기":"11월","수확(종료) 시기":"5월 말","수익성(노지)":872500,"수익성(시설)":539100},
    {"대분류":"음식꽃","품목":"컬리플라워","품종":"비타베르데","노동편의성":2,"품종희소성":4,"파종(시작) 시기":"11월","수확(종료) 시기":"5월 말","수익성(노지)":327850,"수익성(시설)":584000},
    {"대분류":"음식꽃","품목":"컬리플라워","품종":"화이트","노동편의성":4,"품종희소성":3,"파종(시작) 시기":"11월","수확(종료) 시기":"5월 말","수익성(노지)":523500,"수익성(시설)":449200},
    {"대분류":"음식꽃","품목":"브로콜리니","품종":"탑스템(TopStem)","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"11월","수확(종료) 시기":"5월","수익성(노지)":807075,"수익성(시설)":119000},
    {"대분류":"음식꽃","품목":"채화","품종":"하바나","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"9월","수확(종료) 시기":"4월","수익성(노지)":69800,"수익성(시설)":798700},
    {"대분류":"음식꽃","품목":"채화","품종":"홍채","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"9월","수확(종료) 시기":"4월","수익성(노지)":69800,"수익성(시설)":798700},
    {"대분류":"음식꽃","품목":"옥수수꽃","품종":"초당옥수수","노동편의성":4,"품종희소성":5,"파종(시작) 시기":"6월","수확(종료) 시기":"10월","수익성(노지)":174500,"수익성(시설)":678900},
    {"대분류":"음식꽃","품목":"호박","품종":"호박꽃","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"5월 초","수확(종료) 시기":"7월","수익성(노지)":69800,"수익성(시설)":613400},
    {"대분류":"가지","품목":"구이가지","품종":"비올레타디시칠리아","노동편의성":4,"품종희소성":4,"파종(시작) 시기":"12월 말","수확(종료) 시기":"10월","수익성(노지)":509100,"수익성(시설)":319500},
    {"대분류":"가지","품목":"구이가지","품종":"만쥬","노동편의성":4,"품종희소성":4,"파종(시작) 시기":"12월 말","수확(종료) 시기":"10월","수익성(노지)":511500,"수익성(시설)":319500},
    {"대분류":"가지","품목":"구이가지","품종":"카모","노동편의성":4,"품종희소성":3,"파종(시작) 시기":"12월 말","수확(종료) 시기":"10월","수익성(노지)":511500,"수익성(시설)":31900},
    {"대분류":"가지","품목":"물가지","품종":"샐러드가지","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"12월 말","수확(종료) 시기":"10월","수익성(노지)":447400,"수익성(시설)":239600},
    {"대분류":"가지","품목":"물가지","품종":"센슈키누카와","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"12월 말","수확(종료) 시기":"10월","수익성(노지)":449600,"수익성(시설)":239600},
    {"대분류":"가지","품목":"물가지","품종":"꿈의물방울","노동편의성":4,"품종희소성":3,"파종(시작) 시기":"12월 말","수확(종료) 시기":"10월","수익성(노지)":449600,"수익성(시설)":239600},
    {"대분류":"가지","품목":"물가지","품종":"물의정원","노동편의성":3,"품종희소성":5,"파종(시작) 시기":"12월 말","수확(종료) 시기":"10월","수익성(노지)":449600,"수익성(시설)":239600},
    {"대분류":"가지","품목":"물가지","품종":"페어리테일","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"12월 말","수확(종료) 시기":"10월","수익성(노지)":449600,"수익성(시설)":239600},
    {"대분류":"무","품목":"보라무","품종":"보라킹","노동편의성":4,"품종희소성":4,"파종(시작) 시기":"9월","수확(종료) 시기":"4월","수익성(노지)":90000,"수익성(시설)":396400},
    {"대분류":"무","품목":"보라무","품종":"보라남","노동편의성":2,"품종희소성":4,"파종(시작) 시기":"9월","수확(종료) 시기":"4월","수익성(노지)":70100,"수익성(시설)":317200},
    {"대분류":"무","품목":"분홍무","품종":"루비킹","노동편의성":3,"품종희소성":3,"파종(시작) 시기":"8월","수확(종료) 시기":"3월","수익성(노지)":69800,"수익성(시설)":392000},
    {"대분류":"무","품목":"속빨강무","품종":"과일무","노동편의성":4,"품종희소성":3,"파종(시작) 시기":"8월","수확(종료) 시기":"3월","수익성(노지)":69800,"수익성(시설)":465000},
    {"대분류":"무","품목":"빨강무","품종":"아르테시아","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"8월","수확(종료) 시기":"3월","수익성(노지)":69800,"수익성(시설)":397600},
    {"대분류":"무","품목":"녹색무","품종":"비타민무","노동편의성":3,"품종희소성":3,"파종(시작) 시기":"8월","수확(종료) 시기":"3월","수익성(노지)":69800,"수익성(시설)":239600},
    {"대분류":"무","품목":"순무","품종":"흰순무","노동편의성":4,"품종희소성":4,"파종(시작) 시기":"9월","수확(종료) 시기":"4월","수익성(노지)":69800,"수익성(시설)":239600},
    {"대분류":"무","품목":"순무","품종":"빨강순무","노동편의성":4,"품종희소성":4,"파종(시작) 시기":"9월","수확(종료) 시기":"4월","수익성(노지)":449600,"수익성(시설)":239600},
    {"대분류":"무","품목":"순무","품종":"복숭아순무","노동편의성":4,"품종희소성":2,"파종(시작) 시기":"9월","수확(종료) 시기":"4월","수익성(노지)":449600,"수익성(시설)":239600},
    {"대분류":"배추","품목":"결구배추","품종":"속노랑","노동편의성":4,"품종희소성":2,"파종(시작) 시기":"9월","수확(종료) 시기":"3월","수익성(노지)":69800,"수익성(시설)":355500},
    {"대분류":"배추","품목":"빨강배추","품종":"권농빨강3호","노동편의성":3,"품종희소성":3,"파종(시작) 시기":"9월","수확(종료) 시기":"3월","수익성(노지)":69800,"수익성(시설)":392000},
    {"대분류":"배추","품목":"결구배추","품종":"개성","노동편의성":3,"품종희소성":3,"파종(시작) 시기":"9월","수확(종료) 시기":"3월","수익성(노지)":136800,"수익성(시설)":513500},
    {"대분류":"배추","품목":"양배추","품종":"카라플렉스","노동편의성":4,"품종희소성":4,"파종(시작) 시기":"9월","수확(종료) 시기":"3월","수익성(노지)":83500,"수익성(시설)":322900},
    {"대분류":"배추","품목":"양배추","품종":"알코사","노동편의성":4,"품종희소성":4,"파종(시작) 시기":"9월","수확(종료) 시기":"3월","수익성(노지)":83500,"수익성(시설)":322900},
    {"대분류":"배추","품목":"양배추","품종":"티아라","노동편의성":4,"품종희소성":3,"파종(시작) 시기":"9월","수확(종료) 시기":"3월","수익성(노지)":62000,"수익성(시설)":239800},
    {"대분류":"배추","품목":"양배추","품종":"꼬꼬마","노동편의성":4,"품종희소성":2,"파종(시작) 시기":"9월","수확(종료) 시기":"3월","수익성(노지)":58300,"수익성(시설)":225100},
    {"대분류":"배추","품목":"양배추","품종":"레드블레임","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"9월","수확(종료) 시기":"3월","수익성(노지)":83500,"수익성(시설)":322900},
    {"대분류":"배추","품목":"콜라비","품종":"그린","노동편의성":4,"품종희소성":3,"파종(시작) 시기":"9월","수확(종료) 시기":"3월","수익성(노지)":71400,"수익성(시설)":275800},
    {"대분류":"배추","품목":"콜라비","품종":"화이트","노동편의성":4,"품종희소성":4,"파종(시작) 시기":"9월","수확(종료) 시기":"3월","수익성(노지)":67000,"수익성(시설)":259200},
    {"대분류":"당근","품목":"오렌지","품종":"모큼","노동편의성":3,"품종희소성":3,"파종(시작) 시기":"2월","수확(종료) 시기":"5월","수익성(노지)":71600,"수익성(시설)":276800},
    {"대분류":"당근","품목":"퍼플","품종":"딥퍼플","노동편의성":3,"품종희소성":3,"파종(시작) 시기":"2월","수확(종료) 시기":"5월","수익성(노지)":65600,"수익성(시설)":253800},
    {"대분류":"당근","품목":"골드","품종":"골드너겟","노동편의성":3,"품종희소성":3,"파종(시작) 시기":"2월","수확(종료) 시기":"5월","수익성(노지)":68000,"수익성(시설)":263000},
    {"대분류":"당근","품목":"레드","품종":"긴토킨니진","노동편의성":2,"품종희소성":5,"파종(시작) 시기":"2월","수확(종료) 시기":"5월","수익성(노지)":65600,"수익성(시설)":253800},
    {"대분류":"당근","품목":"화이트","품종":"화이트샤인","노동편의성":3,"품종희소성":4,"파종(시작) 시기":"2월","수확(종료) 시기":"5월","수익성(노지)":63200,"수익성(시설)":244500},
    {"대분류":"-","품목":"비트","품종":"레드","노동편의성":4,"품종희소성":3,"파종(시작) 시기":"3월","수확(종료) 시기":"5월","수익성(노지)":69800,"수익성(시설)":239600},
    {"대분류":"-","품목":"비트","품종":"골드","노동편의성":4,"품종희소성":4,"파종(시작) 시기":"3월","수확(종료) 시기":"5월","수익성(노지)":69800,"수익성(시설)":239600},
    {"대분류":"-","품목":"비트","품종":"타겟","노동편의성":4,"품종희소성":4,"파종(시작) 시기":"3월","수확(종료) 시기":"5월","수익성(노지)":69800,"수익성(시설)":239600}
  ];
  
  // Supabase Edge Function용 내보내기
  export { CropRecommendationEngine };
  
  // ===========================================
  // 로컬 테스트용 함수 (Edge Function에서는 사용 안 함)
  // ===========================================
  
  // 테스트 실행 함수
  async function runTests() {
    console.log("🧪 === 작물 추천 알고리즘 테스트 시작 ===");
    
    const engine = new CropRecommendationEngine();
    
    const testCases = [
      { startMonth: 3, endMonth: 6, inputPlace: "노지", inputIrang: 20, name: "3~6월 노지재배" },
      { startMonth: 10, endMonth: 2, inputPlace: "노지", inputIrang: 15, name: "10~2월 노지재배 (연도경계)" },
      { startMonth: 5, endMonth: 9, inputPlace: "시설", inputIrang: 12, name: "5~9월 시설재배" },
      { startMonth: 1, endMonth: 12, inputPlace: "시설", inputIrang: 30, name: "연중 시설재배" },
      { startMonth: 7, endMonth: 7, inputPlace: "노지", inputIrang: 6, name: "7월만 노지재배" }
    ];
  
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n📋 === Test ${i + 1}: ${testCase.name} ===`);
      console.log(`조건: ${testCase.startMonth}월~${testCase.endMonth}월, ${testCase.inputPlace}, ${testCase.inputIrang}이랑`);
      
      try {
        const result = await engine.recommendCrops(
          testCase.startMonth,
          testCase.endMonth,
          testCase.inputPlace,
          testCase.inputIrang,
          sampleCropsData
        );
  
        if (result.error) {
          console.log(`❌ ${result.error}`);
        } else {
          console.log(`🎁 총 ${result.cards.length}개 조합 추천됨`);
          result.cards.forEach((card, idx) => {
            const crops = card.crops.join(', ');
            const revenue = card.expected_revenue;
            const indicators = `수익성${card.indicators.수익성} 편의성${card.indicators.노동편의성} 희소성${card.indicators.품종희소성}`;
            console.log(`${idx + 1}) ${crops}`);
            console.log(`   💰 예상수익: ${revenue}원 | 📊 지표: ${indicators}`);
          });
          console.log(`💎 1순위 조합 총 수익: ${result.total_profit.toLocaleString()}원`);
        }
  
      } catch (error) {
        console.log(`❌ 테스트 실행 중 오류: ${error.message}`);
      }
    }
    
    console.log("\n🎉 === 테스트 완료 ===");
  }
  
  // 간단 테스트 실행 함수
  async function quickTest() {
    console.log("⚡ === 빠른 테스트 ===");
    const engine = new CropRecommendationEngine();
    
    const result = await engine.recommendCrops(3, 6, "노지", 20, sampleCropsData);
    
    if (result.error) {
      console.log("❌", result.error);
    } else {
      console.log("🎁 추천 결과:");
      result.cards.forEach((card, idx) => {
        console.log(`${idx + 1}) ${card.crops.join(', ')} - ${card.expected_revenue}원`);
      });
    }
  }
  
  // 로컬에서 테스트하려면 아래 주석 해제
  // runTests();
  // quickTest();