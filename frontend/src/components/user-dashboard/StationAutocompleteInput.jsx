import React, { useState, useMemo, useRef, useEffect } from 'react';
import { INDIAN_STATIONS, searchStaticStations, cleanCode } from '../../data/indianStations';

/**
 * Isolated Station Autocomplete Input
 * Encapsulates search queries, focus states, and dropdown rendering.
 * Prevents full-tree re-renders of the root UserDashboardPage when interacting with inputs.
 */
export function StationAutocompleteInput({
  label,
  value,
  onChange,
  placeholder = 'Search station or code...',
  badgeColor = 'blue', // 'blue' or 'cyan'
  defaultCode = 'NDLS',
}) {
  const [focused, setFocused] = useState(false);
  const blurTimeoutRef = useRef(null);

  // Compute clean station code for the badge
  const displayCode = useMemo(() => {
    const cleaned = cleanCode(value);
    return cleaned || defaultCode;
  }, [value, defaultCode]);

  // Compute search results locally without triggering root parent re-renders
  const searchResults = useMemo(() => {
    const raw = (value || '').trim();
    const clean = cleanCode(raw);
    const query = clean.length > 0 ? clean : raw;

    if (!query) {
      return INDIAN_STATIONS.slice(0, 15);
    }

    const matches = searchStaticStations(query, 15);
    return matches.length > 0 ? matches : INDIAN_STATIONS.slice(0, 10);
  }, [value]);

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setFocused(true);
  };

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setFocused(false);
    }, 200);
  };

  const handleSelectStation = (stn) => {
    onChange(`${stn.name} (${stn.code})`);
    setFocused(false);
  };

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const isBlue = badgeColor === 'blue';
  const badgeClasses = isBlue
    ? 'bg-blue-50 border-blue-200 text-[#0284C7]'
    : 'bg-cyan-50 border-cyan-200 text-[#00A3C4]';
  const countColor = isBlue ? 'text-[#0284C7]' : 'text-[#00A3C4]';
  const tagBg = isBlue
    ? 'bg-blue-50 group-hover:bg-blue-100 border-blue-200 text-[#0284C7]'
    : 'bg-cyan-50 group-hover:bg-cyan-100 border-cyan-200 text-[#00A3C4]';

  return (
    <div className="relative">
      <div className="bg-slate-50/80 hover:bg-slate-50 focus-within:bg-white border border-slate-200 focus-within:border-[#0284C7] rounded-xl px-3.5 py-2.5 transition-all shadow-2xs">
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded border font-mono text-xs font-bold shrink-0 ${badgeClasses}`}>
            {displayCode}
          </span>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              title="Clear station"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {focused && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-64 overflow-y-auto thin-scrollbar p-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-100 text-[10px] font-mono text-slate-400 font-semibold tracking-wider uppercase">
            <span>Indian Railways Directory</span>
            <span className={`${countColor} font-bold`}>{searchResults.length} Stations Found</span>
          </div>

          <div className="py-1">
            {searchResults.length > 0 ? (
              searchResults.map((stn) => (
                <button
                  key={stn.code}
                  type="button"
                  onMouseDown={() => handleSelectStation(stn)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center justify-between gap-2 text-xs transition-colors group cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 group-hover:text-[#0284C7] transition-colors truncate">
                      {stn.name}
                    </div>
                    {stn.city && (
                      <div className="text-[11px] text-slate-400 font-sans truncate">
                        {stn.city}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border transition-colors ${tagBg}`}>
                      {stn.code}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                No matching railway stations found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(StationAutocompleteInput);
