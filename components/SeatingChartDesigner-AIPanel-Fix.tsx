        {/* AI Panel - Fixed positioning within viewport */}
        {showAIPanel && mode === 'edit' && (
          <div className="absolute top-2 left-2 sm:left-auto sm:right-2 z-20 bg-black/95 backdrop-blur rounded-lg p-3
                          w-[calc(100%-1rem)] sm:w-72 md:w-80
                          h-auto max-h-[calc(100vh-120px)] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-3 sticky top-0 bg-black/95 pb-2">
              <h3 className="font-semibold text-sm">AI Assistant</h3>
              <button
                onClick={() => setShowAIPanel(false)}
                className="text-gray-400 hover:text-white text-xl w-6 h-6 flex items-center justify-center rounded hover:bg-white/10"
              >
                ×
              </button>
            </div>
            
            {backgroundImage && (
              <div className="mb-4">
                <div className="relative">
                  <img 
                    src={backgroundImage} 
                    alt="Reference" 
                    className="w-full h-24 sm:h-32 object-contain rounded bg-black/50 border border-white/10" 
                  />
                  <button
                    onClick={clearBackgroundImage}
                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-2">
                  <label className="text-xs text-gray-400 block mb-1">
                    Opacity: {Math.round(imageOpacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={imageOpacity * 100}
                    onChange={(e) => setImageOpacity(parseInt(e.target.value) / 100)}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={analyzeImage}
                disabled={aiProcessing || !backgroundImage}
                className="w-full px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-medium transition-colors"
              >
                {aiProcessing ? '🔄 Analyzing...' : '✨ AI Detect Sections'}
              </button>
              
              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-gray-400 mb-2">Generate from template:</p>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => generateFromTemplate('theater')}
                    disabled={aiProcessing}
                    className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded text-xs transition-colors"
                  >
                    🎭 Theater
                  </button>
                  <button
                    onClick={() => generateFromTemplate('arena')}
                    disabled={aiProcessing}
                    className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded text-xs transition-colors"
                  >
                    🏟️ Arena
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section Settings Panel - Fixed positioning */}
        {mode === 'edit' && state.selectedSection && (
          <div className="absolute bottom-20 left-2 z-20 bg-black/95 backdrop-blur rounded-lg p-3
                          w-56 shadow-xl">
            <h3 className="text-xs font-semibold mb-2">Section Settings</h3>
            
            <div className="mb-3">
              <div className="text-xs text-gray-400 mb-1">Pricing Tier:</div>
              <div className="grid grid-cols-2 gap-1">
                {['vip', 'premium', 'standard', 'economy'].map(tier => (
                  <button
                    key={tier}
                    onClick={() => changePricing(tier as any)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      layout.sections.find(s => s.id === state.selectedSection)?.pricing === tier
                        ? 'bg-purple-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {pricingNames[tier as keyof typeof pricingNames]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Section Color:</div>
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-full h-6 rounded border border-white/20 hover:border-white/40 transition-colors"
                style={{ 
                  backgroundColor: layout.sections.find(s => s.id === state.selectedSection)?.color || '#4a5568' 
                }}
              />
              {showColorPicker && (
                <div className="absolute bottom-full left-0 mb-2 p-2 bg-black/95 rounded-lg border border-white/10">
                  <div className="grid grid-cols-6 gap-1">
                    {colorPalette.slice(0, 24).map(color => (
                      <button
                        key={color}
                        onClick={() => changeColor(color)}
                        className="w-5 h-5 rounded hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
