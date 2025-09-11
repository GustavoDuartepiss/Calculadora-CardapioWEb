import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator, Percent } from "lucide-react";
import { usePlanContext } from "@/contexts/PlanContext";

interface Plan {
  total: number;
  mensal: number;
}

interface Module {
  id: string;
  name: string;
  value?: number;
  valueByPeriod?: {
    mensal: number;
    trimestral: number;
    semestral: number;
    anual: number;
  };
}

interface Combination {
  plan: { tipoPlano: string; periodo: string } | null;
  modules: Module[];
  discount: number;
  overallMonthly?: number;
  overallTotal?: number;
}

const planos: Record<string, Record<string, Plan>> = {
  delivery: {
    mensal: { total: 179.99, mensal: 179.99 },
    trimestral: { total: 495.00, mensal: 165.00 },
    semestral: { total: 930.00, mensal: 155.00 },
    anual: { total: 1740.00, mensal: 145.00 },
  },
  mesas: {
    mensal: { total: 159.99, mensal: 159.99 },
    trimestral: { total: 450.00, mensal: 150.00 },
    semestral: { total: 870.00, mensal: 145.00 },
    anual: { total: 1620.00, mensal: 135.00 },
  },
  premium: {
    mensal: { total: 219.99, mensal: 219.99 },
    trimestral: { total: 615.00, mensal: 205.00 },
    semestral: { total: 1170.00, mensal: 195.00 },
    anual: { total: 2220.00, mensal: 185.00 },
  },
};

const modules: Module[] = [
  { id: "moduloIfood", name: "Integração com Ifood", value: 19.90 },
  { id: "moduloEstoque", name: "Controle de Estoque Completo", value: 19.90 },
  {
    id: "moduloRoteirizacao",
    name: "Roteirização de entregas",
    valueByPeriod: {
      mensal: 49.90,
      trimestral: 49.90,
      semestral: 49.90,
      anual: 49.90,
    },
  },
  { id: "moduloFiscal", name: "Emissão de Cupom Fiscal", value: 59.90 },
  {
    id: "moduloFinanceiro",
    name: "Módulo Financeiro",
    valueByPeriod: {
      mensal: 49.90,
      trimestral: 49.90,
      semestral: 49.90,
      anual: 49.90,
    },
  },
];

export const PlanCalculator = () => {
  const {
    combination1,
    combination2,
    setCombination1,
    setCombination2,
    selectedPlanType,
    setSelectedPlanType,
    selectedPeriod,
    setSelectedPeriod,
    selectedModules,
    setSelectedModules,
    discount,
    setDiscount,
    activeCombination,
    setActiveCombination
  } = usePlanContext();

  const [showDiscount, setShowDiscount] = useState(false);

  const getMultiplier = (period: string) => {
    switch (period) {
      case "trimestral": return 3;
      case "semestral": return 6;
      case "anual": return 12;
      default: return 1;
    }
  };

  const ceilIfNeeded = (value: number) => {
    const multiplied = value * 100;
    if (Math.abs(multiplied - Math.round(multiplied)) < 1e-9) {
      return value;
    }
    return Math.ceil(multiplied) / 100;
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  const updateCombination = () => {
    if (!selectedPeriod) return;

    const planData = planos[selectedPlanType][selectedPeriod];
    const multiplier = getMultiplier(selectedPeriod);
    
    let modulesTotalMonthly = 0;
    let modulesTotalTotal = 0;
    const combinationModules = modules.filter(mod => selectedModules.includes(mod.id));
    
    combinationModules.forEach(mod => {
      const moduleMonthly = mod.valueByPeriod ? mod.valueByPeriod[selectedPeriod as keyof typeof mod.valueByPeriod] : mod.value!;
      modulesTotalMonthly += moduleMonthly;
      modulesTotalTotal += moduleMonthly * multiplier;
    });

    const discountedPlanTotal = discount > 0 ? ceilIfNeeded(planData.total * (1 - discount/100)) : planData.total;
    const discountedPlanMonthly = discount > 0 ? ceilIfNeeded(planData.mensal * (1 - discount/100)) : planData.mensal;
    
    const overallTotal = discountedPlanTotal + modulesTotalTotal;
    const overallMonthly = discountedPlanMonthly + modulesTotalMonthly;

    const newCombination = {
      plan: { tipoPlano: selectedPlanType, periodo: selectedPeriod },
      modules: combinationModules,
      discount,
      overallTotal,
      overallMonthly,
    };

    if (activeCombination === "combination1") {
      setCombination1(newCombination);
    } else {
      setCombination2(newCombination);
    }
  };

  const loadCombinationData = (combination: Combination) => {
    if (combination.plan) {
      setSelectedPlanType(combination.plan.tipoPlano);
      setSelectedPeriod(combination.plan.periodo);
    }
    setSelectedModules(combination.modules.map(mod => mod.id));
    setDiscount(combination.discount);
  };

  const getBenefitScore = (comb: Combination) => {
    if (!comb.plan) return 0;
    const rankMap = { mensal: 1, trimestral: 2, semestral: 3, anual: 4 };
    const periodRank = rankMap[comb.plan.periodo as keyof typeof rankMap] || 0;
    const moduleCount = comb.modules.length;
    let modulesSum = 0;
    
    comb.modules.forEach(mod => {
      const moduleMonthly = mod.valueByPeriod ? mod.valueByPeriod[comb.plan!.periodo as keyof typeof mod.valueByPeriod] : mod.value!;
      modulesSum += moduleMonthly;
    });
    
    const planTotal = planos[comb.plan.tipoPlano][comb.plan.periodo].total;
    const multiplier = getMultiplier(comb.plan.periodo);
    const modulesTotal = modulesSum * multiplier;
    const overallTotal = planTotal + modulesTotal;
    const overallTotalComponent = (overallTotal / 100) * 50;
    
    return overallTotalComponent + periodRank * 8 + moduleCount * 25 + modulesSum * 0.1 + (comb.discount * 5);
  };

  const getSavingsComparison = () => {
    const comb1 = combination1;
    const comb2 = combination2;
    
    if (!comb1.plan || !comb2.plan || !comb1.overallMonthly || !comb2.overallMonthly) {
      return "";
    }

    const score1 = getBenefitScore(comb1);
    const score2 = getBenefitScore(comb2);
    
    if (score1 === score2) {
      const diffMonthly = Math.abs(comb1.overallMonthly - comb2.overallMonthly);
      const diffAnnual = diffMonthly * 12;
      return `Diferença de investimento: ${formatCurrency(diffMonthly)} por mês (${formatCurrency(diffAnnual)} ao ano).`;
    }
    
    let beneficial, other, beneficialLabel;
    if (score1 > score2) {
      beneficial = comb1;
      other = comb2;
      beneficialLabel = "Combinação 1";
    } else {
      beneficial = comb2;
      other = comb1;
      beneficialLabel = "Combinação 2";
    }
    
    const diffMonthly = beneficial.overallMonthly! - other.overallMonthly!;
    if (diffMonthly > 0) {
      return `${beneficialLabel} implica um investimento adicional de ${formatCurrency(diffMonthly)} por mês.`;
    } else {
      const diffAnnual = Math.abs(diffMonthly) * 12;
      return `${beneficialLabel} gera uma economia de ${formatCurrency(Math.abs(diffMonthly))} por mês (${formatCurrency(diffAnnual)} ao ano).`;
    }
  };

  useEffect(() => {
    updateCombination();
  }, [selectedPlanType, selectedPeriod, selectedModules, discount, activeCombination]);

  const renderCombinationCard = (key: "combination1" | "combination2", title: string) => {
    const combination = key === "combination1" ? combination1 : combination2;
    const isActive = activeCombination === key;
    
    return (
      <Card 
        className={`group relative p-6 cursor-pointer transition-all duration-500 overflow-hidden hover:shadow-elegant ${
          isActive 
            ? 'ring-2 ring-primary bg-gradient-to-r from-accent to-accent/30 shadow-lg transform scale-105' 
            : 'hover:bg-gradient-to-r hover:from-muted/30 hover:to-accent/20 hover:shadow-md hover:transform hover:scale-102'
        }`}
        onClick={() => {
          setActiveCombination(key);
          loadCombinationData(combination);
        }}
      >
        <div className="absolute -top-10 -right-10 w-20 h-20 bg-gradient-primary opacity-10 rounded-full blur-xl group-hover:opacity-20 transition-opacity duration-500"></div>
        
        <div className="relative z-10">
          <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
            {title}
            {isActive && <div className="w-2 h-2 bg-gradient-primary rounded-full animate-pulse"></div>}
          </h3>
          
          {combination.plan ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-medium">
                  {combination.plan.tipoPlano.toUpperCase()}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  {combination.plan.periodo}
                </Badge>
              </div>
              
              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
                <strong>Módulos:</strong> {combination.modules.length > 0 
                  ? combination.modules.map(mod => mod.name).join(", ")
                  : "Nenhum"}
              </div>
              
              <div className="pt-2 space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold gradient-text">
                    {formatCurrency(combination.overallTotal || 0)}
                  </span>
                  <span className="text-sm text-muted-foreground">total</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-primary">
                    {formatCurrency(combination.overallMonthly || 0)}
                  </span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
                {combination.discount > 0 && (
                  <Badge variant="destructive" className="mt-2 bg-gradient-to-r from-red-500 to-pink-500">
                    🎉 {combination.discount}% OFF aplicado
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4 opacity-20">📋</div>
              <p className="text-muted-foreground">Selecione um plano e módulos</p>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div id="plan-calculator" className="space-y-6">
      <div className="text-center mb-8 relative">
        <h1 className="text-3xl font-bold gradient-text mb-2 animate-fade-in">
          Calculadora de Planos
        </h1>
        <p className="text-base text-muted-foreground animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Configure e compare diferentes combinações de planos
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Painel Esquerdo - Configuração */}
        <Card className="glass-card p-6 relative overflow-hidden group hover:shadow-elegant transition-all duration-500">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-primary opacity-10 rounded-full blur-xl group-hover:opacity-20 transition-opacity duration-500"></div>
          <h2 className="text-xl font-bold mb-6 text-primary flex items-center gap-3">
            <div className="w-6 h-6 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Calculator className="w-3 h-3 text-primary-foreground" />
            </div>
            Configuração do Plano
          </h2>
          
          <div className="space-y-6">
            {/* Seleção de Plano Base */}
            <div className="space-y-3">
              <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-primary rounded-full"></div>
                Escolha um plano base:
              </Label>
              <Select value={selectedPlanType} onValueChange={setSelectedPlanType}>
                <SelectTrigger className="h-10 text-sm border-2 hover:border-primary/50 transition-colors bg-gradient-to-r from-background to-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-2">
                  <SelectItem value="delivery" className="text-sm py-2">🚚 Plano Delivery</SelectItem>
                  <SelectItem value="mesas" className="text-sm py-2">🪑 Plano Mesas</SelectItem>
                  <SelectItem value="premium" className="text-sm py-2">⭐ Plano Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Seleção de Período */}
            <div className="space-y-3">
              <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-primary rounded-full"></div>
                Período:
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(planos[selectedPlanType]).map(([period, plan]) => (
                  <div
                    key={period}
                    className={`group p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden ${
                      selectedPeriod === period
                        ? 'border-primary bg-gradient-to-r from-accent to-accent/50 shadow-lg transform scale-105'
                        : 'border-border hover:border-primary/50 bg-gradient-to-r from-background to-muted/30 hover:shadow-md hover:transform hover:scale-102'
                    }`}
                    onClick={() => setSelectedPeriod(period)}
                  >
                    {selectedPeriod === period && (
                      <div className="absolute inset-0 bg-gradient-primary opacity-5"></div>
                    )}
                    <div className="relative">
                      <p className="font-semibold capitalize text-sm mb-1">{period}</p>
                      <p className="text-xs font-medium text-primary">
                        {formatCurrency(plan.total)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(plan.mensal)}/mês
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Módulos Adicionais */}
            <div className="space-y-3">
              <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-primary rounded-full"></div>
                Módulos adicionais:
              </Label>
              <div className="space-y-3">
                {modules.map(module => {
                  const modulePrice = selectedPeriod && module.valueByPeriod 
                    ? module.valueByPeriod[selectedPeriod as keyof typeof module.valueByPeriod]
                    : module.value || 0;
                  const totalPrice = modulePrice * getMultiplier(selectedPeriod);
                  
                  return (
                    <div
                      key={module.id}
                      className={`group relative flex items-center space-x-3 p-3 rounded-xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                        selectedModules.includes(module.id)
                          ? 'border-primary bg-gradient-to-r from-accent to-accent/30 shadow-lg'
                          : 'border-border hover:border-primary/50 bg-gradient-to-r from-background to-muted/20 hover:shadow-md'
                      }`}
                      onClick={() => {
                        const checkbox = document.getElementById(module.id) as HTMLInputElement;
                        checkbox?.click();
                      }}
                    >
                      {selectedModules.includes(module.id) && (
                        <div className="absolute inset-0 bg-gradient-primary opacity-5"></div>
                      )}
                      <Checkbox
                        id={module.id}
                        checked={selectedModules.includes(module.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedModules([...selectedModules, module.id]);
                          } else {
                            setSelectedModules(selectedModules.filter(id => id !== module.id));
                          }
                        }}
                        className="relative z-10"
                      />
                      <div className="flex-1 relative z-10">
                        <p className="font-semibold text-sm mb-1">{module.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-medium text-xs">
                            {formatCurrency(totalPrice)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(modulePrice)}/mês
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Painel Direito - Comparações */}
        <div className="space-y-6">
          {/* Combinações */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-primary flex items-center gap-3">
              <div className="w-6 h-6 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Badge className="w-3 h-3 text-primary-foreground" />
              </div>
              Comparações
            </h2>
            {renderCombinationCard("combination1", "💼 Combinação 1")}
            {renderCombinationCard("combination2", "🎯 Combinação 2")}
          </div>

          {/* Comparativo */}
          {getSavingsComparison() && (
            <Card className="glass-card p-4 relative overflow-hidden group">
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-primary opacity-5 rounded-full blur-xl group-hover:opacity-10 transition-opacity duration-500"></div>
              <h3 className="font-bold text-primary mb-3 flex items-center gap-2 text-base">
                📊 Análise Comparativa
              </h3>
              <div className="relative z-10 bg-gradient-to-r from-muted/50 to-accent/30 p-3 rounded-xl border border-primary/20">
                <p className="text-xs font-medium leading-relaxed">{getSavingsComparison()}</p>
              </div>
            </Card>
          )}

          {/* Controle de Desconto */}
          <Card className="glass-card p-3 relative overflow-hidden group">
            <div className="absolute -top-5 -right-5 w-16 h-16 bg-gradient-primary opacity-10 rounded-full blur-lg group-hover:opacity-20 transition-opacity duration-300"></div>
            <div className="flex justify-between items-center space-x-3">
              <h3 className="font-semibold text-primary flex items-center gap-2 text-sm">
                💰 Desconto Especial
              </h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant={showDiscount ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowDiscount(!showDiscount)}
                  className={`btn-glow flex items-center space-x-1 transition-all duration-300 text-xs h-8 ${
                    showDiscount ? 'bg-gradient-primary' : ''
                  }`}
                >
                  <Percent className="w-3 h-3" />
                  <span>Aplicar</span>
                </Button>
              </div>
            </div>
            
            {showDiscount && (
              <div className="mt-3 p-3 bg-gradient-to-r from-accent/30 to-muted/30 rounded-xl border border-primary/20 animate-fade-in">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="discount" className="font-medium text-sm">Desconto:</Label>
                  <div className="flex items-center space-x-1">
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-20 text-center font-semibold text-xs h-8"
                      placeholder="0"
                    />
                    <Percent className="w-4 h-4 text-primary" />
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};