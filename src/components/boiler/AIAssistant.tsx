'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Send, Loader2, Bot, User, AlertTriangle, Wrench, Droplets,
  Gauge, Flame, Shield, BookOpen, MessageSquare, ChevronDown,
  Trash2, Zap, Thermometer, HelpCircle, GaugeCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface DataStatus {
  boilers: number;
  operationLogs: number;
  calculations: number;
  pendingMaintenance: number;
  overdueInspections: number;
  waterTests: number;
}

const QUICK_QUESTIONS = [
  { icon: AlertTriangle, label: 'Troubleshoot low pressure', prompt: 'My boiler steam pressure keeps dropping. What should I check and what could be causing this?', color: 'text-critical bg-critical/[0.07] border-red-200' },
  { icon: Gauge, label: 'Improve efficiency', prompt: 'What can I do to improve our boiler efficiency? Look at our data and give specific recommendations.', color: 'text-forest bg-forest/[0.07] border-forest/20' },
  { icon: Droplets, label: 'Water quality issue', prompt: 'Our water chemistry test results show some parameters out of limits. What should we do?', color: 'text-sage bg-sage/[0.04] border-sage/20' },
  { icon: Wrench, label: 'Maintenance advice', prompt: 'What maintenance tasks are pending and which ones should be prioritized?', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { icon: Flame, label: 'High flue gas temp', prompt: 'Our flue gas temperature is higher than normal. What does this mean and how do we fix it?', color: 'text-forest bg-forest/[0.04] border-forest/20' },
  { icon: Shield, label: 'Safety checklist', prompt: 'Give me a pre-shift safety checklist for boiler operation.', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { icon: BookOpen, label: 'Explain blowdown', prompt: 'Explain boiler blowdown — why it matters, how to calculate it, and best practices.', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { icon: Thermometer, label: 'Steam properties', prompt: 'Explain the difference between saturated steam, superheated steam, and wet steam. When would you use each?', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { icon: Zap, label: 'Analyze my data', prompt: 'Analyze our recent operation data and tell me if everything looks normal or if there are any concerns.', color: 'text-analytics bg-analytics/[0.04] border-analytics/20' },
  { icon: HelpCircle, label: 'Combustion basics', prompt: 'Explain excess air in boiler combustion. What happens if there is too much or too little?', color: 'text-teal-600 bg-teal-50 border-teal-200' },
  { icon: GaugeCircle, label: 'Boiler efficiency calc', prompt: 'Walk me through how to calculate boiler efficiency using both the direct and indirect methods with an example.', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { icon: AlertTriangle, label: 'Emergency procedures', prompt: 'What are the emergency shutdown procedures for a boiler? When should I immediately shut down?', color: 'text-critical bg-red-100 border-red-300' },
];

export function AIAssistant() {
  const { currentFactoryId, factories } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const chatId = useRef(0);

  const currentFactory = factories.find(f => f.id === currentFactoryId);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    if (!currentFactoryId) {
      toast({ title: 'No Factory', description: 'Select a factory first.', variant: 'destructive' });
      return;
    }

    const userMsg: Message = { id: String(++chatId.current), role: 'user', content: text.trim(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowSuggestions(false);
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);
      const res = await fetch('/api/ai-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), factoryId: currentFactoryId, history }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const json = await res.json();
      if (json.error) throw new Error(json.details || json.error);

      const aiMsg: Message = { id: String(++chatId.current), role: 'assistant', content: json.response, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setMessages(prev => [...prev, aiMsg]);
      setDataStatus(json.dataAvailable);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not get response';
      if (msg.includes('busy') || msg.includes('429') || msg.includes('quota')) {
        toast({ title: 'Rate limit reached', description: 'The free Gemini API has a per-minute limit. Wait about 1 minute and try again.', variant: 'destructive' });
      } else if (msg.includes('AbortError') || msg.includes('aborted')) {
        toast({ title: 'Request timed out', description: 'The AI took too long to respond. Please try again.', variant: 'destructive' });
      } else {
        toast({ title: 'AI Error', description: msg.length > 200 ? msg.slice(0, 200) + '...' : msg, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const clearChat = () => { setMessages([]); setDataStatus(null); setShowSuggestions(true); };

  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      let rendered: React.ReactNode = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      rendered = typeof rendered === 'string' ? rendered.replace(/`(.+?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">$1</code>') : rendered;

      if (line.startsWith('### '))
        return <h3 key={i} className="text-sm font-bold mt-3 mb-1 text-foreground">{line.slice(4)}</h3>;
      if (line.startsWith('## '))
        return <h2 key={i} className="text-base font-bold mt-4 mb-1 text-foreground">{line.slice(3)}</h2>;
      if (line.startsWith('# '))
        return <h1 key={i} className="text-lg font-bold mt-3 mb-1 text-foreground">{line.slice(2)}</h1>;
      if (line.match(/^\d+\.\s/))
        return <div key={i} className="flex gap-2 ml-1"><span className="text-analytics font-semibold shrink-0">{line.match(/^(\d+\.)/)?.[1]}</span><span dangerouslySetInnerHTML={{ __html: typeof rendered === 'string' ? rendered.replace(/^\d+\.\s/, '') : String(rendered) }} /></div>;
      if (line.startsWith('- '))
        return <div key={i} className="flex gap-2 ml-1"><span className="text-analytics">•</span><span dangerouslySetInnerHTML={{ __html: typeof rendered === 'string' ? rendered.slice(2) : String(rendered) }} /></div>;
      if (line.startsWith('> '))
        return <div key={i} className="border-l-3 border-analytics pl-3 my-1 text-muted-foreground italic" dangerouslySetInnerHTML={{ __html: typeof rendered === 'string' ? rendered.slice(2) : String(rendered) }} />;
      if (line.trim() === '')
        return <div key={i} className="h-2" />;
      return <p key={i} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: typeof rendered === 'string' ? rendered : String(rendered) }} />;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b bg-gradient-to-r from-analytics to-purple-700 text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold">BoilerBot — AI Technical Assistant</h2>
            <p className="text-[11px] text-analytics/20">Ask anything about boilers, steam systems, and operations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dataStatus && (
            <Badge className="bg-white/20 text-white hover:bg-white/30 text-[10px] border-0">
              {dataStatus.boilers} boilers · {dataStatus.operationLogs} logs · {dataStatus.waterTests} water tests
            </Badge>
          )}
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-white/70 hover:text-white hover:bg-white/10" onClick={clearChat}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
        {/* Welcome + Quick Questions */}
        {messages.length === 0 && !loading && (
          <div className="max-w-2xl mx-auto space-y-6 py-4">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-analytics to-purple-600 text-white shadow-lg shadow-analytics/20">
                <Bot className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold">How can I help you today?</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                I have deep knowledge of boiler engineering, steam systems, water treatment, combustion, troubleshooting, and safety. I can also see your factory data to give specific advice.
              </p>
              {currentFactory && (
                <Badge variant="outline" className="text-xs">
                  <Flame className="h-3 w-3 mr-1 text-forest" />
                  {currentFactory.name}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 text-center">Quick Questions</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUICK_QUESTIONS.map((q) => {
                  const Icon = q.icon;
                  return (
                    <button
                      key={q.label}
                      onClick={() => sendMessage(q.prompt)}
                      className={cn('flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all hover:shadow-sm text-sm font-medium', q.color)}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{q.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-3 max-w-3xl', msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto')}>
            <div className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              msg.role === 'assistant' ? 'bg-gradient-to-br from-analytics to-purple-600 text-white' : 'bg-forest/[0.07] text-forest'
            )}>
              {msg.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </div>
            <div className={cn('space-y-1 min-w-0', msg.role === 'user' ? 'items-end' : 'items-start')}>
              <div className={cn(
                'rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[85vw] md:max-w-lg',
                msg.role === 'assistant'
                  ? 'bg-muted border'
                  : 'bg-gradient-to-r from-analytics to-purple-600 text-white'
              )}>
                {renderContent(msg.content)}
              </div>
              <p className="text-[10px] text-muted-foreground px-1">{msg.timestamp}</p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3 max-w-3xl">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-analytics to-purple-600 text-white flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted border rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-analytics" />
                <span>Analyzing your data and thinking... (may take up to 2 min if retrying)</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick question bar (scrollable when chat has messages) */}
      {messages.length > 0 && showSuggestions && (
        <div className="px-4 md:px-6 py-2 border-t bg-muted/30 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] font-medium text-muted-foreground shrink-0">Ask:</span>
            {QUICK_QUESTIONS.slice(0, 6).map((q) => {
              const Icon = q.icon;
              return (
                <button key={q.label} onClick={() => sendMessage(q.prompt)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-background text-xs font-medium whitespace-nowrap hover:bg-muted transition-colors">
                  <Icon className="h-3 w-3 text-analytics" />{q.label}
                </button>
              );
            })}
            <button onClick={() => setShowSuggestions(false)} className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0">
              <ChevronDown className="h-3 w-3" />Hide
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 md:px-6 py-3 border-t bg-background shrink-0">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          {messages.length > 0 && !showSuggestions && (
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0" onClick={() => setShowSuggestions(true)} title="Show suggestions">
              <MessageSquare className="h-4 w-4" />
            </Button>
          )}
          <Textarea
            ref={textareaRef}
            placeholder="Ask about your boilers, troubleshoot issues, or get advice..."
            className="min-h-[40px] max-h-[120px] resize-none text-sm rounded-xl"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="h-10 w-10 p-0 rounded-xl bg-gradient-to-r from-analytics to-purple-600 hover:from-analytics hover:to-purple-700 shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          BoilerBot uses your factory data + boiler engineering knowledge. Always follow your site safety procedures.
        </p>
      </div>
    </div>
  );
}
