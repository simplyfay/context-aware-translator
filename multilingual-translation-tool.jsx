import React, { useState } from 'react';
import { ArrowLeftRight, BookOpen, Loader2, Languages, Volume2 } from 'lucide-react';

export default function MultilingualTranslationTool() {
  const [mode, setMode] = useState('translate'); // translate, grammar
  
  // Language options
  const languages = [
    { code: 'en', name: 'English', voice: 'en-US' },
    { code: 'fr', name: 'French', voice: 'fr-FR' },
    { code: 'es', name: 'Spanish', voice: 'es-ES' },
    { code: 'de', name: 'German', voice: 'de-DE' },
    { code: 'it', name: 'Italian', voice: 'it-IT' },
    { code: 'pt', name: 'Portuguese', voice: 'pt-PT' },
    { code: 'ja', name: 'Japanese', voice: 'ja-JP' },
    { code: 'zh', name: 'Chinese', voice: 'zh-CN' },
    { code: 'ko', name: 'Korean', voice: 'ko-KR' },
    { code: 'ar', name: 'Arabic', voice: 'ar-SA' },
    { code: 'ru', name: 'Russian', voice: 'ru-RU' },
    { code: 'hi', name: 'Hindi', voice: 'hi-IN' }
  ];
  
  // Separate states for Translate tab
  const [translateInput, setTranslateInput] = useState('');
  const [translateTranslation, setTranslateTranslation] = useState('');
  const [translateAnalysis, setTranslateAnalysis] = useState('');
  const [translateResult, setTranslateResult] = useState(null);
  
  // Separate states for Grammar tab
  const [grammarInput, setGrammarInput] = useState('');
  const [grammarResult, setGrammarResult] = useState(null);
  const [grammarAnalysis, setGrammarAnalysis] = useState('');
  const [grammarLanguage, setGrammarLanguage] = useState('en');
  
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('fr');
  const [tone, setTone] = useState('formal'); // formal, casual
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speakingResult, setSpeakingResult] = useState(false);
  const [history, setHistory] = useState([]);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedSourceVoice, setSelectedSourceVoice] = useState('');
  const [selectedTargetVoice, setSelectedTargetVoice] = useState('');

  const swapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  const processRequest = async () => {
    const currentInput = mode === 'translate' ? translateInput : grammarInput;
    if (!currentInput.trim()) return;
    
    setLoading(true);
    
    try {
      let prompt = '';
      
      if (mode === 'translate') {
        const fromLang = languages.find(l => l.code === sourceLang)?.name || 'English';
        const toLang = languages.find(l => l.code === targetLang)?.name || 'French';
        
        prompt = `You are a translation expert. Translate this ${fromLang} text to ${toLang} in a ${tone} tone.

Your task: Provide ONLY the translations and variations. NO grammar explanations, vocabulary notes, or learning content.

Structure your response EXACTLY like this:

PRIMARY TRANSLATION (${tone.toUpperCase()}):
[the main ${tone} translation]

ALTERNATIVE VARIATIONS:
1. [Formal version] - Context: Professional/written communication
2. [Casual version] - Context: Friends/texting
3. [Modern slang if applicable] - Context: Social media (TikTok/Instagram)
4. [Regional variation if applicable] - Context: Different regions/dialects

Keep it simple - just show the translation options with brief context labels. Save all grammar and vocabulary explanations for the Grammar Help tab.

TEXT TO TRANSLATE:
${currentInput}`;
      } else {
        const lang = languages.find(l => l.code === grammarLanguage)?.name || 'English';
        prompt = `Explain this ${lang} grammar concept to a learner. Use simple terms but respect their intelligence.

Structure your response EXACTLY like this:

SIMPLE EXPLANATION:
[explain the concept in plain English, 2-3 sentences]

WHY IT WORKS:
[explain the logic/reason behind the rule]

EXAMPLES:
[provide 2-3 clear examples with translations to English if not already in English]

COMMON MISTAKES:
[mention 1-2 common errors learners make]

GRAMMAR QUESTION ABOUT ${lang.toUpperCase()}:
${currentInput}`;
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data || !data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('Invalid response from API');
      }
      
      const fullResult = data.content[0].text;
      
      if (mode === 'translate') {
        setTranslateResult(fullResult);
        
        let extractedTranslation = '';
        const translationMatch = fullResult.match(/PRIMARY TRANSLATION[^:]*:\s*\n([^\n]+)/);
        
        if (translationMatch) {
          extractedTranslation = translationMatch[1].trim();
        } else {
          const fallbackMatch = fullResult.match(/TRANSLATION:\s*\n([^\n]+)/);
          if (fallbackMatch) {
            extractedTranslation = fallbackMatch[1].trim();
          } else {
            const lines = fullResult.split('\n').filter(l => l.trim());
            for (const line of lines) {
              if (!line.includes(':') || line.match(/^[^:]+:\s*(.+)$/)) {
                extractedTranslation = line.replace(/^[^:]+:\s*/, '').trim();
                if (extractedTranslation) break;
              }
            }
          }
        }
        
        if (!extractedTranslation) {
          extractedTranslation = fullResult.split('\n')[0] || 'Translation not found';
        }
        
        setTranslateTranslation(extractedTranslation);
        setTranslateAnalysis(fullResult);
        
        setHistory(prev => [{
          id: Date.now(),
          input: currentInput,
          result: fullResult,
          translation: extractedTranslation,
          mode: 'translate',
          sourceLang: sourceLang,
          targetLang: targetLang,
          tone: tone,
          timestamp: new Date().toLocaleTimeString()
        }, ...prev]);
      } else {
        setGrammarResult(fullResult);
        setGrammarAnalysis(fullResult);
        
        setHistory(prev => [{
          id: Date.now(),
          input: currentInput,
          result: fullResult,
          mode: 'grammar',
          language: grammarLanguage,
          timestamp: new Date().toLocaleTimeString()
        }, ...prev]);
      }
    } catch (error) {
      console.error('Error processing request:', error);
      const errorMsg = `Error: ${error.message}\n\nPlease check the browser console (F12) for more details.\n\nNote: This tool requires Claude API access in artifacts.`;
      
      if (mode === 'translate') {
        setTranslateResult(errorMsg);
        setTranslateTranslation('');
        setTranslateAnalysis(errorMsg);
      } else {
        setGrammarResult(errorMsg);
        setGrammarAnalysis(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const speakInput = () => {
    const currentInput = mode === 'translate' ? translateInput : grammarInput;
    if (!currentInput.trim()) return;
    
    window.speechSynthesis.cancel();
    
    if (speaking) {
      setSpeaking(false);
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(currentInput);
    const lang = mode === 'translate' 
      ? languages.find(l => l.code === sourceLang)?.voice 
      : languages.find(l => l.code === grammarLanguage)?.voice;
    
    if (lang) utterance.lang = lang;
    
    if (selectedSourceVoice) {
      const voice = availableVoices.find(v => v.name === selectedSourceVoice);
      if (voice) utterance.voice = voice;
    }
    
    utterance.rate = 0.85;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const speakResult = () => {
    if (!translateTranslation) return;
    
    window.speechSynthesis.cancel();
    
    if (speakingResult) {
      setSpeakingResult(false);
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(translateTranslation);
    const targetVoiceLang = languages.find(l => l.code === targetLang)?.voice;
    
    if (targetVoiceLang) utterance.lang = targetVoiceLang;
    
    if (selectedTargetVoice) {
      const voice = availableVoices.find(v => v.name === selectedTargetVoice);
      if (voice) utterance.voice = voice;
    }
    
    utterance.rate = 0.75;
    utterance.onstart = () => setSpeakingResult(true);
    utterance.onend = () => setSpeakingResult(false);
    utterance.onerror = () => setSpeakingResult(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const loadFromHistory = (item) => {
    if (item.mode === 'translate') {
      setMode('translate');
      setTranslateInput(item.input);
      setSourceLang(item.sourceLang);
      setTargetLang(item.targetLang);
      setTone(item.tone);
      setTranslateResult(item.result);
      setTranslateTranslation(item.translation || '');
      setTranslateAnalysis(item.result);
    } else {
      setMode('grammar');
      setGrammarInput(item.input);
      setGrammarLanguage(item.language);
      setGrammarResult(item.result);
      setGrammarAnalysis(item.result);
    }
  };

  React.useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      if (!selectedSourceVoice && voices.length > 0) {
        const sourceVoiceLang = languages.find(l => l.code === sourceLang)?.voice;
        const bestVoice = voices.find(v => v.lang === sourceVoiceLang) || 
                         voices.find(v => v.lang.startsWith(sourceLang));
        if (bestVoice) setSelectedSourceVoice(bestVoice.name);
      }
      
      if (!selectedTargetVoice && voices.length > 0) {
        const targetVoiceLang = languages.find(l => l.code === targetLang)?.voice;
        const bestVoice = voices.find(v => v.lang === targetVoiceLang) || 
                         voices.find(v => v.lang.startsWith(targetLang));
        if (bestVoice) setSelectedTargetVoice(bestVoice.name);
      }
    };
    
    loadVoices();
    
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [sourceLang, targetLang, selectedSourceVoice, selectedTargetVoice, grammarLanguage]);

  const getSourceLangName = () => languages.find(l => l.code === sourceLang)?.name || 'Source';
  const getTargetLangName = () => languages.find(l => l.code === targetLang)?.name || 'Target';
  const getGrammarLangName = () => languages.find(l => l.code === grammarLanguage)?.name || 'Language';

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold mb-3" 
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c' }}>
            Translation & Grammar
          </h1>
          <p className="text-lg" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c' }}>
            Multilingual translation with context and grammar insights
          </p>
        </div>

        <div className="rounded-3xl shadow-sm border p-8" 
             style={{ backgroundColor: '#d8d8d8', borderColor: '#c0c0c0' }}>
          
          {/* Mode Selector */}
          <div className="flex gap-2 mb-8 rounded-xl p-1" style={{ backgroundColor: '#c0c0c0' }}>
            <button
              onClick={() => setMode('translate')}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                mode === 'translate' ? 'bg-white shadow-sm' : ''
              }`}
              style={{ 
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: mode === 'translate' ? '#3c3c3c' : '#666',
                backgroundColor: mode === 'translate' ? 'white' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (mode !== 'translate') e.currentTarget.style.backgroundColor = '#b0b0b0';
              }}
              onMouseLeave={(e) => {
                if (mode !== 'translate') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Languages size={18} />
              Translate
            </button>
            <button
              onClick={() => setMode('grammar')}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                mode === 'grammar' ? 'bg-white shadow-sm' : ''
              }`}
              style={{ 
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: mode === 'grammar' ? '#3c3c3c' : '#666',
                backgroundColor: mode === 'grammar' ? 'white' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (mode !== 'grammar') e.currentTarget.style.backgroundColor = '#b0b0b0';
              }}
              onMouseLeave={(e) => {
                if (mode !== 'grammar') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <BookOpen size={18} />
              Grammar Help
            </button>
          </div>

          {/* Language Selection for Translate */}
          {mode === 'translate' && (
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-center gap-4">
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white shadow-sm border"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c', borderColor: '#c0c0c0' }}
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
                
                <button
                  onClick={swapLanguages}
                  className="p-2 rounded-lg transition-all bg-white border"
                  style={{ borderColor: '#c0c0c0' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  title="Swap languages"
                >
                  <ArrowLeftRight size={18} style={{ color: '#3c3c3c' }} />
                </button>
                
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white border"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#666', borderColor: '#c0c0c0' }}
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center justify-center gap-3">
                <div className="flex gap-2 rounded-lg p-1" style={{ backgroundColor: '#c0c0c0' }}>
                  {['formal', 'casual'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
                      style={{ 
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        color: tone === t ? '#3c3c3c' : '#666',
                        backgroundColor: tone === t ? 'white' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (tone !== t) e.currentTarget.style.backgroundColor = '#b0b0b0';
                      }}
                      onMouseLeave={(e) => {
                        if (tone !== t) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Language Selection for Grammar */}
          {mode === 'grammar' && (
            <div className="mb-6 flex justify-center">
              <select
                value={grammarLanguage}
                onChange={(e) => setGrammarLanguage(e.target.value)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white shadow-sm border"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c', borderColor: '#c0c0c0' }}
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name} Grammar</option>
                ))}
              </select>
            </div>
          )}

          {/* Input Area */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <label className="block text-sm font-medium" 
                       style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c' }}>
                  {mode === 'translate' 
                    ? `${getSourceLangName()} Text` 
                    : `Your ${getGrammarLangName()} Grammar Question`}
                </label>
                {mode === 'translate' && availableVoices.length > 0 && (
                  <select
                    value={selectedSourceVoice}
                    onChange={(e) => setSelectedSourceVoice(e.target.value)}
                    className="px-2 py-1 bg-white rounded-md text-xs focus:outline-none focus:ring-1 border"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c', borderColor: '#c0c0c0' }}
                  >
                    {availableVoices
                      .filter(v => v.lang.startsWith(sourceLang))
                      .map(voice => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name.length > 25 ? voice.name.substring(0, 25) + '...' : voice.name}
                        </option>
                      ))}
                  </select>
                )}
              </div>
              {mode === 'translate' && (
                <button
                  onClick={speakInput}
                  disabled={!translateInput.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg transition-all text-sm font-medium border disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c', borderColor: '#c0c0c0' }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#f0f0f0' }}
                  onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'white' }}
                >
                  <Volume2 size={14} />
                  {speaking ? 'Stop' : 'Listen'}
                </button>
              )}
            </div>
            <textarea
              value={mode === 'translate' ? translateInput : grammarInput}
              onChange={(e) => mode === 'translate' ? setTranslateInput(e.target.value) : setGrammarInput(e.target.value)}
              placeholder={mode === 'translate' 
                ? "Enter text to translate..."
                : "e.g., When do I use past tense vs present perfect?"}
              className="w-full h-32 bg-white rounded-xl p-4 border focus:outline-none focus:ring-1 resize-none transition-all"
              style={{ 
                fontFamily: 'system-ui, -apple-system, sans-serif', 
                fontSize: '15px', 
                color: '#3c3c3c',
                borderColor: '#c0c0c0'
              }}
            />
          </div>

          <button
            onClick={processRequest}
            disabled={(mode === 'translate' ? !translateInput.trim() : !grammarInput.trim()) || loading}
            className="w-full py-3.5 rounded-xl font-medium text-base text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#3c3c3c' }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Processing...
              </>
            ) : mode === 'translate' ? (
              <>
                <Languages size={18} />
                Translate & Explain
              </>
            ) : (
              <>
                <BookOpen size={18} />
                Explain Grammar
              </>
            )}
          </button>
        </div>

        {/* Results - Translation */}
        {translateTranslation && mode === 'translate' && (
          <div className="mt-6 rounded-2xl border p-6 animate-slide-up" style={{ backgroundColor: '#f0f0f0', borderColor: '#c0c0c0' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium" 
                     style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c' }}>
                  TRANSLATION
                </div>
                {availableVoices.length > 0 && (
                  <select
                    value={selectedTargetVoice}
                    onChange={(e) => setSelectedTargetVoice(e.target.value)}
                    className="px-2 py-1 bg-white border rounded-md text-xs focus:outline-none focus:ring-1"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c', borderColor: '#c0c0c0' }}
                  >
                    {availableVoices
                      .filter(v => v.lang.startsWith(targetLang))
                      .map(voice => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name.length > 25 ? voice.name.substring(0, 25) + '...' : voice.name}
                        </option>
                      ))}
                  </select>
                )}
              </div>
              <button
                onClick={speakResult}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg transition-all text-sm font-medium border"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c', borderColor: '#c0c0c0' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <Volume2 size={14} />
                {speakingResult ? 'Stop' : 'Listen'}
              </button>
            </div>
            <div className="leading-relaxed bg-white rounded-xl p-4 border font-medium" 
                 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '15px', color: '#3c3c3c', borderColor: '#c0c0c0' }}>
              {translateTranslation}
            </div>
          </div>
        )}

        {/* Results - Analysis */}
        {mode === 'translate' && translateAnalysis && (
          <div className="mt-6 rounded-2xl border p-6 animate-slide-up" style={{ backgroundColor: '#f0f0f0', borderColor: '#c0c0c0' }}>
            <div className="text-sm font-medium mb-4" 
                 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c' }}>
              VARIATIONS & CONTEXT
            </div>
            <div className="leading-relaxed whitespace-pre-wrap bg-white rounded-xl p-4 border" 
                 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '15px', color: '#3c3c3c', borderColor: '#c0c0c0' }}>
              {translateAnalysis}
            </div>
          </div>
        )}
        
        {mode === 'grammar' && grammarAnalysis && (
          <div className="mt-6 rounded-2xl border p-6 animate-slide-up" style={{ backgroundColor: '#f0f0f0', borderColor: '#c0c0c0' }}>
            <div className="text-sm font-medium mb-4" 
                 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c' }}>
              GRAMMAR EXPLANATION
            </div>
            <div className="leading-relaxed whitespace-pre-wrap bg-white rounded-xl p-4 border" 
                 style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '15px', color: '#3c3c3c', borderColor: '#c0c0c0' }}>
              {grammarAnalysis}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium" 
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c' }}>
                HISTORY
              </h2>
              <button
                onClick={() => setHistory([])}
                className="text-xs hover:opacity-70"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c' }}
              >
                Clear all
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadFromHistory(item)}
                  className="w-full rounded-lg p-3 border transition-all text-left"
                  style={{ backgroundColor: '#f0f0f0', borderColor: '#c0c0c0' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                >
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                    <span className="text-xs" 
                          style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#999' }}>
                      {item.timestamp}
                    </span>
                    <div className="flex gap-1">
                      <span className="text-xs px-2 py-0.5 rounded" 
                            style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c', backgroundColor: '#c0c0c0' }}>
                        {item.mode}
                      </span>
                      {item.mode === 'translate' && (
                        <>
                          <span className="text-xs px-2 py-0.5 rounded" 
                                style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c', backgroundColor: '#c0c0c0' }}>
                            {languages.find(l => l.code === item.sourceLang)?.name}→{languages.find(l => l.code === item.targetLang)?.name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded" 
                                style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c', backgroundColor: '#c0c0c0' }}>
                            {item.tone}
                          </span>
                        </>
                      )}
                      {item.mode === 'grammar' && (
                        <span className="text-xs px-2 py-0.5 rounded" 
                              style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c', backgroundColor: '#c0c0c0' }}>
                          {languages.find(l => l.code === item.language)?.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm line-clamp-2" 
                     style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3c3c3c' }}>
                    {item.input}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
