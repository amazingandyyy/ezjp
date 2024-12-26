                {/* Self Introduction */}
                {profile?.self_introduction && (
                  <div className={`mt-6 px-2 py-4 ${
                    theme === 'dark' ? 'bg-gray-800/10' : 'bg-gray-50/50'
                  }`}>
                    <div className="flex gap-3">
                      <div className={`text-5xl font-serif ${theme === 'dark' ? 'text-gray-700' : 'text-gray-300'}`}>"</div>
                      <p className={`text-sm leading-relaxed whitespace-pre-wrap italic tracking-wide ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {profile.self_introduction.toUpperCase()}
                      </p>
                      <div className={`text-5xl font-serif self-end ${theme === 'dark' ? 'text-gray-700' : 'text-gray-300'}`}>"</div>
                    </div>
                  </div>
                )} 