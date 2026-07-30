'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  BrainCircuit, Loader2, RefreshCw, TrendingUp, TrendingDown,
  Minus, AlertTriangle, AlertCircle, Info, CheckCircle2,
  BarChart3, Droplets, Wrench, Flame, Shield, ChevronRight,
  Zap, Activity, Target,
} from 'lucide-react';

interface Insight {
  category: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
  metric: string;
  affectedBoiler: string;
}

interface Trend {
  area: string;
  observation: string;
  direction: string;
  action: string;
}

interface InsightsData {
  summary: string;
  insights: Insight[];
  trends: Trend[];
  priorityActions: string[];
}

const FOCUS_AREAS = [
  { id: 'all', label: 'Full Analysis', icon: BarChart3, color: 'bg-analytics/[0.07] text-analytics border-analytics/20' },
  { id: 'operations', label: 'Operations', icon: Activity, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'efficiency', label: 'Efficiency', icon: Flame, color: 'bg-forest/[0.07] text-forest border-forest/20' },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'water-chemistry', label: 'Water Chemistry', icon: Droplets, color: 'bg-sage/[0.07] text-cyan-700 border-sage/20' },
];

const SEVERITY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  Critical: { icon: AlertCircle, color: 'text-critical', bg: 'bg-critical/[0.07]', border: 'border-red-200' },
  High: { icon: AlertTriangle, color: 'text-forest', bg: 'bg-forest/[0.04]', border: 'border-forest/20' },
  Medium: { icon: Info, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  Low: { icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  Info: { icon: Info, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
};

const DIRECTION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  Improving: { icon: TrendingUp, color: 'text-green-600', label: 'Improving' },
  Declining: { icon: TrendingDown, color: 'text-critical', label: 'Declining' },
  Stable: { icon: Minus, color: 'text-blue-600', label: 'Stable' },
  Concerning: { icon: AlertTriangle, color: 'text-forest', label: 'Concerning' },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Operations: Activity,
  Maintenance: Wrench,
  'Water Chemistry': Droplets,
  Efficiency: Flame,
  Safety: Shield,
  Compliance: Target,
};

export function AIInsights() {
  const { currentFactoryId, factories } = useAppStore();
  const [focusArea, setFocusArea] = useState('all');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InsightsData | null>(null);
  const [dataPoints, setDataPoints] = useState<Record<string, number> | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const { toast } = useToast();

  const currentFactory = factories.find(f => f.id === currentFactoryId);

  const generateInsights = useCallback(async (area: string) => {
    if (!currentFactoryId) {
      toast({ title: 'No Factory', description: 'Select a factory first.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);
      const res = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factoryId: currentFactoryId, focusArea: area }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const json = await res.json();
      if (json.error) throw new Error(json.details || json.error);

      setData(json.insights);
      setDataPoints(json.dataPoints);
      setGeneratedAt(json.generatedAt);
      setFocusArea(area);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not generate insights';
      if (msg.includes('busy') || msg.includes('429') || msg.includes('quota')) {
        toast({ title: 'Rate limit reached', description: 'Wait about 1 minute and try again.', variant: 'destructive' });
      } else if (msg.includes('AbortError') || msg.includes('aborted')) {
        toast({ title: 'Request timed out', description: 'The AI took too long. Please try again.', variant: 'destructive' });
      } else {
        toast({ title: 'Insights Error', description: msg.length > 200 ? msg.slice(0, 200) + '...' : msg, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  }, [currentFactoryId, toast]);

  const severityOrder = ['Critical', 'High', 'Medium', 'Low', 'Info'];
  const sortedInsights = data?.insights
    ? [...data.insights].sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity))
    : [];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b bg-gradient-to-r from-blue-600 to-sage text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold">AI Insights — Live Data Analysis</h2>
            <p className="text-[11px] text-blue-200">Analyzes your factory data and generates actionable insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dataPoints && (
            <Badge className="bg-white/20 text-white hover:bg-white/30 text-[10px] border-0">
              {dataPoints.operationLogs || 0} logs · {dataPoints.calculations || 0} calcs · {dataPoints.waterTests || 0} water tests
            </Badge>
          )}
          {generatedAt && (
            <span className="text-[10px] text-blue-200 hidden sm:inline">
              Updated: {new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
        {/* Factory badge + Generate button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {currentFactory && (
            <Badge variant="outline" className="text-xs shrink-0">
              <Flame className="h-3 w-3 mr-1 text-forest" />
              {currentFactory.name}
            </Badge>
          )}
        </div>

        {/* Focus Area Selector + Generate */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select Analysis Focus</p>
          <div className="flex flex-wrap gap-2">
            {FOCUS_AREAS.map((area) => {
              const Icon = area.icon;
              const isActive = focusArea === area.id && data !== null;
              return (
                <button
                  key={area.id}
                  onClick={() => generateInsights(area.id)}
                  disabled={loading}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                    isActive
                      ? area.color + ' ring-2 ring-offset-1 ring-current'
                      : 'bg-background border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/50',
                    loading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {loading && focusArea === area.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  {area.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <Card className="border-2 border-blue-200 bg-blue-50/50">
            <CardContent className="py-12 flex flex-col items-center gap-3">
              <div className="relative">
                <BrainCircuit className="h-12 w-12 text-blue-400" />
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 absolute -bottom-1 -right-1" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-blue-900">Analyzing Your Factory Data</p>
                <p className="text-sm text-blue-600 mt-1">Fetching operation logs, water tests, maintenance records, and calculations...</p>
                <p className="text-xs text-blue-400 mt-2">This may take 30-60 seconds. Please wait.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !data && (
          <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-sage text-white flex items-center justify-center shadow-lg">
                <BrainCircuit className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Data-Driven Intelligence</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Select a focus area above to analyze your factory&apos;s operation logs, efficiency calculations, water chemistry, maintenance records, and inspection data. AI will identify trends, flag issues, and recommend actions.
                </p>
              </div>
              <Button onClick={() => generateInsights('all')} className="bg-gradient-to-r from-blue-600 to-sage hover:from-blue-700 hover:to-cyan-700">
                <Zap className="h-4 w-4 mr-2" /> Run Full Analysis
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {!loading && data && (
          <div className="space-y-4">
            {/* Summary Card */}
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <BrainCircuit className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">Overall Assessment</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insights Grid */}
            {sortedInsights.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Insights ({sortedInsights.length})
                </p>
                <div className="grid gap-3">
                  {sortedInsights.map((insight, idx) => {
                    const sevConfig = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.Info;
                    const SevIcon = sevConfig.icon;
                    const CatIcon = CATEGORY_ICONS[insight.category] || BarChart3;
                    return (
                      <Card key={idx} className={cn('border', sevConfig.border)}>
                        <CardContent className="py-4">
                          <div className="flex items-start gap-3">
                            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', sevConfig.bg)}>
                              <SevIcon className={cn('h-4 w-4', sevConfig.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h4 className="text-sm font-semibold">{insight.title}</h4>
                                <Badge variant="outline" className={cn('text-[10px] h-5', sevConfig.color, sevConfig.border)}>
                                  {insight.severity}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] h-5">
                                  <CatIcon className="h-3 w-3 mr-1" />{insight.category}
                                </Badge>
                                {insight.affectedBoiler && insight.affectedBoiler !== 'All' && (
                                  <Badge variant="secondary" className="text-[10px] h-5">{insight.affectedBoiler}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">{insight.description}</p>
                              {insight.recommendation && (
                                <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/50 border">
                                  <ChevronRight className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                  <p className="text-sm"><span className="font-medium text-blue-700">Recommendation: </span>{insight.recommendation}</p>
                                </div>
                              )}
                              {insight.metric && (
                                <p className="text-xs text-muted-foreground mt-2">Metric: {insight.metric}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Trends */}
            {data.trends && data.trends.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trends</p>
                <div className="grid gap-2">
                  {data.trends.map((trend, idx) => {
                    const dirConfig = DIRECTION_CONFIG[trend.direction] || DIRECTION_CONFIG.Stable;
                    const DirIcon = dirConfig.icon;
                    return (
                      <Card key={idx}>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <DirIcon className={cn('h-4 w-4 shrink-0', dirConfig.color)} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{trend.area}</span>
                                <Badge variant="outline" className={cn('text-[10px] h-5', dirConfig.color)}>
                                  {dirConfig.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{trend.observation}</p>
                              {trend.action && (
                                <p className="text-xs text-blue-600 mt-1">Action: {trend.action}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Priority Actions */}
            {data.priorityActions && data.priorityActions.length > 0 && (
              <Card className="border-l-4 border-l-red-500">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-critical" />
                    Priority Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 px-4">
                  <ol className="space-y-2">
                    {data.priorityActions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-red-100 text-critical text-xs font-bold shrink-0 mt-0.5">{idx + 1}</span>
                        <span className="text-muted-foreground">{action}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Refresh button */}
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => generateInsights(focusArea)} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                Refresh Insights
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
