import React from 'react';

export default function DocChecklist({ checklist = [] }) {
  if (!checklist.length) {
    return <p className="text-sm text-gray-400 italic">No document checklist generated.</p>;
  }

  const mandatory = checklist.filter((d) => d.mandatory);
  const optional = checklist.filter((d) => !d.mandatory);

  return (
    <div className="space-y-1">
      {mandatory.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">Required</p>
          {mandatory.map((item, i) => (
            <DocItem key={`m-${i}`} item={item} />
          ))}
        </>
      )}
      {optional.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">Optional / Supporting</p>
          {optional.map((item, i) => (
            <DocItem key={`o-${i}`} item={item} />
          ))}
        </>
      )}
    </div>
  );
}

function DocItem({ item }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${
      item.likely_have ? 'bg-green-50' : 'bg-amber-50'
    }`}>
      <div className="flex items-center gap-2">
        <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
          item.likely_have ? 'bg-green-200 text-green-700' : 'bg-amber-200 text-amber-700'
        }`}>
          {item.likely_have ? '✓' : '?'}
        </span>
        <span className="text-sm text-gray-700">{item.doc}</span>
      </div>
      <span className={`text-xs font-medium ${
        item.likely_have ? 'text-green-600' : 'text-amber-600'
      }`}>
        {item.likely_have ? 'Likely have' : 'Uncertain'}
      </span>
    </div>
  );
}
